"""Compat mocks : anciennes APIs N+1 → batch utilisés par _occurrences_to_api."""
from __future__ import annotations

from typing import Any


def stub_occurrence_batch_lookups(
    occurrence_repo: Any,
    completion_repo: Any | None = None,
    template_repo: Any | None = None,
) -> None:
    """Branche lookup_display_names / find_by_ids sur les mocks get_* / find_by_id."""

    def lookup_display_names(
        *,
        branch_ids: set[str],
        department_ids: set[str],
        user_ids: set[str],
    ) -> tuple[dict[str, str | None], dict[str, str | None], dict[str, str | None]]:
        branches = {bid: occurrence_repo.get_branch_name(bid) for bid in branch_ids}
        depts = {did: occurrence_repo.get_department_name(did) for did in department_ids}
        users: dict[str, str | None] = {}
        for uid in user_ids:
            name = occurrence_repo.get_assignee_name(uid) or occurrence_repo.get_manager_name(uid)
            if name is not None:
                users[uid] = name
        return branches, depts, users

    occurrence_repo.lookup_display_names.side_effect = lookup_display_names

    if completion_repo is not None:
        def find_by_occurrence_ids(ids: list[str]) -> dict:
            out = {}
            for oid in ids:
                row = completion_repo.find_by_occurrence(oid)
                if row:
                    out[oid] = row
            return out

        completion_repo.find_by_occurrence_ids.side_effect = find_by_occurrence_ids

    if template_repo is not None:
        def find_by_ids(ids: list[str]) -> dict:
            out = {}
            for tid in ids:
                row = template_repo.find_by_id(tid)
                if row:
                    out[tid] = row
            return out

        template_repo.find_by_ids.side_effect = find_by_ids
