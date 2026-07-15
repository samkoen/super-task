"""Diagnostic GOOGLE_CLOUD_API_KEY (sans afficher la clé complète)."""
from pathlib import Path

from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")

import os

from app.core import config

k = config.GOOGLE_CLOUD_API_KEY
g = config.GEMINI_API_KEY

print("backend/.env exists:", (backend_dir / ".env").exists())
print("root .env exists:", (backend_dir.parent / ".env").exists())
print("GOOGLE_CLOUD_API_KEY set:", bool(k))
print("GOOGLE_CLOUD_API_KEY length:", len(k))
if k:
    print("GOOGLE_CLOUD_API_KEY prefix:", k[:10] + "...")
    print("Looks like AIza:", k.startswith("AIza"))
    print("Has surrounding quotes:", (k.startswith('"') and k.endswith('"')) or (k.startswith("'") and k.endswith("'")))
    print("Strip differs:", k != k.strip())
print("GEMINI_API_KEY set:", bool(g))
if k and g:
    print("Same as GEMINI_API_KEY:", k == g)

raw = os.environ.get("GOOGLE_CLOUD_API_KEY", "")
if raw and raw != k:
    print("WARNING: raw env differs from config (check parsing)")
