"""Dataclass traduction tâche."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TaskOccurrenceTranslation:
    id: str
    occurrence_id: str
    language: str
    title: str
    description: str
    spoken_text: str
    source_hash: str
