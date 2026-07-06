# Super — Spécification & Architecture

> Application de gestion opérationnelle pour réseaux de supermarchés (רשת סופרמרקטים)  
> Stack : **Python (FastAPI) · React/TS · PostgreSQL**  
> Interface : **100 % hébreu · RTL** (modèle `exam`)  
> Architecture modules back : modèle `Digestic/digestic-projet1`

---

## 1. Vision produit

### Problème

Un réseau de supermarchés (Shufersal, Carrefour, etc.) doit coordonner des dizaines de **סניפים** (succursales), chacun avec des **מחלקות** (rayons), des **עובדים** (employés) et un flux constant de **משימות** (tâches opérationnelles).

### Solution

Une plateforme à **deux faces** :

| Persona | Besoin | Interface |
|---------|--------|-----------|
| **מנהל רשת / מנהל סניף** | Vue macro, alertes, KPIs, affectation | Dashboard desktop/tablette, code couleur |
| **עובד** | Exécuter ses tâches rapidement, une main libre | Mobile-first, liste To-Do ultra simple |

### Principe directeur

> **3 secondes** : le manager comprend l'état du magasin via le code couleur (🟢 תקין · 🟠 לטיפול · 🔴 התראה/עיכוב).

---

## 2. Répartition des projets de référence

| Aspect | Projet source | Chemin |
|--------|---------------|--------|
| **RTL, hébreu, i18n** | `exam` | `C:\Users\USER\exam` |
| **AuthContext, ProtectedRoute, routes par rôle** | `exam` | idem |
| **MUI RTL, `i18n/he.ts`, Bidi** | `exam` | idem |
| **Architecture back en couches** | `digestic-projet1` | `C:\Users\USER\Digestic\digestic-projet1` |
| **Controllers → Services → Repositories** | `digestic-projet1` | idem |
| **ORM + dataclasses domaine + mappers** | `digestic-projet1` | idem |
| **Auth session Starlette + bcrypt** | `digestic-projet1` | idem |
| **Alembic, UUID, uploads statiques** | `digestic-projet1` | idem |
| **Dashboard StatCards, Layout sidebar** | `digestic-projet1` | idem (adapté RTL + hébreu) |
| **Frontend TypeScript** | exigence Super | migration JSX → TSX |

### Correspondances métier Digestic → Super

| Digestic | Super | Rôle |
|----------|-------|------|
| `Pharmacy` | `Snif` | Point de vente géolocalisé |
| `Commercial` | `Oved` | Employé terrain, périmètre restreint |
| `admin` | `admin` | Administration globale |
| — | `menahel_reshet` | Manager réseau (multi-snif) |
| — | `menahel_snif` | Manager magasin |
| `Visit` | `TaskOccurrence` | Événement planifié à exécuter |
| `VisitReport` | `TaskCompletion` | Exécution documentée (statut, photo, notes) |
| `Product` | `Product` | Produit rattaché à un rayon |
| `Warehouse` | (optionnel V2) | Stock / entrepôt |
| Moteur `visit_planning_engine` | `TaskSchedulerService` | Récurrence et génération d'occurrences |
| `planning_alerts` (codes couleur) | `HealthStatus` dashboard | Alertes visuelles manager |
| Filtres paginés + `SavedFiltersBar` | Listes snifim / tâches | Listes filtrables manager |

---

## 3. Hiérarchie organisationnelle & géographique

```
רשת (Reshet)
 └── סניף (Snif) — adresse, ville, code postal
      └── מחלקה (Mahlekha / département rayon)
           ├── עובדים (employés rattachés)
           └── מוצרים (produits du rayon)
```

### Entités clés

| Entité | Description | Exemple |
|--------|-------------|---------|
| `Reshet` | Chaîne / enseigne | « שופרסל », « קרפור » |
| `Snif` | Magasin physique | « סניף תל אביב מרכז » |
| `Mahlekha` | Rayon / département | « ירקות », « קופות », « מחסן » |
| `Product` | Produit rattaché à une mahlekha | SKU, nom hébreu |
| `User` | Compte applicatif | email + mot de passe |

### Règle de périmètre (comme `commercial` limité à ses pharmacies)

Chaque requête API est **filtrée par le périmètre du rôle** — pattern identique à `PharmacyService.list_pharmacies_paginated(user_role, user_id)` :

- `admin` → toutes les reshot
- `menahel_reshet` → sa reshet + tous ses snifim
- `menahel_snif` → son snif uniquement
- `oved` → son snif + ses mahlekhot assignées + ses propres tâches

---

## 4. Rôles & authentification

### Rôles (`UserRole`)

| Code | Libellé UI (he) | Périmètre |
|------|-----------------|-----------|
| `admin` | מנהל מערכת | Global |
| `menahel_reshet` | מנהל רשת | Une reshet |
| `menahel_snif` | מנהל סניף | Un snif |
| `oved` | עובד | Un snif (+ mahlekhot) |

### Auth backend (modèle `digestic-projet1`)

- `SessionMiddleware` Starlette + cookie de session (`withCredentials: true`)
- `POST /api/auth/login` — email + password → session `user_id`, `user_role`, `user_email`
- `POST /api/auth/logout` — `request.session.clear()`
- `GET /api/auth/me` — profil courant
- Vérifications rôle : `auth/session_roles.py` → `require_user_id`, `require_admin_user_id`
- Mots de passe : bcrypt via `core/security.py`
- Pas d'auto-inscription publique

### Auth frontend (modèle `exam`)

- `AuthContext` + `ProtectedRoute` avec garde par rôle
- Cache local `user` (comme digestic) + revalidation `/api/auth/me`
- Intercepteur 401 → redirection `/login`
- Toutes les chaînes UI dans `i18n/he.ts`

### Sécurité & RH (ניהול כוח אדם ואבטחה)

| Donnée | Usage |
|--------|-------|
| Contrat (`Contract`) | type, dates début/fin, statut |
| Heures (`WorkShift`) | pointage / planning hebdomadaire |
| `is_active` | suspension accès (comme `User.is_active` digestic) |
| Documents | pièces jointes contrat (optionnel MVP+) |

---

## 5. Modules fonctionnels

### 5.1 Référentiels (Admin / מנהל רשת)

- CRUD **Reshot** et **Snifim** (pattern `pharmacy_controller` + pagination/filtres)
- CRUD **Mahlekhot** par snif
- CRUD **Products** par mahlekha (pattern `product_controller`)
- CRUD **Users** (pattern `user_controller`)

### 5.2 RH (מודול משאבי אנוש)

- Fiche employé : contrat, horaires, mahlekha principale
- Vue manager : liste équipe du snif, statuts contrat
- Notes internes manager ↔ employé (MVP : champ texte)

### 5.3 Cœur métier — משימות (Tasks)

Inspiré du couple **`Visit` + `VisitReport`** de digestic, enrichi pour la récurrence.

#### Types de récurrence (`TaskRecurrence`)

| Type | Code | Comportement |
|------|------|--------------|
| Ponctuelle | `once` | Une occurrence, date/heure fixe |
| Quotidienne | `daily` | Régénération chaque jour (heure limite configurable) |
| Hebdomadaire | `weekly` | Jour(s) de la semaine (ex. vendredi) — analogue `CommercialPlanningOffWeekday` |
| Mensuelle | `monthly` | Jour du mois (V2) |

#### Cycle de vie (`TaskOccurrence`)

```
pending → in_progress → completed
                      ↘ overdue
                      ↘ cancelled (manager)
```

#### Preuve de réalisation (`TaskCompletion`) — analogue `VisitReport`

- Statut `completed` / `not_completed` + raison si non fait
- Checkbox « בוצע »
- Photo upload (`photo_note_url` → `photo_path`) — servie via `/uploads` statique
- Commentaire optionnel
- Horodatage

#### Affectation

- Par **employé** (`assignee_user_id`)
- Ou par **mahlekha** (tous les employés du rayon)
- Création : `menahel_snif`, `menahel_reshet`, `admin`

### 5.4 Dashboard manager (לוח בקרה)

Pattern digestic : agrégation côté service + **StatCards** cliquables (comme `Dashboard.jsx`).

**Endpoint** : `GET /api/dashboard/summary?snif_id=…`

```json
{
  "snif": { "id": "uuid", "name": "סניף חיפה" },
  "health": "orange",
  "counts": {
    "tasks_total": 42,
    "tasks_green": 30,
    "tasks_orange": 8,
    "tasks_red": 4
  },
  "by_mahlekha": [
    { "name": "ירקות", "health": "red", "pending": 3, "overdue": 1 }
  ],
  "recent_alerts": [
    { "type": "overdue", "title": "ניקוי מעבר 4", "since": "2026-07-05T08:00:00+03:00" }
  ]
}
```

#### Règles de couleur

| Couleur | Code | Condition |
|---------|------|-----------|
| 🟢 ירוק | `green` | Toutes les tâches `completed` ou `pending` avec marge > seuil |
| 🟠 כתום | `orange` | Tâches proches échéance (< 2h) ou complétion < 80 % |
| 🔴 אדום | `red` | Au moins une tâche `overdue` |

Palette MUI : réutiliser `success` / `warning` / `error` du thème (comme digestic).

### 5.5 Interface employé (ממשק עובד)

Route dédiée : `/employee` (redirection auto si rôle `oved`)

- **Mobile-first** : boutons larges, tap unique
- **Une main** : FAB « סיום » en bas
- **Micro-vue** : « המשימות שלי היום »
- Pas de sidebar ; header minimal
- Actions : marquer fait, photo (comme saisie rapport de visite digestic)

---

## 6. Modèle de données (PostgreSQL)

### Diagramme entités (simplifié)

```mermaid
erDiagram
    Reshet ||--o{ Snif : has
    Snif ||--o{ Mahlekha : has
    Snif ||--o{ User : employs
    Mahlekha ||--o{ Product : contains
    Mahlekha }o--o{ User : assigned
    User ||--o{ Contract : has
    User ||--o{ WorkShift : works
    Snif ||--o{ TaskTemplate : defines
    TaskTemplate ||--o{ TaskOccurrence : generates
    TaskOccurrence ||--o| TaskCompletion : proves
    User ||--o{ TaskOccurrence : assigned
```

### Tables principales

| Table | Rôle |
|-------|------|
| `reshot` | Chaînes |
| `snifim` | Magasins (`reshet_id`, adresse, `city`, `postal_code`, `is_active`) |
| `mahlekhot` | Rayons (`snif_id`, `name`, `sort_order`) |
| `products` | Produits (`mahlekha_id`, `name`, `sku`) |
| `users` | Comptes UUID (`role`, `snif_id`, `email`, `password_hash`, `is_active`) |
| `user_mahlekhot` | N-N employé ↔ rayon |
| `contracts` | Contrats RH |
| `work_shifts` | Heures / planning |
| `task_templates` | Définition récurrente |
| `task_occurrences` | Instance concrète |
| `task_completions` | Preuve (photo_path, note, statut, `completed_at`) |

### Enums

```python
class UserRole(str, Enum):
    ADMIN = "admin"
    MENAHEL_RESHET = "menahel_reshet"
    MENAHEL_SNIF = "menahel_snif"
    OVED = "oved"

class TaskRecurrence(str, Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class HealthStatus(str, Enum):
    GREEN = "green"
    ORANGE = "orange"
    RED = "red"
```

### Identifiants

UUID (`Uuid(as_uuid=True)`) pour toutes les PK — comme digestic.

---

## 7. Architecture backend (Python / FastAPI)

Structure calquée sur **`Digestic/digestic-projet1/backend`** :

```
backend/
├── app/
│   ├── main.py                      # create_app(), CORS, SessionMiddleware, routers, /uploads
│   ├── core/
│   │   ├── config.py                # SECRET_KEY, .env
│   │   └── security.py              # bcrypt hash/verify
│   ├── auth/
│   │   └── session_roles.py         # require_user_id, require_admin_user_id
│   ├── dependencies.py              # get_db
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py               # SQLAlchemy sync Session
│   │   ├── models.py                # ORM (toutes les tables)
│   │   ├── mappers.py               # ORM ↔ dataclasses domaine
│   │   └── bootstrap.py             # seed initial (optionnel)
│   ├── models/                      # dataclasses domaine (Snif, Task, User…)
│   ├── repositories/                # accès données (SnifRepository, TaskRepository…)
│   ├── services/                    # logique métier (SnifService, TaskService, DashboardService…)
│   ├── domain/                      # règles pures (task_recurrence, health_rules, scope)
│   ├── controllers/                 # routes FastAPI (snif_controller, task_controller…)
│   ├── schemas/                     # Pydantic (si validation entrée/sortie dédiée)
│   └── pagination.py
├── alembic/
│   └── versions/
├── scripts/
│   ├── create_initial_admin.py
│   └── seed_demo_data.py
├── uploads/                         # photos preuves tâches
├── requirements.txt
└── run.py                           # Uvicorn (port 5000 par défaut, comme digestic)
```

### Couches (comme digestic)

```
Controller  →  reçoit HTTP, lit session, appelle Service
Service     →  logique métier, filtres rôle/périmètre
Repository  →  requêtes SQLAlchemy
Mapper      →  conversion ORM ↔ dataclass domaine
Domain      →  règles pures sans I/O
```

### Routers API (MVP)

| Préfixe | Endpoints clés |
|---------|----------------|
| `/api/auth` | login, logout, me |
| `/api/users` | CRUD users (admin) |
| `/api/reshot` | CRUD reshot |
| `/api/snifim` | liste paginée + filtres, détail |
| `/api/mahlekhot` | CRUD par snif |
| `/api/products` | CRUD par mahlekha |
| `/api/hr` | contracts, shifts |
| `/api/tasks` | templates CRUD, occurrences, assign |
| `/api/tasks/mine` | tâches employé connecté |
| `/api/tasks/{id}/complete` | clôture + upload photo |
| `/api/dashboard` | summary par snif / reshet |

### Services clés

| Service | Responsabilité |
|---------|----------------|
| `ScopeService` | Filtre SQL selon rôle + reshet/snif (comme restriction `commercial`) |
| `TaskSchedulerService` | Génère occurrences depuis templates (job nocturne) |
| `DashboardService` | Agrège stats + calcule `health` |
| `TaskCompletionService` | Validation preuve, changement statut (comme `VisitReportService`) |

### Job planifié

Script `scripts/run_task_occurrence_generator.py` :

- Chaque nuit : matérialiser tâches `daily` / `weekly`
- Marquer `overdue` les occurrences non complétées

### Bootstrap & lifespan

Comme digestic : bootstrap DB asynchrone au démarrage (`lifespan` + `asyncio.to_thread`), `GET /health` sans DB.

---

## 8. Architecture frontend (React / TypeScript)

Hybride **`exam`** (RTL, TS, i18n) + **`digestic-projet1`** (organisation pages/services/composants) :

```
frontend/
├── index.html                       # lang="he" dir="rtl" (exam)
├── src/
│   ├── main.tsx                     # MUI RTL + ThemeProvider + AuthProvider (exam)
│   ├── App.tsx                      # Routes + ProtectedRoute par rôle (exam)
│   ├── i18n/he.ts                   # TOUTES les chaînes UI en hébreu (exam)
│   ├── theme/
│   │   └── theme.ts                 # palette + health colors (digestic + exam RTL)
│   ├── emotion/caches.ts            # stylis-plugin-rtl (exam)
│   ├── context/AuthContext.tsx      # (exam)
│   ├── services/
│   │   ├── api.ts                   # axios, withCredentials (digestic)
│   │   ├── authService.ts
│   │   ├── snifService.ts
│   │   ├── taskService.ts
│   │   └── dashboardService.ts
│   ├── components/
│   │   ├── Layout/Layout.tsx        # sidebar RTL (digestic Layout + exam RTL)
│   │   ├── PageHeader/PageHeader.tsx
│   │   ├── AppLoadingScreen/
│   │   ├── HealthBadge.tsx
│   │   ├── TaskCard.tsx
│   │   └── SavedFiltersBar/         # filtres listes (digestic)
│   ├── pages/
│   │   ├── Login/Login.tsx
│   │   ├── Dashboard/Dashboard.tsx  # StatCards (digestic)
│   │   ├── admin/
│   │   ├── manager/
│   │   └── employee/
│   └── hooks/
└── package.json
```

### Routes par rôle

| Rôle | Home | Routes principales |
|------|------|-------------------|
| `admin` | `/admin` | users, reshot, snifim |
| `menahel_reshet` | `/manager` | dashboard multi-snif, équipes |
| `menahel_snif` | `/manager` | dashboard snif, tâches, équipe, mahlekhot |
| `oved` | `/employee` | mes tâches du jour |

### RTL & i18n (comme `exam`)

- `html lang="he" dir="rtl"`
- `@mui/material` + `stylis-plugin-rtl`
- Fichier unique `i18n/he.ts`
- Police **Heebo** (exam) ou équivalent hébreu
- Composants Bidi si nécessaire (`BidiTextField`)

### Thème

Couleurs santé alignées sur palette digestic (`success` / `warning` / `error`) :

```ts
export const healthColors = {
  green:  { main: "#2E7D4F", bg: "#e8f5e9" },
  orange: { main: "#E67E22", bg: "#fff3e0" },
  red:    { main: "#C62828", bg: "#ffebee" },
};
```

---

## 9. Matrice des permissions (résumé)

| Action | admin | menahel_reshet | menahel_snif | oved |
|--------|:-----:|:--------------:|:------------:|:----:|
| Voir toutes les reshot | ✅ | ❌ | ❌ | ❌ |
| Gérer snifim de sa reshet | ✅ | ✅ | ❌ | ❌ |
| Gérer son snif | ✅ | ✅ | ✅ | ❌ |
| Créer / assigner tâches | ✅ | ✅ | ✅ | ❌ |
| Voir dashboard snif | ✅ | ✅ | ✅ | ❌ |
| Voir dashboard reshet | ✅ | ✅ | ❌ | ❌ |
| Exécuter ses tâches | ✅ | ✅ | ✅ | ✅ |
| Voir tâches d'autres employés | ✅ | ✅ | ✅ | ❌ |
| Gérer contrats / RH | ✅ | ✅ | ✅ | ❌ (lecture propre fiche) |

---

## 10. Plan de développement par phases

### Phase 0 — Bootstrap (1–2 j)

- [ ] Init repo `Super/` : backend FastAPI + frontend Vite/React/TS
- [ ] PostgreSQL + Alembic migration initiale
- [ ] Auth session (digestic) + AuthContext (exam)
- [ ] RTL + `he.ts` + LoginPage
- [ ] Script `create_initial_admin`

### Phase 1 — Référentiels & users (2–3 j)

- [ ] CRUD Reshet, Snif, Mahlekha, Product (controller/service/repository)
- [ ] CRUD Users avec rôles et affectations
- [ ] Filtres paginés + scope par rôle
- [ ] Pages admin + menu manager

### Phase 2 — Module tâches MVP (3–4 j)

- [ ] TaskTemplate + TaskOccurrence (once, daily, weekly)
- [ ] API create / assign / complete / photo upload
- [ ] Job générateur d'occurrences
- [ ] Interface employé mobile To-Do
- [ ] Interface manager création tâches

### Phase 3 — Dashboard (2 j)

- [ ] DashboardService + health colors
- [ ] StatCards par mahlekha (pattern digestic)
- [ ] Alertes overdue

### Phase 4 — RH (2 j)

- [ ] Contracts + WorkShifts
- [ ] Pages équipe manager

### Phase 5 — Finitions (continu)

- [ ] Filtres sauvegardés (`SavedFiltersBar`)
- [ ] Notifications (V2)
- [ ] Récurrence mensuelle

---

## 11. Données de démo (seed)

Script `seed_demo_data.py` :

| Entité | Exemple |
|--------|---------|
| Reshet | « רשת דמו » |
| Snifim | « סניף תל אביב », « סניף חיפה » |
| Mahlekhot | ירקות, מאפים, קופות |
| Users | admin, menahel_reshet, menahel_snif, 3 ovedim |
| Tasks | 1 ponctuelle, 2 daily, 1 weekly (vendredi) |

---

## 12. Variables d'environnement

```env
# backend/.env
DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/super_db
SECRET_KEY=...
FRONTEND_URL=http://localhost:5173
```

Proxy Vite frontend → backend (comme digestic port 5000) :

```js
// vite.config.ts
server: { proxy: { '/api': 'http://127.0.0.1:5000', '/uploads': 'http://127.0.0.1:5000' } }
```

---

## 13. Références projet

| Projet | Chemin | Emprunt |
|--------|--------|---------|
| **exam** | `C:\Users\USER\exam` | RTL hébreu, `i18n/he.ts`, MUI RTL, AuthContext, ProtectedRoute, routes par rôle, TypeScript |
| **digestic-projet1** | `C:\Users\USER\Digestic\digestic-projet1` | Architecture controllers/services/repositories/domain, ORM+mappers, auth session, Alembic UUID, pagination/filtres, Dashboard StatCards, Layout sidebar, VisitReport→TaskCompletion, uploads statiques |
| **Super** | `C:\Users\USER\Super` | Spécification métier supermarché |

---

## 14. Décisions techniques actées

1. **SQLAlchemy sync + Repository** (digestic) — pas async exam
2. **Auth session Starlette** (digestic) — pas JWT cookie exam
3. **UUID** pour toutes les PK (digestic)
4. **Dataclasses domaine + mappers** ORM (digestic)
5. **Occurrences matérialisées** pour daily/weekly — dashboard simple
6. **Hébreu uniquement** en UI — `i18n/he.ts` (exam)
7. **Upload photos** via `/uploads` statique (digestic)
8. **Frontend TypeScript** — digestic est en JSX, Super migrera en TSX
9. **Pas de PWA** au MVP — responsive web suffit

---

*Document v1.1 — juillet 2026*
