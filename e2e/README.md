# Tests e2e (Playwright)

Tests dans un vrai navigateur (Chromium, écran Pixel 7, `he-IL`) contre l'API FastAPI et le front Vite.

## Lancer

```powershell
npm --prefix e2e install
npm --prefix e2e run install-browsers
npm run test:e2e
```

- `npm --prefix e2e run test:ui` : mode interactif (pas à pas, time-travel).
- `npm --prefix e2e run test:headed` : voir le navigateur.
- `npm --prefix e2e run report` : rapport HTML du dernier run (traces, vidéos et captures des échecs).

## Ce qui se passe à chaque run

1. `backend/scripts/e2e_reset_db.py` supprime et recrée la base **`super_e2e`**, crée le schéma et un petit monde :
   un réseau, un סניף, un menahel, un oved et une tâche du jour (voir `fixtures/world.ts`).
2. L'API démarre sur le port **5101** et Vite sur le **5273** (proxy `/api` → 5101). Ton dev (5001 / 5173) n'est pas touché.
3. Le projet `setup` se connecte une fois par rôle et sauvegarde la session (`.tmp/auth/`).

Base : `E2E_DATABASE_URL` si défini, sinon le `DATABASE_URL` de `backend/.env` avec la base renommée `super_e2e`.
Le script refuse toute base non locale ou dont le nom ne finit pas par `_e2e` : `super_db` et Neon sont protégées.

Sans Postgres local (CI) : `docker compose -f e2e/docker-compose.e2e.yml up -d` puis
`E2E_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/super_e2e`.

Services externes coupés pendant les tests : Brevo (simulation), Gemini/OpenCode, Google TTS/Translate, R2, GitHub.

## Organisation

| Dossier | Session |
|---|---|
| `tests/anonymous/` | non connecté |
| `tests/manager/` | menahel connecté |
| `tests/employee/` | oved connecté |
| `tests/flows/` | parcours multi-rôles (le test ouvre lui-même un contexte par rôle) |

Les tests tournent en série (une seule base partagée). Un test qui crée des données utilise un titre unique (`Date.now()`).

Sélecteurs : rôles et noms accessibles (`getByRole("button", { name: "..." })`) avec les libellés hébreux de
`frontend/src/i18n/he.ts`. Pour trouver les bons noms : `npx playwright codegen http://localhost:5273` pendant un `test:ui`.
