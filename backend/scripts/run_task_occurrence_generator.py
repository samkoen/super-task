"""Génère les occurrences récurrentes et marque les retards."""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import SessionLocal
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.services.task_scheduler_service import TaskSchedulerService


def main() -> None:
    db = SessionLocal()
    try:
        scheduler = TaskSchedulerService(TaskTemplateRepository(db), TaskOccurrenceRepository(db))
        result = scheduler.run_for_date()
        db.commit()
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
