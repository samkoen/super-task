"""Isoler pytest du bucket R2 réel et de l'IMDS AWS."""
from __future__ import annotations

import os

os.environ.setdefault("AWS_EC2_METADATA_DISABLED", "true")
for _key in (
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_ACCOUNT_ID",
    "R2_ENDPOINT",
    "BLOB_READ_WRITE_TOKEN",
):
    os.environ[_key] = ""
