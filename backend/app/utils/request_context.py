from contextvars import ContextVar
from typing import Optional

_request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
_session_jti_ctx: ContextVar[Optional[str]] = ContextVar("session_jti", default=None)


def set_request_id(value: Optional[str]):
    return _request_id_ctx.set(value)


def get_request_id() -> Optional[str]:
    return _request_id_ctx.get()


def reset_request_id(token) -> None:
    _request_id_ctx.reset(token)


def set_session_jti(value: Optional[str]):
    return _session_jti_ctx.set(value)


def get_session_jti() -> Optional[str]:
    return _session_jti_ctx.get()


def reset_session_jti(token) -> None:
    _session_jti_ctx.reset(token)
