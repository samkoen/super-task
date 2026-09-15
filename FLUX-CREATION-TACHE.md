# Flux création de tâche — état actuel

> Document aligné sur le code **tel qu’il fonctionne aujourd’hui**.  
> Parcours produit (8 points), stack IA, endpoints et règles métier.

---

## 1. Parcours produit (résumé)

| # | Étape | Comportement actuel |
|---|--------|---------------------|
| 1 | Nouvelle tâche | Clic → dialog **מילוי שדות ידני** / **יצירה בהקלטה קולית (AI)** (`TaskCreationModeDialog`) |
| 2 | Création IA | Enregistrement → Gemini → champs pré-remplis → formulaire éditable → **שליחה** |
| 3 | Médias manager | Photo / vidéo / audio de référence **optionnels** |
| 4 | Annotation photo | Après capture photo : cercles / ellipses / flèches ; image **aplatie** à la confirmation (`PhotoAnnotationCanvas`) |
| 5 | Audio référence | Upload immédiat → transcription Gemini → texte **ajouté à la description** (éditable avant שליחה) |
| 6 | Vue employé | Titre + description traduits ; photo / vidéo / audio **originaux** du manager |
| 7 | Clôture employé | Note + **photo ou vidéo obligatoire** + audio optionnel → statut `pending_review` |
| 8 | Audio clôture | Transcript **manager** (`audio_transcript`) + transcript **employé** (`audio_transcript_employee`) |

---

## 2. Types de tâches & qui crée

| Type | UI | Qui | Assigné |
|------|-----|-----|---------|
| **קבועה** (`fixed`) | « משימה קבועה חדשה » | **branch_manager** uniquement | Obligatoire (employé du snif) |
| **מזדמנת** (`ad_hoc`) | « משימה מזדמנת » | admin / network_manager / branch_manager | Obligatoire à la création |

- Network manager / admin : choisissent la **branche** puis l’employé.
- **Pas de création sans assigné** : plus de parcours « ממתין להעברה » à la création (l’API `delegate` et le flag `pending_delegation` existent encore pour d’éventuelles données legacy, mais **aucune UI** ne les utilise).

### Depuis un דיווח תקלה

- `ManagerIssuesPage` → **צור משימה** → `/manager/tasks` avec prefill ad hoc (`issueReportTaskPrefill.ts`).
- Destinataire = **rapporteur** ; médias du report copiés vers `task_*` à la création.

---

## 3. Stack IA / langues

### Audio → texte (speech-to-text)

| Cas | Techno | Entrée |
|-----|--------|--------|
| Création tâche par voix manager | **Gemini** multimodal | `POST /api/ai/task-from-voice` · `task_voice_ai_service.py` |
| Audio référence manager → description | **Gemini** | `POST /api/ai/transcribe-reference-audio` · `reference_audio_transcription_service.py` |
| Audio de clôture employé | **Gemini** | `completion_audio_transcription_service.py` → `audio_transcript` + `audio_transcript_employee` |

> Translate API et TTS ne font **pas** de STT. Seul **Gemini** pour audio → texte.

### Texte → audio (TTS)

| Cas | Techno | Entrée |
|-----|--------|--------|
| Lecture tâche employé | **Google Cloud TTS** | `POST /api/ai/task-tts` · `task_tts_service.py` |
| Repli hébreu | `window.speechSynthesis` | `useTaskSpeech.ts` |

Lit `spoken_text` (dérivé de la traduction).

### Traduction (manager → employé)

| Élément | Détail |
|---------|--------|
| Service | Google Cloud Translation v2 (sinon repli Gemini / OpenCode) |
| Source | `preferred_language` du créateur / manager |
| Cible | `preferred_language` employé (`he` · `ar` · `th` · `fr` · `en`) |
| Cache | `task_occurrence_translations` |
| Auto | `GET /api/tasks/mine`, dashboard employé ; repli `POST /api/tasks/mine/translate` |

---

## 4. Détail par étape

### 4.1 Choix formulaire vs audio IA

1. Clic **משימה קבועה** / **משימה מזדמנת**
2. `TaskCreationModeDialog` : manuel ou voix
3. Manuel → dialog formulaire ; voix → `TaskVoiceCreationDialog` puis formulaire pré-rempli
4. **שליחה** crée la tâche (rien n’est persisté avant)

Fichiers : `ManagerTasksPage.tsx`, `TaskCreationModeDialog.tsx`, `TaskVoiceCreationDialog.tsx`, `TaskVoiceAssistant.tsx`

### 4.2 Création par audio IA

- Micro : `useAudioRecorder.ts`
- `aiService.parseTaskFromVoice()` → `POST /api/ai/task-from-voice`
- Gemini → `{ title, description, assignee_name }` (`domain/task_voice.py`)
- Audio manager **non persisté** ; seul le JSON structuré remplit le formulaire
- Confirmation obligatoire via **שליחה**

### 4.3 Médias référence manager

- UI : `TaskReferenceMediaEditor` + `MediaCaptureActions`
- Photo / vidéo : fichiers locaux (`pending_*`) → upload à la **שליחה**
- Audio : upload dès capture + transcription → description
- Upload photo / audio : `POST /api/tasks/upload-photo|audio` → R2 (ou `/uploads` en local)
- Upload vidéo (prod) : `POST /api/media/video-intent` puis **PUT présigné** directement sur R2
- Champs : `reference_photo_url`, `reference_video_url`, `reference_audio_url` (template + occurrence)
- Template → occurrence : **copie** via `blob_storage.copy_media_url` (objets R2 isolés)

### 4.4 Annotation photo

- Après capture photo, éditeur canvas natif (`PhotoAnnotationCanvas` — pas Fabric)
- Outils : cercle / ellipse / flèche
- À la confirmation : image JPEG **aplatie** (pas de JSON d’annotations en DB)
- Puis même flux upload que les autres photos

### 4.5 Audio référence → description

- `TaskReferenceMediaEditor` appelle `aiService.transcribeReferenceAudio`
- Backend : `reference_audio_transcription_service.py` (Gemini, langue manager)
- Texte appendé à la description (`appendDescriptionBlock`) ; le manager peut éditer avant envoi
- Le fichier audio reste disponible pour l’employé (`reference_audio_url`)

### 4.6 Vue employé

- Titre / description traduits ; `title_he` conservé si langue ≠ hébreu
- Médias référence **non traduits** (fichiers originaux)
- TTS « écouter » : `spoken_text`
- Badge report de jour précédent : « לא הושלמה מיום קודם » si `created_at` date &lt; `due_at` date (après rollover)

### 4.7 Clôture employé

1. `POST .../start` → `in_progress` (depuis `pending` / `overdue`)
2. Dialog : **בוצע** / **לא בוצע** + note + médias
3. Si **בוצע** : **photo ou vidéo obligatoire**, audio optionnel (`domain/completion_media.py`)
4. `POST .../complete` → pour un employé réussi : statut **`pending_review`**
5. Manager : `approve` → `completed` ; `reopen` → `in_progress` + `rejection_note`

Upload completion : photo/audio via `/api/tasks/upload-*` ; vidéo via intent + PUT R2.  
Revue : `TaskCompletionReviewDialog` · file dashboard « ממתין לאישור ».

### 4.8 Audio clôture bilingue

- À la complétion avec `audio_path` : transcription Gemini
- `audio_transcript` → langue **manager**
- `audio_transcript_employee` → langue **employé**
- Affichage : revue manager + preview côté employé

---

## 5. APIs création (référence)

Préfixe : `/api/tasks`

| Action | Méthode | Notes |
|--------|---------|--------|
| Liste templates | `GET /templates` | filtre `branch_id` optionnel |
| Créer fixe | `POST /templates` | `assignee_user_id` obligatoire ; récurrence `daily` / `weekly` / `biweekly` / `monthly` ; génère l’occurrence du jour si applicable |
| Créer ad hoc | `POST /ad-hoc` | `assignee_user_id` + `due_at` obligatoires ; `photo_required` défaut `true` |
| Upload photo / audio | `POST /upload-photo\|audio` | dossiers `task_photos` / `task_audio` → R2 |
| Intent vidéo | `POST /api/media/video-intent` | PUT présigné R2 (prod) ; proxy API en local |
| Occurrences manager | `GET /occurrences` | + rollover ouvertures du jour |
| Mes tâches | `GET /mine` | traduction auto ; `due_on` défaut = aujourd’hui |
| Start / complete | `POST /occurrences/{id}/start\|complete` | |
| Approve / reopen | `POST /occurrences/{id}/approve\|reopen` | |
| Scheduler manuel | `POST /run-scheduler` | managers |

Issues : `POST /api/issue-reports`, uploads `issue_photos|videos|audio`.

---

## 6. Stockage médias

**Vercel Blob n’est plus utilisé.** Anciennes URLs `*.blob.vercel-storage.com` : ignorées (pas de proxy, pas d’avatar).

| Environnement | Comportement |
|---------------|--------------|
| Clés `R2_*` définies | **Cloudflare R2** (`object_store` + `blob_storage.put_bytes`) |
| Local sans R2 | Disque `/uploads/{folder}/{uuid}{ext}` |
| Prod sans R2 | Upload refusé (démarrage refusé) |

- Photo : compression avant upload (`media_compression.py`)
- Limites : photo 10 Mo · vidéo 50 Mo · audio 20 Mo
- Lecture : proxy auth `GET /api/media/proxy?src=...` → fichier local ou **redirect GET présigné R2**
- Vidéo prod : le navigateur / Android envoie le fichier en PUT sur l’URL présignée (pas via l’API)
- Rétention : `MediaRetentionService` + cron `GET/POST /api/cron/purge-media`

---

## 7. Rollover des tâches ouvertes

À chaque `list_occurrences`, `list_mine`, dashboard ou `run-scheduler` :

- Statuts : `pending`, `overdue`, `in_progress`
- Si `due_at` est **avant** le début du jour courant (TZ `Asia/Jerusalem`) → `due_at` avancé au **jour courant** (heure conservée)
- `created_at` inchangé (origine visible côté UI)

---

## 8. Cartographie fichiers

### Frontend manager
| Fichier | Rôle |
|---------|------|
| `pages/manager/ManagerTasksPage.tsx` | Création fixe / ad hoc, filtres, édition, revue, prefill issue |
| `components/tasks/TaskCreationModeDialog.tsx` | Choix manuel vs voix |
| `components/tasks/TaskVoiceCreationDialog.tsx` | Enregistrement IA |
| `components/ai/TaskVoiceAssistant.tsx` | Parsing voix |
| `components/tasks/TaskReferenceMediaEditor.tsx` | Médias référence + transcription audio |
| `components/media/MediaCaptureActions.tsx` | Capture + annotation photo |
| `components/media/PhotoAnnotationCanvas.tsx` | Cercles / flèches (canvas 2D) |
| `components/tasks/TaskCompletionReviewDialog.tsx` | אישור / פתיחה מחדש |
| `pages/manager/ManagerIssuesPage.tsx` | צור משימה depuis report |
| `utils/issueReportTaskPrefill.ts` | Prefill ad hoc |

### Frontend employé
| Fichier | Rôle |
|---------|------|
| `pages/employee/EmployeeTasksPage.tsx` | Liste, start, complete, TTS, דיווח |
| `components/tasks/TaskReferenceMediaDisplay.tsx` | Médias manager |
| `components/tasks/CompletionMediaPreview.tsx` | Preview + transcripts |

### Backend
| Fichier | Rôle |
|---------|------|
| `controllers/task_controller.py` | CRUD, upload, complete, approve, reopen |
| `controllers/ai_controller.py` | task-from-voice, task-tts, transcribe-reference-audio |
| `services/task_template_service.py` | Création templates fixes |
| `services/task_occurrence_service.py` | Ad hoc, complete, approve, reopen, list_mine |
| `services/task_scheduler_service.py` | Génération + rollover |
| `services/blob_storage.py` | Facade R2 / `/uploads` local |
| `services/object_store.py` | PUT/GET/COPY présignés Cloudflare R2 |
| `services/media_upload_service.py` | Validation + upload |
| `services/reference_audio_transcription_service.py` | Audio référence → texte |
| `services/completion_audio_transcription_service.py` | Audio clôture bilingue |
| `domain/completion_media.py` | Règle photo **ou** vidéo |
| `domain/employee_task_carry_over.py` | Rollover jour |

---

## 9. Matrice — état

| Fonctionnalité | État |
|----------------|------|
| Dialog création fixe / ad hoc | ✅ |
| Choix formulaire vs audio en entrée | ✅ |
| Voix manager → champs pré-remplis + שליחה | ✅ |
| Photo / vidéo / audio référence | ✅ |
| Annotation cercle / flèche (image aplatie) | ✅ |
| Audio référence → description | ✅ |
| Traduction titre / description employé | ✅ |
| Médias originaux chez employé | ✅ |
| TTS lecture tâche | ✅ |
| Complétion : photo **ou** vidéo + audio optionnel | ✅ |
| Audio clôture → texte manager + employé | ✅ |
| Revue manager approve / reopen | ✅ |
| Prefill ad hoc depuis דיווח תקלה | ✅ |
| Stockage R2 (+ local `/uploads` en dev) | ✅ |
| Rollover tâches non terminées | ✅ |
| SSE / refresh auto | ✅ |
| Délégation « ממתין להעברה » (création / UI) | ❌ retiré (backend legacy seulement) |

---

## 10. Variables d’environnement

```env
# Audio → texte (voix manager, audio référence, clôture)
GEMINI_API_KEY=

# Traduction + TTS employé
GOOGLE_CLOUD_API_KEY=
GOOGLE_TRANSLATE_SOURCE=he

# Stockage médias — Cloudflare R2 (requis en prod)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
# R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com

# TTS voix par langue (optionnel — défauts dans config.py)
GOOGLE_TTS_VOICE_FR=fr-FR-Neural2-A
```

Sans `GEMINI_API_KEY` : pas de création par voix ni transcriptions audio.  
Sans `GOOGLE_CLOUD_API_KEY` : traduction via LLM ; TTS Google indisponible (repli navigateur hébreu).  
Sans `R2_*` en prod : uploads impossibles. `BLOB_READ_WRITE_TOKEN` est ignoré.
