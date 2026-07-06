"""Application roles for Super."""

ADMIN = "admin"
NETWORK_MANAGER = "network_manager"
BRANCH_MANAGER = "branch_manager"
EMPLOYEE = "employee"

ALL_ROLES = frozenset({ADMIN, NETWORK_MANAGER, BRANCH_MANAGER, EMPLOYEE})
ADMIN_CREATABLE_ROLES = frozenset({NETWORK_MANAGER, BRANCH_MANAGER})
INVITEABLE_ROLES = frozenset({NETWORK_MANAGER, BRANCH_MANAGER, EMPLOYEE})
PUBLIC_REGISTER_ROLES = frozenset({EMPLOYEE})

ROLE_LABELS_HE: dict[str, str] = {
    ADMIN: "מנהל מערכת",
    NETWORK_MANAGER: "מנהל רשת",
    BRANCH_MANAGER: "מנהל סניף",
    EMPLOYEE: "עובד",
}


def is_valid_role(role: str) -> bool:
    return role in ALL_ROLES


def assert_admin_creatable(role: str) -> None:
    if role not in ADMIN_CREATABLE_ROLES:
        raise ValueError("תפקיד לא מורשה ליצירה על ידי מנהל")


INVITE_PERMISSIONS: dict[str, frozenset[str]] = {
    ADMIN: INVITEABLE_ROLES,
    NETWORK_MANAGER: frozenset({BRANCH_MANAGER, EMPLOYEE}),
    BRANCH_MANAGER: frozenset({EMPLOYEE}),
}


def assert_can_invite(inviter_role: str, target_role: str) -> None:
    allowed = INVITE_PERMISSIONS.get(inviter_role, frozenset())
    if target_role not in allowed:
        raise ValueError("אין הרשאה להזמין משתמש בתפקיד זה")
