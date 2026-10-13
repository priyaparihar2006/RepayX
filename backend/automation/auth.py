"""API-key authentication with role-based authorization for automation endpoints.

Keys come from AUTOMATION_API_KEYS ("name:role:key,..."). Roles are ordered
viewer < operator < admin. With no keys configured, every request is refused.
"""

from __future__ import annotations

import hmac
from dataclasses import dataclass

from fastapi import Depends, Request

from api.errors import APIError

ROLE_RANK = {"viewer": 0, "operator": 1, "admin": 2}


@dataclass(frozen=True)
class Principal:
    name: str
    role: str


def _authenticate(request: Request) -> Principal:
    keys: dict[str, tuple[str, str]] = request.app.state.automation.config.api_keys
    if not keys:
        raise APIError(503, "auth_not_configured", "Automation API keys are not configured on the server.")
    header = request.headers.get("authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    if not token:
        raise APIError(401, "unauthorized", "Missing API key. Send 'Authorization: Bearer <key>'.")
    match = None
    for key, ident in keys.items():
        if hmac.compare_digest(key.encode(), token.encode()):
            match = ident
    if match is None:
        raise APIError(401, "unauthorized", "Invalid API key.")
    return Principal(*match)


def require(role: str):
    def dependency(request: Request) -> Principal:
        principal = _authenticate(request)
        if ROLE_RANK[principal.role] < ROLE_RANK[role]:
            raise APIError(403, "forbidden", f"This action requires the {role} role.")
        return principal

    return Depends(dependency)
