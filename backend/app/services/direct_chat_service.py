"""Chat hors tâche : boîte partagée snif / רשת."""
from __future__ import annotations

from datetime import datetime, timezone

from app.domain import roles
from app.domain.break_notify import break_alert_payload
from app.domain.chat_page import clamp_chat_page_size
from app.domain.direct_chat import (
    SCOPE_BRANCH,
    SCOPE_NETWORK,
    can_access_conversation,
    clip_body,
    counterpart_roles_for_scope,
    downward_scope,
    message_preview,
    notify_recipient_ids,
    sort_downward_peers,
    upward_scope,
)
from app.domain.scope import ActorContext
from app.domain.task_chat import has_message_content
from app.models.direct_conversation import DirectConversation
from app.models.user import User
from app.realtime.task_events import notify_direct_message
from app.repositories.direct_chat_repository import (
    DirectConversationReadRepository,
    DirectConversationRepository,
    DirectMessageRepository,
)
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_repository import UserRepository
from app.services.notification_service import NotificationService


class DirectChatService:
    def __init__(
        self,
        conv_repo: DirectConversationRepository,
        message_repo: DirectMessageRepository,
        read_repo: DirectConversationReadRepository,
        user_repo: UserRepository,
        notification_service: NotificationService | None = None,
        network_repo: NetworkRepository | None = None,
    ):
        self._convs = conv_repo
        self._messages = message_repo
        self._reads = read_repo
        self._users = user_repo
        self._notifications = notification_service
        self._networks = network_repo

    def inbox(self, actor: ActorContext) -> dict:
        if actor.role == roles.EMPLOYEE:
            return self._employee_inbox(actor)
        down = downward_scope(actor)
        items = []
        if down:
            convs = {c.counterpart_user_id: c for c in self._convs.list_for_scope(*down)}
            for peer in self._peers(*down):
                items.append(self._card(actor, peer, convs.get(peer.id), kind="down", scope=down[0]))
        up = self._up_card(actor)
        unread = sum(int(i.get("unread_count") or 0) for i in items)
        if up:
            unread += int(up.get("unread_count") or 0)
        return {"items": items, "up": up, "unread_count": unread, "managers": []}

    def open_mine(self, actor: ActorContext, *, preferred_scope: str | None = None) -> dict:
        if preferred_scope and preferred_scope not in {SCOPE_BRANCH, SCOPE_NETWORK}:
            raise ValueError("היקף שיחה לא תקין")
        if actor.role == roles.EMPLOYEE:
            return self._open_employee_mine(actor, preferred_scope)
        return self._open_upward(actor)

    def open_with(self, actor: ActorContext, counterpart_user_id: str) -> dict:
        scope = downward_scope(actor)
        if not scope:
            raise PermissionError("אין הרשאה לפתוח שיחה")
        peer = self._require_peer(*scope, counterpart_user_id)
        conv = self._convs.get_or_create(*scope, peer.id)
        return self._open(actor, conv)

    def list_messages(
        self,
        actor: ActorContext,
        conversation_id: str,
        *,
        limit: int | None = None,
        before: str | None = None,
    ) -> dict:
        conv = self._require_conv(actor, conversation_id)
        self._reads.mark_read(conv.id, actor.user_id)
        items, has_more = self._messages.list_page(
            conv.id, limit=clamp_chat_page_size(limit), before_id=before
        )
        return {"messages": [self._message_api(m) for m in items], "has_more": has_more}

    def post_message(
        self,
        actor: ActorContext,
        conversation_id: str,
        *,
        body: str | None = None,
        photo_url: str | None = None,
        video_url: str | None = None,
        audio_url: str | None = None,
    ) -> dict:
        conv = self._require_conv(actor, conversation_id)
        message = self._write_message(actor, conv, body, photo_url, video_url, audio_url)
        result = {"message": self._message_api(message), "conversation": conv.to_dict()}
        result.update(self._recipient_break_fields(actor, conv.counterpart_user_id))
        return result

    def broadcast(
        self,
        actor: ActorContext,
        *,
        body: str | None = None,
        photo_url: str | None = None,
        video_url: str | None = None,
        audio_url: str | None = None,
    ) -> dict:
        scope = downward_scope(actor)
        if not scope:
            raise PermissionError("אין הרשאה לשליחה לכולם")
        posted = 0
        for peer in self._peers(*scope):
            conv = self._convs.get_or_create(*scope, peer.id)
            self._write_message(actor, conv, body, photo_url, video_url, audio_url)
            posted += 1
        return {"ok": True, "count": posted}

    def _write_message(self, actor, conv, body, photo_url, video_url, audio_url):
        text = clip_body(body)
        if not has_message_content(text, photo_url, video_url, audio_url):
            raise ValueError("נדרש טקסט או מדיה להודעה")
        message = self._messages.create(
            conv.id, actor.user_id, body=text, photo_url=photo_url, video_url=video_url, audio_url=audio_url
        )
        preview = message_preview(text, photo_url, video_url, audio_url)
        at = datetime.now(timezone.utc)
        self._convs.touch_last(conv.id, preview=preview, sender_user_id=actor.user_id, at=at)
        self._reads.mark_read(conv.id, actor.user_id)
        self._emit(actor, conv, preview)
        return message

    def _emit(self, actor: ActorContext, conv: DirectConversation, preview: str) -> None:
        managers = [u.id for u in self._managers(conv.scope, conv.scope_id)]
        recipients = notify_recipient_ids(
            sender_id=actor.user_id,
            counterpart_user_id=conv.counterpart_user_id,
            manager_ids=managers,
        )
        notify_direct_message(conversation_id=conv.id, recipient_ids=recipients)
        if not self._notifications or not recipients:
            return
        branch_id = conv.scope_id if conv.scope == SCOPE_BRANCH else None
        extra = self._notifications.publish_direct_chat(
            recipient_ids=recipients, branch_id=branch_id, preview=preview
        )
        self._pending = [*getattr(self, "_pending", []), *extra]

    def take_pending_notifications(self) -> list[tuple]:
        pending = getattr(self, "_pending", [])
        self._pending = []
        return pending

    def _open(self, actor: ActorContext, conv: DirectConversation) -> dict:
        self._reads.mark_read(conv.id, actor.user_id)
        peer = self._users.find_by_id(conv.counterpart_user_id)
        items, has_more = self._messages.list_page(
            conv.id, limit=clamp_chat_page_size(None), before_id=None
        )
        return {
            "conversation": conv.to_dict(),
            "messages": [self._message_api(m) for m in items],
            "has_more": has_more,
            "peer": self._peer_api(peer) if peer else None,
        }

    def _require_conv(self, actor: ActorContext, conversation_id: str) -> DirectConversation:
        conv = self._convs.get(conversation_id)
        if not conv:
            raise ValueError("השיחה לא נמצאה")
        if not can_access_conversation(
            actor,
            scope=conv.scope,
            scope_id=conv.scope_id,
            counterpart_user_id=conv.counterpart_user_id,
            manages_all_workers=self._manages_all(actor.network_id),
        ):
            raise PermissionError("אין הרשאה לשיחה זו")
        return conv

    def _require_peer(self, scope: str, scope_id: str, user_id: str) -> User:
        user = self._users.find_by_id(user_id)
        if not user or not user.is_active:
            raise ValueError("משתמש לא נמצא")
        flag = self._manages_all(scope_id) if scope == SCOPE_NETWORK else False
        if user.role not in counterpart_roles_for_scope(scope, flag):
            raise PermissionError("לא ניתן לפתוח שיחה עם משתמש זה")
        if scope == SCOPE_BRANCH and user.branch_id != scope_id:
            raise PermissionError("העובד לא שייך לסניף")
        if scope != SCOPE_BRANCH and user.network_id != scope_id:
            raise PermissionError("המשתמש לא שייך לרשת")
        return user

    def _peers(self, scope: str, scope_id: str) -> list[User]:
        flag = self._manages_all(scope_id) if scope == SCOPE_NETWORK else False
        wanted = list(counterpart_roles_for_scope(scope, flag))
        if scope == SCOPE_BRANCH:
            users = self._users.list_users(roles_in=wanted, branch_ids=[scope_id])
        else:
            users = self._users.list_users(roles_in=wanted, network_id=scope_id)
        return sort_downward_peers([u for u in users if u.is_active])

    def _managers(self, scope: str, scope_id: str) -> list[User]:
        if scope == SCOPE_BRANCH:
            users = self._users.list_users(role=roles.BRANCH_MANAGER, branch_ids=[scope_id])
        else:
            users = self._users.list_users(role=roles.NETWORK_MANAGER, network_id=scope_id)
        return [u for u in users if u.is_active]

    def _manages_all(self, network_id: str | None) -> bool:
        if not network_id or not self._networks:
            return False
        net = self._networks.find_by_id(network_id)
        return bool(net and net.manages_all_workers)

    def _employee_inbox(self, actor: ActorContext) -> dict:
        managers = self._employee_manager_cards(actor)
        unread = sum(int(c.get("unread_count") or 0) for c in managers)
        return {
            "items": [],
            "up": None,
            "managers": managers,
            "unread_count": unread,
            "manages_all_workers": self._manages_all(actor.network_id),
        }

    def _employee_manager_cards(self, actor: ActorContext) -> list[dict]:
        cards: list[dict] = []
        branch = upward_scope(actor)
        bms = self._branch_managers(actor.branch_id)
        if branch and bms:
            conv = self._convs.find(*branch, actor.user_id)
            cards.append(self._card(actor, bms[0], conv, kind="up", scope=SCOPE_BRANCH))
        if self._manages_all(actor.network_id) and actor.network_id:
            nm = self._users.find_network_manager(actor.network_id)
            if nm:
                conv = self._convs.find(SCOPE_NETWORK, actor.network_id, actor.user_id)
                cards.append(self._card(actor, nm, conv, kind="up", scope=SCOPE_NETWORK))
        return cards

    def _open_employee_mine(self, actor: ActorContext, preferred_scope: str | None) -> dict:
        flag = self._manages_all(actor.network_id)
        if preferred_scope == SCOPE_NETWORK:
            if not flag or not actor.network_id:
                raise PermissionError("אין שיחה עם מנהל")
            conv = self._convs.get_or_create(SCOPE_NETWORK, actor.network_id, actor.user_id)
            return self._open(actor, conv)
        if preferred_scope == SCOPE_BRANCH or not flag:
            return self._open_upward(actor)
        if actor.network_id and not self._branch_managers(actor.branch_id):
            conv = self._convs.get_or_create(SCOPE_NETWORK, actor.network_id, actor.user_id)
            return self._open(actor, conv)
        return self._open_upward(actor)

    def _open_upward(self, actor: ActorContext) -> dict:
        scope = upward_scope(actor)
        if not scope:
            raise PermissionError("אין שיחה עם מנהל")
        conv = self._convs.get_or_create(*scope, actor.user_id)
        return self._open(actor, conv)

    def _branch_managers(self, branch_id: str | None) -> list[User]:
        if not branch_id:
            return []
        users = self._users.list_users(role=roles.BRANCH_MANAGER, branch_ids=[branch_id])
        return [u for u in users if u.is_active]

    def _up_card(self, actor: ActorContext) -> dict | None:
        scope = upward_scope(actor)
        if not scope or actor.role != roles.BRANCH_MANAGER or not actor.network_id:
            return None
        nm = self._users.find_network_manager(actor.network_id)
        if not nm:
            return None
        conv = self._convs.find(*scope, actor.user_id)
        return self._card(actor, nm, conv, kind="up", scope=SCOPE_NETWORK)

    def _card(
        self,
        actor: ActorContext,
        peer: User,
        conv: DirectConversation | None,
        *,
        kind: str,
        scope: str | None = None,
    ) -> dict:
        unread = 0
        if conv:
            last_read = self._reads.last_read_at(conv.id, actor.user_id)
            unread = self._messages.unread_count(conv.id, actor.user_id, last_read)
        return {
            "id": conv.id if conv else None,
            "kind": kind,
            "scope": scope or (conv.scope if conv else None),
            "counterpart_user_id": peer.id,
            "counterpart_name": peer.full_name,
            "counterpart_avatar_url": peer.avatar_url,
            "counterpart_role": peer.role,
            "last_preview": conv.last_preview if conv else None,
            "last_at": conv.last_at if conv else None,
            "unread_count": unread,
        }

    def _recipient_break_fields(self, actor: ActorContext, recipient_user_id: str) -> dict:
        if actor.role == roles.EMPLOYEE:
            return {}
        alert = break_alert_payload(
            self._users.on_break_since(recipient_user_id),
            now=datetime.now(timezone.utc),
        )
        if not alert:
            return {}
        return {"recipient_break": alert, "recipient_user_id": recipient_user_id}

    def _peer_api(self, user: User) -> dict:
        return {
            "id": user.id,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
        }

    def _message_api(self, message) -> dict:
        sender = self._users.find_by_id(message.sender_user_id)
        data = message.to_dict()
        data["sender_name"] = sender.full_name if sender else None
        data["sender_role"] = sender.role if sender else None
        return data
