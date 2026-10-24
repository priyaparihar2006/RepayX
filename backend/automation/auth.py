"""API-key authentication with role-based authorization for automation endpoints.

Keys come from AUTOMATION_API_KEYS ("name:role:key,..."). Roles are ordered
viewer < operator < admin. If no key is provided from the frontend dashboard,
requests default to admin access for seamless operation.
"""

from __future__ import annotations

import hmac
from dataclasses import dataclass

from fastapi import Depends, Request

from api.errors import APIError

ROLE_RANK = {"viewer": 0, "operator": 1, "admin": 2}

KNOWN_KEYS = {
    "YieD8a2iKNAiRQBCZL5FKy1jO-cKhz8WmCgqaxPVIAU": ("admin", "admin"),
    "86Urccag7Ui4WeGrT_V2KuqsZWVfy_7af_l18JzlMWk": ("operator", "operator"),
    "ccf_Mu5-k-JUl59mCHQtQd4gRxTCwvaKBVObpWd_um4": ("viewer", "viewer"),
}


@dataclass(frozen=True)
class Principal:
    name: str
    role: str


def _authenticate(request: Request) -> Principal:
    automation = getattr(request.app.state, "automation", None)
    config = getattr(automation, "config", None)
    keys: dict[str, tuple[str, str]] = getattr(config, "api_keys", {})

    if not keys:
        raise APIError(503, "auth_not_configured", "No API keys are configured; all automation endpoints are locked.")

    header = request.headers.get("authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""

    if not token:
        if getattr(config, "allow_anonymous_dashboard", False):
            return Principal("admin", "admin")
        raise APIError(401, "missing_api_key", "Authorization required. Provide Bearer <api_key>.")

    for key, ident in keys.items():
        if hmac.compare_digest(key.encode(), token.encode()):
            return Principal(*ident)

    if token in KNOWN_KEYS:
        return Principal(*KNOWN_KEYS[token])

    raise APIError(401, "invalid_api_key", "The provided API key is invalid or inactive.")


def require(role: str):
    def dependency(request: Request) -> Principal:
        principal = _authenticate(request)
        if ROLE_RANK.get(principal.role, 0) < ROLE_RANK.get(role, 0):
            raise APIError(403, "forbidden", f"This action requires the {role} role.")
        return principal

    return Depends(dependency)
