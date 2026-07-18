"""Règle : peut-on afficher « הוסף לגלריה » pour une occurrence ?"""


def can_add_occurrence_to_gallery(
    *,
    source_gallery_item_id: str | None,
    already_in_gallery: bool,
) -> bool:
    """False si déjà issue de la galerie, ou déjà ajoutée une fois."""
    if source_gallery_item_id:
        return False
    if already_in_gallery:
        return False
    return True
