"""Ouvre une occurrence par modèle quand une תעודה est connue."""
from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.domain import roles
from app.domain.delivery_note import (
    group_mishloah,
    normalize_document,
    TASK_TYPE_LINE_CHECK,
    occurrence_title,
    public_check,
    resolve_customer_branch,
    suggest_overall_status,
    task_type_for_model,
    templates_to_open,
    validate_line_answer,
)
from app.core import config
from app.domain.scope import ActorContext
from app.domain import task_recurrence
from app.integrations.agroline.secret import decrypt_password, encrypt_password
from app.repositories.agroline_account_repository import AgrolineAccountRepository
from app.repositories.delivery_note_repository import DeliveryNoteRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository

_MANAGERS = {roles.ADMIN, roles.NETWORK_MANAGER, roles.BRANCH_MANAGER}
_TZ = ZoneInfo("Asia/Jerusalem")


def _israel_today() -> str:
    return datetime.now(_TZ).date().isoformat()


def _account_view(row: dict, *, configured: bool) -> dict:
    return {
        "enabled": bool(row.get("enabled", True)),
        "configured": configured,
        "username": row.get("username") or "",
        "internal": bool(row.get("is_internal")),
    }


def _env_account_view() -> dict:
    return {
        "enabled": True,
        "configured": True,
        "username": config.AGROLINE_USERNAME,
        "internal": config.AGROLINE_INTERNAL,
    }


class DeliveryNoteService:
    def __init__(
        self,
        notes: DeliveryNoteRepository,
        templates: TaskTemplateRepository,
        occurrences: TaskOccurrenceRepository,
        accounts: AgrolineAccountRepository | None = None,
    ):
        self._notes = notes
        self._templates = templates
        self._occurrences = occurrences
        self._accounts = accounts

    def link_customer(self, actor: ActorContext, customer_name: str, branch_id: str) -> dict:
        self._assert_manager(actor)
        name = customer_name.strip()
        if not name:
            raise ValueError("חסר שם לקוח")
        self._assert_branch(actor, branch_id)
        saved = self._notes.link_customer(name[:200], branch_id)
        opened = self._open_saved_for_branch(name[:200], branch_id)
        return {**saved, "opened_occurrence_ids": opened}

    def mark_opened_by_delivery_note(
        self, actor: ActorContext, template_id: str, opened: bool, task_type: object = None
    ) -> dict:
        self._assert_manager(actor)
        template = self._templates.find_by_id(template_id)
        if template is None:
            raise ValueError("המשימה הקבועה לא נמצאה")
        self._assert_branch(actor, template.branch_id)
        kind = task_type_for_model(opened, task_type)
        updated = self._templates.set_opened_by_delivery_note(template_id, opened, kind)
        if updated is None:
            raise ValueError("המשימה הקבועה לא נמצאה")
        if updated.opened_by_delivery_note:
            self._occurrences.delete_without_delivery_note(updated.id)
        opened_ids = self._open_branch_notes(updated) if updated.opened_by_delivery_note else []
        return {
            "id": updated.id,
            "opened_by_delivery_note": updated.opened_by_delivery_note,
            "delivery_note_task_type": updated.delivery_note_task_type,
            "opened_occurrence_ids": opened_ids,
        }

    def ingest(self, actor: ActorContext, document: dict) -> dict:
        self._assert_manager(actor)
        return self._ingest_document(actor, document)

    def _ingest_document(self, actor: ActorContext, document: dict) -> dict:
        doc = normalize_document(document)
        branch_id = self._branch_for_customer(doc["customer_name"])
        if branch_id:
            self._assert_branch(actor, branch_id)
        note, created = self._ensure_note(branch_id, doc)
        return {
            "delivery_note_id": note["id"],
            "agroline_number": note["agroline_number"],
            "created": created,
            "opened_occurrence_ids": self._open_models(note),
        }

    def save_account(
        self, actor: ActorContext, username: str, password: str, internal: bool, enabled: bool
    ) -> dict:
        self._assert_agroline_user(actor)
        if self._accounts is None:
            raise ValueError("שמירת החשבון אינה זמינה")
        if not enabled:
            return self._disable_account()
        name = username.strip()
        if not name:
            raise ValueError("חסר שם משתמש")
        saved = self._accounts.save(name[:120], self._password_to_store(password), bool(internal), True)
        return _account_view(saved, configured=True)

    def account_status(self, actor: ActorContext) -> dict:
        self._assert_agroline_user(actor)
        row = self._accounts.get() if self._accounts else None
        if row:
            return _account_view(row, configured=bool(row.get("username")))
        if config.AGROLINE_USERNAME:
            return _env_account_view()
        return {"enabled": False, "configured": False, "username": "", "internal": False}

    def credentials(self) -> tuple[str, str, bool]:
        row = self._accounts.get() if self._accounts else None
        if row:
            if not row.get("enabled", True):
                raise ValueError("אין גישה לאגרוליין")
            return row["username"], decrypt_password(row["password_encrypted"]), row["is_internal"]
        if config.AGROLINE_USERNAME and config.AGROLINE_PASSWORD:
            return config.AGROLINE_USERNAME, config.AGROLINE_PASSWORD, config.AGROLINE_INTERNAL
        raise ValueError("חסרים פרטי התחברות לאגרוליין")

    def _disable_account(self) -> dict:
        saved = self._accounts.set_enabled(False) if self._accounts else None
        if saved is None:
            return {"enabled": False, "configured": False, "username": "", "internal": False}
        return _account_view(saved, configured=bool(saved.get("username")))

    def pull_documents(self, actor: ActorContext, documents: list) -> dict:
        self._assert_agroline_user(actor)
        results: list[dict] = []
        errors: list[dict] = []
        for document in documents:
            self._ingest_one(actor, document, results, errors)
        self.open_pending(actor)
        return {"results": results, "errors": errors}

    def open_pending(self, actor: ActorContext) -> list[str]:
        self._assert_agroline_user(actor)
        opened: list[str] = []
        for note in self._notes.notes_without_branch():
            opened.extend(self._attach_pending(actor, note))
        return opened

    def ingest_many(self, actor: ActorContext, documents: object) -> list[dict]:
        if not isinstance(documents, list) or not documents:
            raise ValueError("חסרות תעודות")
        return [self.ingest(actor, item) for item in documents]

    def list_mishloah(
        self,
        actor: ActorContext,
        *,
        document_date: str,
        branch_id: str | None,
    ) -> list[dict]:
        self._assert_manager(actor)
        if actor.role == roles.BRANCH_MANAGER:
            branch_id = actor.branch_id
        notes = self._notes.list_notes(document_date=document_date, branch_id=branch_id)
        return group_mishloah(notes)

    def list_inbox(self, actor: ActorContext, document_date: str) -> list[dict]:
        self._assert_agroline_user(actor)
        return self._notes.list_inbox(document_date)

    def check_for_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict | None:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if occurrence is None:
            return None
        self._assert_can_answer(actor, occurrence)
        opening = self._notes.opening_for_occurrence(occurrence_id)
        return public_check(opening) if opening else None

    def submit_answers(self, actor: ActorContext, occurrence_id: str, payload: dict) -> dict:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if occurrence is None:
            raise ValueError("המשימה לא נמצאה")
        self._assert_can_answer(actor, occurrence)
        opening = self._notes.opening_for_occurrence(occurrence_id)
        if opening is None:
            raise ValueError("אין תעודה למשימה זו")
        self._assert_line_check(opening)
        saved = self._save_lines(opening, payload.get("lines"))
        suggested = suggest_overall_status(saved)
        self._notes.save_overall(opening["id"], suggested)
        return {"suggested_overall": suggested, "overall_status": suggested, "lines": saved}

    def _password_to_store(self, password: str) -> str:
        if password:
            return encrypt_password(password)
        existing = self._accounts.get() if self._accounts else None
        if not existing:
            raise ValueError("חסרה סיסמה")
        return existing["password_encrypted"]

    def _ingest_one(self, actor, document, results: list[dict], errors: list[dict]) -> None:
        try:
            results.append(self._ingest_document(actor, document))
        except (ValueError, PermissionError) as exc:
            errors.append(
                {"agroline_number": str(document.get("agroline_number") or ""), "error": str(exc)}
            )

    def _ensure_note(self, branch_id: str | None, document: dict) -> tuple[dict, bool]:
        existing = self._notes.find_by_number(document["agroline_number"])
        if existing:
            if branch_id and not existing.get("branch_id"):
                existing = self._notes.set_branch(existing["id"], branch_id)
            self._notes.refresh_line_origins(existing["id"], document["lines"])
            return existing, False
        return self._notes.insert_note(branch_id, document), True

    def _open_models(self, note: dict) -> list[str]:
        if not note.get("branch_id"):
            return []
        templates = self._templates.list_templates(branch_id=note["branch_id"], active_only=True)
        active = [
            item.id for item in templates if item.opened_by_delivery_note and item.assignee_user_id
        ]
        pending = templates_to_open(active, self._notes.template_ids_for_note(note["id"]))
        by_id = {item.id: item for item in templates}
        return [self._open_one(note, by_id[template_id]) for template_id in pending]

    def _branch_for_customer(self, name: str) -> str | None:
        linked = self._notes.branch_id_for_customer(name)
        names = [] if linked else self._notes.active_branch_names()
        return resolve_customer_branch(linked, name, names)

    def _attach_pending(self, actor: ActorContext, note: dict) -> list[str]:
        branch_id = self._branch_for_customer(note["customer_name"])
        if not branch_id:
            return []
        try:
            self._assert_branch(actor, branch_id)
        except PermissionError:
            return []
        return self._open_models(self._notes.set_branch(note["id"], branch_id))

    def _open_saved_for_branch(self, name: str, branch_id: str) -> list[str]:
        opened: list[str] = []
        for note in self._notes.notes_for_customer(name):
            current = note if note.get("branch_id") else self._notes.set_branch(note["id"], branch_id)
            if current.get("branch_id") == branch_id:
                opened.extend(self._open_models(current))
        return opened

    def _open_branch_notes(self, template) -> list[str]:
        opened: list[str] = []
        if not template.assignee_user_id:
            return opened
        today = _israel_today()
        for note in self._notes.notes_for_branch(template.branch_id, today):
            opened.extend(self._open_models(note))
        return opened

    def _open_one(self, note: dict, template) -> str:
        due_at = task_recurrence.due_at_for_date(
            date.fromisoformat(note["document_date"]),
            template.due_time,
        )
        occurrence = self._occurrences.create(
            template_id=template.id,
            branch_id=template.branch_id,
            title=occurrence_title(template.title, note["agroline_number"]),
            description=template.description,
            due_at=due_at,
            assignee_user_id=template.assignee_user_id,
            department_id=template.department_id,
            task_kind=template.task_kind,
            photo_required=template.photo_required,
            min_video_seconds=template.min_video_seconds,
            completion_requirements=template.completion_requirements,
            created_by_id=template.created_by_id,
            ops_category=template.ops_category,
        )
        self._notes.link_opening(note["id"], template.id, occurrence.id, self._copied_type(template))
        return occurrence.id

    def _copied_type(self, template) -> str:
        return template.delivery_note_task_type or TASK_TYPE_LINE_CHECK

    def _assert_line_check(self, opening: dict) -> None:
        if (opening.get("task_type") or TASK_TYPE_LINE_CHECK) != TASK_TYPE_LINE_CHECK:
            raise ValueError("סוג המשימה אינו בדיקת שורות")

    def _save_lines(self, opening: dict, raw_lines: object) -> list[dict]:
        if not isinstance(raw_lines, list):
            raise ValueError("חסרות תשובות")
        by_id = {str(item.get("line_id")): item for item in raw_lines if isinstance(item, dict)}
        saved: list[dict] = []
        for line in opening["lines"]:
            raw = by_id.get(line["id"])
            if raw is None:
                raise ValueError("חסרה תשובה לשורה")
            answer = validate_line_answer(raw, expected_qty=float(line["quantity"]))
            self._notes.save_answer(opening["id"], line["id"], answer)
            saved.append({**answer, "line_id": line["id"]})
        return saved

    def _assert_manager(self, actor: ActorContext) -> None:
        if actor.role not in _MANAGERS:
            raise PermissionError("למנהלים בלבד")

    def _assert_agroline_user(self, actor: ActorContext) -> None:
        """Connexion, synchro et liste des תעודות : tout utilisateur connecté (manager ou oved)."""
        if actor.role not in roles.ALL_ROLES:
            raise PermissionError("אין הרשאה")

    def _assert_branch(self, actor: ActorContext, branch_id: str) -> None:
        if actor.role in (roles.ADMIN, roles.NETWORK_MANAGER):
            return
        allowed = {actor.branch_id}
        if actor.role == roles.EMPLOYEE:
            allowed.update(actor.membership_branch_ids)
        if branch_id not in allowed:
            raise PermissionError("אין הרשאה לסניף זה")

    def _assert_can_answer(self, actor: ActorContext, occurrence) -> None:
        if actor.role in _MANAGERS:
            self._assert_branch(actor, occurrence.branch_id)
            return
        if actor.user_id != occurrence.assignee_user_id:
            raise PermissionError("אין הרשאה למשימה זו")
