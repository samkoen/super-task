# Plan d’implémentation — Dashboard Manager

Document de cadrage (traduction / transposition de l’afyoun hébreu) pour le dashboard manager de l’application de gestion de tâches et de magasin.

**Objectif :** expliquer *quoi* construire et *comment*, en s’appuyant sur l’existant (`ManagerDashboardPage`, API `/dashboard/manager`, composants `frontend/src/components/dashboard/`).

---

## Décisions validées (atelier produit)

| Sujet | Décision |
|-------|----------|
| Type nettoyage / fronts | Champ optionnel sur **משימות קבועות** seulement (`cleaning` \| `fronts_signage` \| `null`). Ad-hoc / sans type → hors KPI. |
| Dénominateur KPI | **Toute la journée** (pas « jusqu’à maintenant »). |
| Fin de tâche | Oved envoie **toujours une photo** ; terminé **uniquement** après approbation menahel. |
| Chat tâche | Multi-messages (texte / audio / photo / vidéo). Nouveau statut **`ממתין לתגובה`**. |
| Reject « לא בוצע » | **Supprimé** ; l’oved pose une question dans le chat. |
| Présence équipe | **Arrivée** = acceptation de la 1ʳᵉ tâche du jour ; **sortie** = 15h00. |
| Bottom nav | **Mobile only** ; PC = menu latéral actuel. |
| 1ʳᵉ livraison | **Dashboard d’abord** (A→E). Chat = phase suivante. |

### Phase A — livrée

- Champ `ops_category` (`cleaning` | `fronts_signage` | `null`) sur templates + occurrences
- Propagation template → occurrence à la génération
- `GET /dashboard/manager` expose `store_kpis` (journée entière)
- Tests : `tests/test_store_kpis.py` + propagation scheduler

### Phase B — livrée

- Tuiles UI `StoreStatusKpiRow` : nettoyage, fronts, objectifs (désactivée)
- Gros chiffre = `approval_pct` ; secondaire = `report_pct`
- Clic objectifs → message « בבנייה »
- Tests Vitest : `storeKpis.test.ts`, `StoreStatusKpiRow.test.tsx`

### Phase C — livrée

- Carrousel `ActionRequiredCarousel` : `awaiting_response` (préparé) puis `pending_review` + revue photo
- Carrousel `PendingTasksCarousel` : tâches ouvertes du jour + filtres département / employé
- Helpers `utils/dashboardCarousels.ts` + tests

### Phase D — livrée

- `StaffProgressOverview` : employés du סניף
- Barre 4 couleurs + présence (arrivée = 1er `started_at`, sortie = 15:00)
- Accordéon tâches (בביצוע / הושלמו / בהמתנה)
- Tests : `staffProgress.test.ts`, `StaffProgressOverview.test.tsx`

### Phase E — livrée (fin 1ʳᵉ livraison dashboard)

- FAB vert `+` → `/manager/tasks` avec `openNewTask`
- Bottom nav mobile : דף הבית / בנק משימות / ארכיון תמונות (`/manager/gallery`)
- Desktop : menu latéral inchangé
- Tests : `managerBottomNav.test.ts`, `ManagerBottomNav.test.tsx`

### Phase F — livrée

- Statut `awaiting_response` (ממתין לתגובה)
- Table `task_messages` + API `GET/POST .../messages`
- Chat UI oved + menahel (`TaskChatPanel`)
- Plus de « לא בוצע » ; reject photo → message chat + `in_progress`
- Tests : `tests/test_task_chat.py`, `taskChat.test.ts`

---

## 1. Synthèse de la cible

Le dashboard manager devient un **écran opérationnel en temps réel**, structuré en 4 blocs :

| Zone | Contenu |
|------|---------|
| **Haut** | 3 KPI « pouls du magasin » (nettoyage, fronts/signalétique, objectifs désactivés) |
| **Centre** | 2 carrousels horizontaux : file d’actions manager + tâches ouvertes du jour |
| **Bas** | Vue équipe (cartes employés + barre de progression 4 couleurs + accordéon) |
| **Fixe** | FAB « + tâche » + bottom navigation (Accueil / Banque de tâches / Archives photos) |

---

## 2. État actuel du code (point de départ)

### Déjà en place

- Page : `frontend/src/pages/manager/ManagerDashboardPage.tsx`
- API : `GET /dashboard/manager` via `dashboardService.getManager`
- Backend : `backend/app/services/dashboard_service.py` + règles `domain/manager_dashboard.py`
- Statuts utiles : `pending`, `in_progress`, `pending_review`, `completed`, `overdue`
- File d’attente / revue photo : `TaskQueuePanel` + `TaskCompletionReviewDialog`
- Équipe : `TeamTimelinePanel`, `EmployeeTimelineCard`, `EmployeeTasksDrawer`
- Tâches non terminées : `UnfinishedTasksPanel`
- Création de tâche : navigation vers `/manager/tasks` (+ `NewTaskFormDialog`)
- Galerie photos : `ManagerTaskGalleryPage`
- FAB menu + drawer de navigation dans `Layout.tsx` (pas encore de bottom nav dédiée dashboard)

### Écarts majeurs vs l’afyoun

| Exigence | Aujourd’hui | À faire |
|----------|-------------|---------|
| KPI nettoyage (double métrique) | Taux global unique | Nouveaux agrégats + tuile dual |
| KPI fronts / signalétique | Absent | Catégorisation tâches + KPI dual |
| KPI objectifs (ventes / RH) | Absent | Tuile « en construction » (UI only) |
| File Action Required (priorité questions/problèmes puis revue photo) | Files par onglets (tabs) | Carrousel priorisé + cadres couleur |
| Réponse multimédia (texte / audio / vidéo) au reject / question | Revue photo existante, pas le flux communication complet | Dialog communication manager |
| Carrousel tâches ouvertes + filtres département / employé | Liste / panels | Carrousel + chips filtres |
| Progress bar 4 couleurs par employé | Timeline segmentée | Barre stacked + accordéon inline |
| FAB vert « + tâche » + bottom nav 3 onglets | Boutons + menu latéral | FAB dédié + BottomNavigation |

---

## 3. Approche globale (comment on va procéder)

### Principes

1. **Réutiliser** le dashboard existant plutôt que le réécrire from scratch.
2. **Backend d’abord pour les KPI et files**, UI ensuite — les formules doivent être testables (pytest).
3. **Catégoriser les tâches** (nettoyage / fronts-signalétique / autre) pour pouvoir calculer les KPI demandés.
4. **Livrer par phases** : valeur visible rapidement, workflows cross-rôles (signalétique) plus tard.
5. **Respecter l’architecture** : controllers minces → services → repositories ; front via `services/` + `i18n/he.ts` ; tests unitaires dans la même livraison.

### Phasage proposé

```
Phase A — Fondations données (ops_category sur templates fixed + API KPI journée)
Phase B — UI haut : 3 tuiles Store Status
Phase C — UI centre : 2 carrousels (file : awaiting_response puis pending_review)
Phase D — UI bas : Staff Progress (barre 4 couleurs + accordion + présence)
Phase E — FAB + bottom nav mobile
─── fin 1ʳᵉ livraison ───
Phase F — Chat tâche + statut ממתין לתגובה (+ retrait reject)
Phase G — Workflow signalétique cross-rôles (hors MVP)
```

---

## 4. Détail par bloc — quoi & comment

### 4.1 Haut — Pouls du magasin (3 KPI)

#### Tuile 1 — Nettoyage & ordre

**Logique métier (double métrique) :**

- **Dénominateur commun** : tâches de nettoyage **planifiées jusqu’à l’heure actuelle** (pas tout le jour futur).
- **Indicateur terrain (secondaire)** :
  \[
  \frac{\text{pending\_review} + \text{approuvées}}{\text{planifiées jusqu’à maintenant}} \times 100
  \]
- **Indicateur manager / norme magasin (nombre central)** :
  \[
  \frac{\text{approuvées (photo validée)}}{\text{planifiées jusqu’à maintenant}} \times 100
  \]

**Implémentation :**

1. Introduire une **catégorie opérationnelle** sur les templates / occurrences (ex. `ops_category`: `cleaning` | `fronts_signage` | `other`), ou convention via département / tags existants si déjà suffisant.
2. Étendre `dashboard_service` pour renvoyer par catégorie :
   ```json
   {
     "store_kpis": {
       "cleaning": {
         "due_until_now": 12,
         "reported": 9,
         "approved": 7,
         "report_pct": 75,
         "approval_pct": 58
       },
       ...
     }
   }
   ```
3. Front : nouveau composant `StoreStatusKpiCard` (nombre central = `approval_pct`, sous-ligne = `report_pct`).
4. Tests : cas nominal + dénominateur 0 + tâches futures exclues du dénominateur.

#### Tuile 2 — Fronts & signalétique prix

Même modèle dual que le nettoyage, filtré sur `fronts_signage`.

**Note scope :** le workflow cross-rôles (scan barcode → caissière → collecte / pose / photo) est un **chantier produit séparé** (Phase G). Pour le dashboard, on affiche les KPI dès que les tâches de cette catégorie existent et suivent le cycle `pending → … → pending_review → completed`.

#### Tuile 3 — Objectifs (ventes / RH)

- État : **désactivée**.
- UI : opacité réduite ; au clic → snackbar / dialog :  
  « רכיב זה בבנייה ויהיה זמין בהמשך » (clé i18n `he.dashboardKpiUnderConstruction`).
- Aucun appel API métier.

---

### 4.2 Centre — 2 rangées carrousel

#### Rangée 1 — File « Action Required »

**Contenu priorisé :**

1. **Priorité haute** (cadre rouge / orange) : questions employé, problèmes / retards signalés.
2. **Suite** (cadre vert / bleu) : tâches `pending_review` (attente validation photo manager).

**Comment :**

- Backend : enrichir la payload (ex. `action_queue`) avec un champ `priority` / `reason` (`question` | `blocker` | `pending_review`).
- Front : remplacer / compléter `TaskQueuePanel` (tabs) par `ActionRequiredCarousel` (scroll horizontal de cartes).
- Clic carte → `TaskCompletionReviewDialog` (existant) ou futur dialog communication (Phase F).

#### Rangée 2 — Tâches ouvertes du jour

- Liste des occurrences **non terminées** assignées aujourd’hui.
- Filtres chips : **département** (יבשים, קירור, ירקות…) et **employé / סדרן**.
- Réutiliser les données déjà présentes (`unfinished_tasks`, `team`, `by_department`) côté client pour filtrer sans nouvel endpoint au début ; endpoint dédié si perf insuffisante.

---

### 4.3 Bas — Progression équipe

**Carte employé :**

- Nom, rôle (`job_function`), présence (`is_active` / statut shift).
- **Barre de progression empilée (4 segments)** :
  - Vert → approuvées (`completed`)
  - Jaune / bleu → `pending_review`
  - Rouge / orange → questions ouvertes / `overdue`
  - Gris → pas commencées (`pending` / upcoming)

**Accordéon :**

- Tap → expansion **inline** (liste : en cours / terminées / en attente).
- Aujourd’hui : drawer latéral (`EmployeeTasksDrawer`) — on peut le garder comme détail, et ajouter l’accordion sur la carte pour coller à l’afyoun.

**Comment :**

- Étendre chaque `TeamMember` avec des compteurs segmentés (`approved`, `awaiting_approval`, `blocked_or_overdue`, `not_started`).
- Composant `StaffProgressBar` + refactor de `EmployeeTimelineCard`.
- Tests domaine sur le calcul des segments.

---

### 4.4 Navigation & actions fixes

#### FAB vert « + משימה חדשה »

- FAB fixé bas d’écran (couleur success / vert marque).
- Clic → ouverture rapide de création (réutiliser `NewTaskFormDialog` : voix, photo incident, assignation, échéance) — sans forcer le détour vers la page tâches, ou avec le même dialog monté sur le dashboard.

#### Bottom navigation (3 onglets)

| Onglet | Route existante / cible |
|--------|-------------------------|
| Accueil (Dashboard) | `/manager` (dashboard) |
| Banque de tâches du jour | `/manager/tasks` |
| Archives photos | `/manager/gallery` (ou équivalent `ManagerTaskGalleryPage`) |

Implémentation : composant `ManagerBottomNav` dans le layout manager (mobile-first), sans casser le drawer desktop actuel.

---

## 5. Communication manager (Reject / réponse question)

Lors d’un **Reject** ou d’une réponse à une question :

- Dialog permettant : **texte**, **audio**, **vidéo courte**.
- Stockage via les mécanismes média déjà présents sur les tâches (référence / feedback).
- Notifier l’employé (réutiliser le canal notifications existant).

Ce flux est découplé de la pure mise en page dashboard mais indispensable pour la rangée 1.

---

## 6. Hors scope immédiat (Phase G)

Workflow signalétique cross-rôles décrit dans l’afyoun :

- **Bottom-up** : סדרן scanne produit sans prix → caissière imprime → « prêt à collecter » → pose + photo.
- **Top-down** : caissière produit rapport changements prix → tâche auto pour le סדרן.

Nécessite nouveaux rôles / états / écrans caissière. Le dashboard n’affiche que le résultat (KPI + cartes) une fois ces tâches dans le système.

---

## 7. Plan technique concret (ordre de travail)

### Backend

1. Modèle / migration : `ops_category` (ou mapping département → catégorie KPI).
2. Fonctions pures dans `domain/` : calcul dual KPI, filtre « due jusqu’à maintenant », segments barre employé.
3. Extension `DashboardService.get_manager` → `store_kpis`, `action_queue` enrichie, compteurs staff.
4. Tests pytest : formules, permissions manager, dénominateur 0, priorité.

### Frontend

1. Types dans `dashboardService.ts`.
2. `StoreStatusKpiRow` (3 tuiles).
3. `ActionRequiredCarousel` + `PendingTasksCarousel` (+ filtres).
4. `StaffProgressOverview` (barre 4 couleurs + accordion).
5. FAB + `ManagerBottomNav`.
6. Clés hébreu dans `i18n/he.ts`.
7. Tests Vitest sur utils de % / filtres / segments.

### Intégration

1. Refactor `ManagerDashboardPage` pour assembler les 4 zones dans l’ordre afyoun.
2. Garder `ManagerDayNav`, sélection de branche (admin / network_manager), refresh via `useTaskChangeListener`.

---

## 8. Critères de done (par livraison)

- [ ] KPI nettoyage & fronts calculés côté backend + affichés (dual métrique)
- [ ] Tuile objectifs désactivée + message « en construction »
- [ ] File Action Required priorisée (questions/problèmes puis revue photo)
- [ ] Carrousel tâches ouvertes + filtres département / employé
- [ ] Cartes employés avec barre 4 couleurs + expansion tâches
- [ ] FAB création tâche + bottom nav 3 destinations
- [ ] Textes unitaires (nominal + cas limite) backend et front
- [ ] Chaînes UI uniquement via `he.*`

---

## 9. Résumé en une phrase

On **transforme le dashboard manager existant** en écran « pouls magasin + files d’action + équipe », en ajoutant d’abord les **agrégats KPI et files côté API**, puis les **composants UI (tuiles duales, carrousels, barre 4 couleurs, FAB/bottom nav)**, tout en reportant le workflow signalétique multi-rôles à une phase ultérieure.
