"""Operational job functions for employees."""

HEAD_CASHIER = "head_cashier"
STOCKERS = "stockers"
WAREHOUSE_WORKER = "warehouse_worker"

ALL_JOB_FUNCTIONS = frozenset({HEAD_CASHIER, STOCKERS, WAREHOUSE_WORKER})

JOB_FUNCTION_LABELS_HE: dict[str, str] = {
    HEAD_CASHIER: "קופה ראשית",
    STOCKERS: "סדרנים",
    WAREHOUSE_WORKER: "מחסנאי",
}


def is_valid_job_function(value: str | None) -> bool:
    return value in ALL_JOB_FUNCTIONS
