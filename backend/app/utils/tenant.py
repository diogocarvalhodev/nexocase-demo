from contextvars import ContextVar

_CURRENT_TENANT_ID: ContextVar[int | None] = ContextVar("current_tenant_id", default=None)


def set_current_tenant_id(value: int | None):
    return _CURRENT_TENANT_ID.set(value)


def get_current_tenant_id() -> int | None:
    return _CURRENT_TENANT_ID.get()


def reset_current_tenant_id(token):
    _CURRENT_TENANT_ID.reset(token)


def get_current_tenant_id_or_default() -> int:
    tenant_id = get_current_tenant_id()
    return int(tenant_id) if tenant_id else 1
