"""Persistance des תעודות משלוח et de leurs réponses."""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp


class DeliveryNoteRepository:
    def __init__(self, db: Session):
        self._db = db

    def branch_id_for_customer(self, name: str) -> str | None:
        row = self._db.scalar(
            select(orm.AgrolineBranchLink).where(orm.AgrolineBranchLink.customer_name == name)
        )
        return str(row.branch_id) if row else None

    def active_branch_names(self) -> list[tuple[str, str]]:
        rows = self._db.scalars(select(orm.Branch).where(orm.Branch.is_active.is_(True))).all()
        return [(str(row.id), row.name) for row in rows]

    def notes_without_branch(self) -> list[dict]:
        rows = self._db.scalars(
            select(orm.DeliveryNote).where(orm.DeliveryNote.branch_id.is_(None))
        ).all()
        return [item for row in rows if (item := _note_dict(row))]

    def link_customer(self, name: str, branch_id: str) -> dict:
        row = self._db.scalar(
            select(orm.AgrolineBranchLink).where(orm.AgrolineBranchLink.customer_name == name)
        )
        if row is None:
            row = orm.AgrolineBranchLink(
                id=uuid.uuid4(),
                customer_name=name,
                branch_id=mp.parse_uuid(branch_id),
            )
            self._db.add(row)
        else:
            row.branch_id = mp.parse_uuid(branch_id)
        self._db.flush()
        return {"customer_name": row.customer_name, "branch_id": str(row.branch_id)}

    def notes_for_customer(self, name: str) -> list[dict]:
        rows = self._db.scalars(
            select(orm.DeliveryNote).where(orm.DeliveryNote.customer_name == name)
        ).all()
        return [item for row in rows if (item := _note_dict(row))]

    def notes_for_branch(self, branch_id: str, document_date: str | None = None) -> list[dict]:
        return self.list_notes(document_date=document_date, branch_id=branch_id)

    def set_branch(self, note_id: str, branch_id: str) -> dict:
        row = self._db.get(orm.DeliveryNote, mp.parse_uuid(note_id))
        if row is None:
            raise ValueError("התעודה לא נמצאה")
        row.branch_id = mp.parse_uuid(branch_id)
        self._db.flush()
        stored = _note_dict(row)
        assert stored is not None
        return stored

    def find_by_number(self, number: str) -> dict | None:
        row = self._db.scalar(
            select(orm.DeliveryNote).where(orm.DeliveryNote.agroline_number == number)
        )
        return _note_dict(row) if row else None

    def insert_note(self, branch_id: str | None, document: dict) -> dict:
        note = orm.DeliveryNote(
            id=uuid.uuid4(),
            agroline_number=document["agroline_number"],
            branch_id=mp.parse_uuid(branch_id) if branch_id else None,
            customer_name=document["customer_name"],
            document_date=date.fromisoformat(document["document_date"]),
            kind=document["kind"],
            pdf_url=document["pdf_url"],
        )
        self._db.add(note)
        self._db.flush()
        self._insert_lines(note.id, document["lines"])
        stored = _note_dict(note)
        assert stored is not None
        return stored

    def template_ids_for_note(self, note_id: str) -> set[str]:
        rows = self._db.scalars(
            select(orm.DeliveryNoteOpening).where(
                orm.DeliveryNoteOpening.delivery_note_id == mp.parse_uuid(note_id)
            )
        ).all()
        return {str(row.template_id) for row in rows}

    def link_opening(self, note_id: str, template_id: str, occurrence_id: str, task_type: str) -> str:
        row = orm.DeliveryNoteOpening(
            id=uuid.uuid4(),
            delivery_note_id=mp.parse_uuid(note_id),
            template_id=mp.parse_uuid(template_id),
            occurrence_id=mp.parse_uuid(occurrence_id),
            task_type=task_type,
        )
        self._db.add(row)
        self._db.flush()
        return str(row.id)

    def opening_for_occurrence(self, occurrence_id: str) -> dict | None:
        opening = self._opening_row(occurrence_id)
        if opening is None:
            return None
        note = self._db.get(orm.DeliveryNote, opening.delivery_note_id)
        if note is None:
            return None
        return _opening_dict(opening, note, self._lines_with_answers(note.id, opening.id))

    def openings_by_occurrence_ids(self, occurrence_ids: list[str]) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for occurrence_id in occurrence_ids:
            opening = self.opening_for_occurrence(occurrence_id)
            if opening:
                out[occurrence_id] = opening
        return out

    def save_answer(self, opening_id: str, line_id: str, answer: dict) -> None:
        row = self._answer_row(opening_id, line_id)
        if row is None:
            row = orm.DeliveryLineAnswer(
                id=uuid.uuid4(),
                opening_id=mp.parse_uuid(opening_id),
                line_id=mp.parse_uuid(line_id),
                arrival=answer["arrival"],
            )
            self._db.add(row)
        _copy_answer(row, answer)
        self._db.flush()

    def save_overall(self, opening_id: str, status: str) -> None:
        row = self._db.get(orm.DeliveryNoteOpening, mp.parse_uuid(opening_id))
        if row is None:
            return
        row.overall_status = status
        self._db.flush()

    def list_notes(self, *, document_date: str | None, branch_id: str | None) -> list[dict]:
        query = select(orm.DeliveryNote).order_by(orm.DeliveryNote.agroline_number)
        if document_date:
            query = query.where(orm.DeliveryNote.document_date == date.fromisoformat(document_date))
        if branch_id:
            query = query.where(orm.DeliveryNote.branch_id == mp.parse_uuid(branch_id))
        rows = self._db.scalars(query).all()
        return [item for row in rows if (item := _note_dict(row))]

    def list_inbox(self, document_date: str) -> list[dict]:
        return [self._with_lines(note) for note in self.list_notes(document_date=document_date, branch_id=None)]

    def _insert_lines(self, note_id: uuid.UUID, lines: list[dict]) -> None:
        for line in lines:
            self._db.add(
                orm.DeliveryNoteLine(
                    id=uuid.uuid4(),
                    delivery_note_id=note_id,
                    position=line["position"],
                    product_name=line["product_name"],
                    quantity=line["quantity"],
                    unit=line["unit"],
                    origin_name=line.get("origin_name"),
                    weight=line.get("weight"),
                    price=line.get("price"),
                    image_url=line.get("image_url"),
                )
            )
        self._db.flush()

    def refresh_line_origins(self, note_id: str, lines: list[dict]) -> None:
        rows = self._db.scalars(
            select(orm.DeliveryNoteLine)
            .where(orm.DeliveryNoteLine.delivery_note_id == mp.parse_uuid(note_id))
            .order_by(orm.DeliveryNoteLine.position)
        ).all()
        incoming = {line["position"]: line for line in lines}
        for row in rows:
            fresh = incoming.get(row.position)
            if fresh:
                _copy_line_facts(row, fresh)
        self._db.flush()

    def _with_lines(self, note: dict) -> dict:
        lines = self._db.scalars(
            select(orm.DeliveryNoteLine)
            .where(orm.DeliveryNoteLine.delivery_note_id == mp.parse_uuid(note["id"]))
            .order_by(orm.DeliveryNoteLine.position)
        ).all()
        return {**note, "lines": [_line_dict(line, None) for line in lines]}

    def _opening_row(self, occurrence_id: str) -> orm.DeliveryNoteOpening | None:
        try:
            occurrence = mp.parse_uuid(occurrence_id)
        except ValueError:
            return None
        return self._db.scalar(
            select(orm.DeliveryNoteOpening).where(orm.DeliveryNoteOpening.occurrence_id == occurrence)
        )

    def _lines_with_answers(self, note_id: uuid.UUID, opening_id: uuid.UUID) -> list[dict]:
        lines = self._db.scalars(
            select(orm.DeliveryNoteLine)
            .where(orm.DeliveryNoteLine.delivery_note_id == note_id)
            .order_by(orm.DeliveryNoteLine.position)
        ).all()
        answers = {
            row.line_id: row
            for row in self._db.scalars(
                select(orm.DeliveryLineAnswer).where(orm.DeliveryLineAnswer.opening_id == opening_id)
            ).all()
        }
        return [_line_dict(line, answers.get(line.id)) for line in lines]

    def _answer_row(self, opening_id: str, line_id: str) -> orm.DeliveryLineAnswer | None:
        return self._db.scalar(
            select(orm.DeliveryLineAnswer).where(
                orm.DeliveryLineAnswer.opening_id == mp.parse_uuid(opening_id),
                orm.DeliveryLineAnswer.line_id == mp.parse_uuid(line_id),
            )
        )


def _note_dict(row: orm.DeliveryNote | None) -> dict | None:
    if row is None:
        return None
    return {
        "id": str(row.id),
        "agroline_number": row.agroline_number,
        "branch_id": str(row.branch_id) if row.branch_id else None,
        "customer_name": row.customer_name,
        "document_date": row.document_date.isoformat(),
        "kind": row.kind,
        "pdf_url": row.pdf_url,
    }


def _opening_dict(opening: orm.DeliveryNoteOpening, note: orm.DeliveryNote, lines: list[dict]) -> dict:
    header = _note_dict(note) or {}
    header.update(
        {
            "id": str(opening.id),
            "delivery_note_id": str(note.id),
            "template_id": str(opening.template_id),
            "occurrence_id": str(opening.occurrence_id),
            "overall_status": opening.overall_status,
            "task_type": opening.task_type,
            "lines": lines,
        }
    )
    return header


def _copy_line_facts(row: orm.DeliveryNoteLine, fresh: dict) -> None:
    row.origin_name = fresh.get("origin_name")
    row.weight = fresh.get("weight")
    row.price = fresh.get("price")
    row.image_url = fresh.get("image_url")


def _line_dict(line: orm.DeliveryNoteLine, answer: orm.DeliveryLineAnswer | None) -> dict:
    return {
        "id": str(line.id),
        "position": line.position,
        "product_name": line.product_name,
        "quantity": float(line.quantity),
        "unit": line.unit,
        "origin_name": line.origin_name,
        "weight": line.weight,
        "price": line.price,
        "image_url": line.image_url,
        "answer": _answer_dict(answer) if answer else None,
    }


def _answer_dict(row: orm.DeliveryLineAnswer) -> dict:
    return {
        "arrival": row.arrival,
        "received_qty": row.received_qty,
        "condition": row.condition,
        "rejected_qty": row.rejected_qty,
        "note": row.note,
        "photo_url": row.photo_url,
    }


def _copy_answer(row: orm.DeliveryLineAnswer, answer: dict) -> None:
    row.arrival = answer["arrival"]
    row.received_qty = answer["received_qty"]
    row.condition = answer["condition"]
    row.rejected_qty = answer["rejected_qty"]
    row.note = answer["note"]
    row.photo_url = answer["photo_url"]
