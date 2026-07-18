from app.domain.gallery_add_eligibility import can_add_occurrence_to_gallery


def test_can_add_when_not_from_gallery_and_not_already_added():
    assert (
        can_add_occurrence_to_gallery(
            source_gallery_item_id=None, already_in_gallery=False
        )
        is True
    )


def test_cannot_add_when_from_gallery():
    assert (
        can_add_occurrence_to_gallery(
            source_gallery_item_id="g1", already_in_gallery=False
        )
        is False
    )


def test_cannot_add_when_already_in_gallery():
    assert (
        can_add_occurrence_to_gallery(
            source_gallery_item_id=None, already_in_gallery=True
        )
        is False
    )
