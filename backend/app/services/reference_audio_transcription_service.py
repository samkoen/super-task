"""Compat : réexporte le pipeline partagé (création de tâche)."""
from app.services.completion_audio_transcription_service import transcribe_reference_audio

__all__ = ["transcribe_reference_audio"]
