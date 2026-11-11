"""Étape (sous-tâche) visée par un message du chat tâche."""
import pytest

from app.domain.task_chat import normalize_slot_index


def test_no_step_means_general():
    assert normalize_slot_index(None) is None
    assert normalize_slot_index("") is None


def test_accepts_a_zero_based_index_as_int_or_string():
    assert normalize_slot_index(0) == 0
    assert normalize_slot_index(2) == 2
    assert normalize_slot_index("3") == 3


@pytest.mark.parametrize("value", [-1, "-2", "abc", 1.5, True, [1], {"a": 1}])
def test_rejects_invalid_steps(value):
    with pytest.raises(ValueError):
        normalize_slot_index(value)
