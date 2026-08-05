"""Règles pures — הגנת ספק וכרטיס מוצר ארצי (SPEC חלק ה')."""

from app.domain import roles


SUPPLIER_ROLE = "supplier"


def can_edit_product_catalog(*, actor_role: str) -> bool:
    """Seuls fournisseur / admin réseau peuvent modifier la fiche produit nationale."""
    return actor_role in {SUPPLIER_ROLE, roles.ADMIN}


def can_edit_supplier_assignment(*, actor_role: str) -> bool:
    """Le manager magasin ne peut pas changer le rattachement fournisseur."""
    return actor_role in {SUPPLIER_ROLE, roles.ADMIN, roles.NETWORK_MANAGER}


def assert_can_edit_product_catalog(actor_role: str) -> None:
    if not can_edit_product_catalog(actor_role=actor_role):
        raise PermissionError("רק הספק המורשה רשאי לעדכן את כרטיס המוצר")


def short_expiry_task_title(*, product_name: str, expired: bool) -> str:
    if expired:
        return f"פינוי מוצר שפג תוקפו — {product_name}"
    return f'הדפסת מדבקת הנחה "תוקף קצר" — {product_name}'


def is_analytic_order_eligible_for_subsidy(*, was_system_forecast: bool, over_ordered: bool) -> bool:
    """סבסוד תוקף קצר seulement si commande analytique (pas sur-commande)."""
    return was_system_forecast and not over_ordered
