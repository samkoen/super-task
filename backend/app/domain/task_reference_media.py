from dataclasses import replace

from app.models.task_occurrence import TaskOccurrence
from app.models.task_template import TaskTemplate


def merge_occurrence_reference_media(
    occurrence: TaskOccurrence,
    template: TaskTemplate | None,
) -> TaskOccurrence:
    """Complète l'occurrence avec le média de référence du template si absent."""
    if not template:
        return occurrence
    return replace(
        occurrence,
        reference_photo_url=occurrence.reference_photo_url or template.reference_photo_url,
        reference_video_url=occurrence.reference_video_url or template.reference_video_url,
        reference_audio_url=occurrence.reference_audio_url or template.reference_audio_url,
    )
