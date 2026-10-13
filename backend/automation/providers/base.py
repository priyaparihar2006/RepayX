"""Provider adapter contract.

An adapter turns one OutboundMessage into one provider API call and reports what
the provider said. 'accepted' means the provider took the message, NOT that it was
delivered; delivery/read/failure arrive later through webhooks.
"""

from __future__ import annotations

import json
import socket
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class OutboundMessage:
    channel: str
    recipient: str
    text: str
    idempotency_key: str
    subject: str | None = None
    html: str | None = None
    language: str = "en"
    # Ordered values for providers that require pre-approved templates (WhatsApp, Indian DLT SMS).
    template_params: dict[str, str] = field(default_factory=dict)
    is_reply: bool = False  # inside a customer-initiated session (e.g. WhatsApp 24h window)


@dataclass
class SendResult:
    accepted: bool
    provider_message_id: str | None = None
    transient: bool = False
    error_code: str | None = None
    error_message: str | None = None
    # The provider says this recipient must not be messaged again (e.g. SMS STOP, hard bounce).
    suppress_recipient: bool = False
    raw: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def ok(cls, provider_message_id: str, **raw: Any) -> "SendResult":
        return cls(accepted=True, provider_message_id=provider_message_id, raw=raw)

    @classmethod
    def fail(cls, code: str, message: str, transient: bool, suppress: bool = False) -> "SendResult":
        return cls(accepted=False, transient=transient, error_code=code, error_message=message[:500],
                   suppress_recipient=suppress)


class Provider(ABC):
    name: str = "base"
    channel: str = ""
    sandbox: bool = False

    @abstractmethod
    def configuration_problem(self) -> str | None:
        """None if ready to send, otherwise a reason (never containing secret values)."""

    @abstractmethod
    def send(self, message: OutboundMessage) -> SendResult: ...


class UnconfiguredProvider(Provider):
    def __init__(self, channel: str, reason: str):
        self.channel = channel
        self.name = "none"
        self._reason = reason

    def configuration_problem(self) -> str | None:
        return self._reason

    def send(self, message: OutboundMessage) -> SendResult:
        return SendResult.fail("provider_not_configured", self._reason, transient=False)


class RateLimiter:
    """Simple per-provider token bucket shared by the threads of one worker process."""

    def __init__(self, per_second: float):
        self.interval = 1.0 / per_second if per_second > 0 else 0.0
        self._lock = threading.Lock()
        self._next = 0.0

    def wait(self) -> None:
        if not self.interval:
            return
        with self._lock:
            now = time.monotonic()
            delay = self._next - now
            self._next = max(now, self._next) + self.interval
        if delay > 0:
            time.sleep(delay)


TRANSIENT_HTTP = {408, 425, 429, 500, 502, 503, 504}


@dataclass
class HttpResponse:
    status: int
    body: str

    def json(self) -> Any:
        try:
            return json.loads(self.body) if self.body else {}
        except ValueError:
            return {}


class TransportError(Exception):
    """The HTTP exchange failed. ambiguous=True means the request may have reached the
    provider (timeout / connection dropped mid-response), so resending risks a duplicate."""

    def __init__(self, reason: str, ambiguous: bool):
        super().__init__(reason)
        self.reason = reason
        self.ambiguous = ambiguous


def transport_failure(exc: TransportError) -> SendResult:
    if exc.ambiguous:
        return SendResult(accepted=False, transient=False, error_code="ambiguous_timeout",
                          error_message=f"No response from provider ({exc.reason}); it may have been sent.",
                          raw={"ambiguous": True})
    return SendResult.fail("network_error", f"Could not reach provider ({exc.reason}).", transient=True)


def http_request(method: str, url: str, headers: dict[str, str], data: bytes | None, timeout: float) -> HttpResponse:
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=timeout) as resp:  # noqa: S310 - provider URLs are fixed https endpoints
            return HttpResponse(resp.status, resp.read().decode("utf-8", errors="replace"))
    except HTTPError as exc:
        try:
            body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return HttpResponse(exc.code, body)
    except (TimeoutError, socket.timeout) as exc:
        raise TransportError("timeout", ambiguous=True) from exc
    except URLError as exc:
        # Raised before any response: DNS failure, refused connection, TLS failure, or a
        # connect timeout. Only a read timeout (wrapped as socket.timeout) is ambiguous.
        ambiguous = isinstance(exc.reason, (TimeoutError, socket.timeout)) and "timed out" in str(exc.reason)             and "connect" not in str(exc.reason).lower()
        raise TransportError(type(exc.reason).__name__, ambiguous=ambiguous) from exc
    except (ConnectionResetError, ConnectionAbortedError) as exc:
        raise TransportError(type(exc).__name__, ambiguous=True) from exc
    except OSError as exc:
        raise TransportError(type(exc).__name__, ambiguous=False) from exc
