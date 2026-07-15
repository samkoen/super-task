# Flux création de tâche — cible produit & état du code

> Document de cadrage **sans implémentation**.  
> Objectif : décrire le parcours visé (8 points produit) et indiquer ce qui **existe déjà** (~90 %) vs ce qu’il reste à **ajuster ou ajouter**.

---

## 1. Parcours cible (résumé produit)

| # | Étape | Comportement attendu |
|---|--------|----------------------|
| 1 | Nouvelle tâche | Au clic « nouvelle tâche », choix entre **formulaire manuel** ou **création par audio (IA)** |
| 2 | Création IA | Enregistrement vocal → transcription → champs pré-remplis → retour au formulaire → le manager **confirme avec שליחה** |
| 3 | Médias manager | Photo / vidéo / audio de référence optionnels |
| 4 | Annotation photo | Sur une photo ajoutée, possibilité d’ajouter **cercle(s)** et/ou **flèche(s)** pour pointer la zone concernée |
| 5 | Audio référence manager | L’audio est transcrit en texte et **ajouté à la description** |
| 6 | Vue employé | Titre + description dans **sa langue** ; photo / vidéo / audio **originaux** du manager |
| 7 | Clôture employé | Texte + photo + vidéo + audio en fin de tâche |
| 8 | Audio clôture employé | Audio → texte ; employé le voit dans **sa langue** ; manager dans **sa langue** |

---

## 2. Stack IA / langues (ce qu’on utilise)

### Audio → texte (speech-to-text)

| Cas d’usage | Service | Technologie | Config / fichiers |
|-------------|---------|-------------|-------------------|
| **Création tâche par voix manager** | Transcription + extraction structurée en une passe | **Google Gemini** (multimodal audio) | `GEMINI_API_KEY` · `POST /api/ai/task-from-voice` · `task_voice_ai_service.py` · `domain/task_voice.py` · `services/ai/gemini_client.generate_from_audio()` |
| **Audio de clôture employé** | Transcription (et traduction vers langue manager) | **Google Gemini** | `GEMINI_API_KEY` · `completion_audio_transcription_service.py` · `domain/completion_audio_transcription.py` · champ DB `task_completions.audio_transcript` |
| **Audio de référence manager → description** | ❌ **Non implémenté** | À définir : réutiliser le même pattern Gemini que ci-dessus | Même infra que clôture employé, déclenché à l’upload audio référence |

> **Note :** Translate API et TTS **ne font pas** de speech-to-text. Seul **Gemini** est utilisé aujourd’hui pour l’audio → texte.

### Texte → audio (text-to-speech)

| Cas d’usage | Service | Technologie | Config / fichiers |
|-------------|---------|-------------|-------------------|
| **Lecture tâche côté employé** (bouton écouter) | TTS serveur | **Google Cloud Text-to-Speech** | `GOOGLE_CLOUD_API_KEY` · `POST /api/ai/task-tts` · `task_tts_service.py` · `google_tts_client.py` · voix par langue dans `config.py` (`GOOGLE_TTS_VOICE_*`) |
| **Repli hébreu** | TTS navigateur | `window.speechSynthesis` | `frontend/src/hooks/useTaskSpeech.ts` |

Le TTS lit le champ `spoken_text` (phrase naturelle dérivée de la traduction).

### Traduction texte (manager → employé)

| Cas d’usage | Service | Technologie | Config / fichiers |
|-------------|---------|-------------|-------------------|
| **Titre + description tâche** pour l’employé | Traduction avec cache DB | **Google Cloud Translation API v2** (prioritaire) | `GOOGLE_CLOUD_API_KEY` · `task_translation_service.py` · `google_translate_client.py` |
| **Repli si pas de clé Google** | Traduction LLM | **Gemini / OpenCode** via `generate_text()` | `AI_PROVIDER` · `task_translation_service._translate_batch_ai()` |
| **Langue source** | Langue du manager créateur | `users.preferred_language` du `created_by_id` / `manager_user_id` | `domain/task_translation_source.py` · repli `GOOGLE_TRANSLATE_SOURCE` (défaut `he`) |
| **Langue cible** | Langue employé | `users.preferred_language` | `he` · `ar` · `th` · `fr` · `en` |
| **Cache** | Évite re-traduire | Table `task_occurrence_translations` + hash source | migration `a014_task_translations.py` |

Endpoints / flux :
- Dashboard employé et `GET /api/tasks/mine` : traduction auto au chargement (`apply_to_cards_translated`, `apply_to_occurrences_translated`)
- Repli frontend : `POST /api/tasks/mine/translate`

---

## 3. Détail par étape — existe vs à faire

### 3.1 Choix « formulaire » vs « audio IA » (point 1)

**Existe :**
- Deux types de tâches : **fixe (récurrente)** et **ad hoc** (`ManagerTasksPage.tsx`)
- Dialogs création avec tous les champs (branche, titre, description, assigné, récurrence / échéance)
- Composant voix **`TaskVoiceAssistant`** déjà intégré **dans** les dialogs (pas en amont)

**À faire (UX) :**
- Au clic « nouvelle tâche », afficher un **écran de choix** :
  - « Remplir les champs » → ouvre le dialog formulaire actuel
  - « Créer par audio (IA) » → enregistrement d’abord, puis formulaire pré-rempli
- Aujourd’hui voix + formulaire sont **mélangés** dans le même dialog ; il faut **séparer l’intention** sans supprimer le formulaire éditable après l’IA

**Fichiers concernés :** `frontend/src/pages/manager/ManagerTasksPage.tsx`, éventuellement nouveau composant `TaskCreationModeDialog.tsx`

---

### 3.2 Création par audio IA (point 2)

**Existe :**
- Enregistrement micro navigateur : `useAudioRecorder.ts`
- Envoi multipart : `aiService.parseTaskFromVoice()` → `POST /api/ai/task-from-voice`
- Backend : `TaskVoiceAiService.parse_voice_message()` → Gemini audio → JSON `{ title, description, assignee_name }`
- Prompt strict « transcrire sans inventer », langue du manager : `domain/task_voice.py`
- Remplissage auto titre / description / assigné via callback `onFilled`
- Le manager **doit encore cliquer שליחה** (`handleCreateFixed` / `handleCreateAdHoc`) — comportement déjà conforme

**À faire :**
- Parcours en 2 temps (choix → enregistrement → formulaire) au lieu de voix inline
- Optionnel : afficher le **transcript brut** avant/après remplissage (aujourd’hui seul le JSON structuré est utilisé ; l’audio manager **n’est pas persisté**)

**Comment audio → texte aujourd’hui :** Gemini reçoit le blob audio et renvoie directement titre + description structurés (transcription implicite dans le prompt, pas d’étape STT séparée).

---

### 3.3 Médias photo / vidéo / audio manager (point 3)

**Existe :**
- UI upload + capture : `TaskReferenceMediaEditor.tsx` + `MediaCaptureActions.tsx`
- Preview avant confirmation (comme manager)
- Upload : `POST /api/tasks/upload-photo|video|audio`
- Stockage local `/uploads/` (task_photos, task_videos, task_audio)
- Champs DB : `reference_photo_url`, `reference_video_url`, `reference_audio_url` sur **template** et **occurrence**
- Migrations : `a015_task_reference_media.py`, `a016_task_reference_audio.py`
- Copie template → occurrence : `domain/task_reference_media.py`, scheduler, sync au GET occurrence
- Affichage employé : `TaskReferenceMediaDisplay.tsx` dans `EmployeeTasksPage.tsx`

**À faire :** surtout branchement UX avec le nouvel écran de choix ; le reste est en place.

---

### 3.4 Annotation photo — cercles / flèches (point 4)

**Existe :** ❌ **Rien**

- Pas de composant d’annotation
- Pas de champ DB pour métadonnées (coordinates, type shape)
- Seul usage canvas : capture frame vidéo → JPEG (`utils/mediaCapture.ts`)

**À faire (nouveau) :**
- Éditeur image après upload photo (canvas / lib type fabric.js ou konva)
- Outils : cercle, flèche (au minimum)
- Persistance : soit image **aplati** (PNG exporté remplace l’originale), soit JSON d’annotations + image source
- Endpoint upload ou POST annotation dédié
- Affichage employé : image annotée (ou overlay)

---

### 3.5 Audio référence manager → texte dans description (point 5)

**Existe :**
- Upload audio référence (`reference_audio_url`)
- Lecture audio côté employé

**N’existe pas :**
- Transcription de l’audio **référence** manager
- Concaténation automatique dans `description`

**À faire :**
- À l’upload (ou à la שליחה), appeler un service type `transcribe_reference_audio()` — **même pattern** que `completion_audio_transcription_service.py` (Gemini)
- Langue cible : langue du **manager** (`preferred_language` ou hébreu)
- Ajouter le texte à `description` (avec séparateur clair) ; le manager peut éditer avant envoi
- Réutiliser `upload_url_to_path()` et `generate_from_audio()`

---

### 3.6 Vue employé — traduction + médias originaux (point 6)

**Existe :**
- Traduction titre / description : `TaskTranslationService` + dashboard / list_mine
- Langue source = langue manager ; cible = `preferred_language` employé (ex. Shira → `fr`)
- Médias référence **non traduits** (originaux) : photo / vidéo / audio manager
- TTS bouton « écouter la tâche » : `useTaskSpeech.ts` + `spoken_text`
- Champ `title_he` conservé pour référence si langue ≠ hébreu
- Langue employé configurable : `ManagerEmployeesPage` (admin/manager) · `users.preferred_language`

**À faire / limites actuelles :**
- S’assurer que la traduction tourne aussi pour **toutes** les vues employé (déjà corrigé récemment sur dashboard + `/tasks/mine`)
- **Audio référence manager** : aujourd’hui pas de transcript affiché à l’employé (seulement le fichier audio) — à ajouter si point 5 implémenté (transcript traduit comme la description)

---

### 3.7 Clôture employé — texte + médias (point 7)

**Existe :**
- Flux : `start` → `in_progress` → dialog complétion avec **note texte** + photo / vidé / audio
- `MediaCaptureActions` + preview (`CompletionMediaPreview.tsx`) avant **שליחה**
- Upload completion : mêmes endpoints `/tasks/upload-*`
- Soumission : `POST /api/tasks/occurrences/{id}/complete` (async)
- Statut **`pending_review`** (pas `completed` direct) si soumission employé réussie
- `photo_required` : blocage si photo manquante quand requis
- Champ `not_completed_reason` si tâche non faite

**Existe aussi (non listé initialement) :**
- **Revue manager** : `TaskCompletionReviewDialog` — voir soumission, **אישור וסגירה** / **פתיחה מחדש**
- Endpoints : `POST .../approve`, `POST .../reopen`
- Migration `a017_task_completion_review.py` · statuts `pending_review`, `REVIEW_PENDING/APPROVED/REJECTED`
- File « ממתין לאישור » dashboard manager : `TaskQueuePanel.tsx`
- Note de rejet visible employé : `completion.rejection_note`
- Notifications SSE temps réel : `events_controller.py`, `useTaskChangeListener` (rafraîchissement auto listes)

---

### 3.8 Audio clôture employé → texte bilingue (point 8)

**Existe :**
- À la complétion avec `audio_path` : `transcribe_completion_audio()` (Gemini)
- Résultat stocké : `task_completions.audio_transcript`
- **Langue du transcript aujourd’hui : langue du manager** (pas celle de l’employé)
- Affichage manager : `TaskCompletionReviewDialog` + `CompletionMediaPreview` avec `audio_transcript`
- Prompt : `domain/completion_audio_transcription.py` — « employee may speak any language → write in manager language »

**À faire pour coller au point 8 :**
- **Employé** : afficher le transcript **dans sa langue** (traduction à la volée ou double stockage `audio_transcript_employee` / traduction Google au read)
- **Manager** : garder l’existant (transcript langue manager) — déjà OK
- Option : concaténer le transcript au champ `note` employé côté UI (aujourd’hui champ séparé `audio_transcript`)

**Techno recommandée (alignée codebase) :**
- Transcription : **Gemini** (existant)
- Traduction transcript employé : **Google Translate** (existant) ou Gemini

---

## 4. Cartographie fichiers (référence rapide)

### Frontend manager
| Fichier | Rôle |
|---------|------|
| `pages/manager/ManagerTasksPage.tsx` | Création / édition / délégation / revue |
| `components/ai/TaskVoiceAssistant.tsx` | Enregistrement + appel IA création |
| `components/tasks/TaskReferenceMediaEditor.tsx` | Upload médias référence |
| `components/media/MediaCaptureActions.tsx` | Capture photo/vidéo/audio + preview |
| `components/tasks/TaskCompletionReviewDialog.tsx` | Revue soumission employé |

### Frontend employé
| Fichier | Rôle |
|---------|------|
| `pages/employee/EmployeeTasksPage.tsx` | Liste, traduction, complétion, TTS |
| `components/tasks/TaskReferenceMediaDisplay.tsx` | Médias manager (originaux) |
| `components/tasks/CompletionMediaPreview.tsx` | Preview soumission + transcript |

### Backend
| Fichier | Rôle |
|---------|------|
| `controllers/task_controller.py` | CRUD tâches, upload, complete, approve, reopen, translate |
| `controllers/ai_controller.py` | task-from-voice, task-tts |
| `services/task_voice_ai_service.py` | Voix manager → brouillon |
| `services/task_translation_service.py` | Traduction employé |
| `services/task_tts_service.py` | TTS employé |
| `services/completion_audio_transcription_service.py` | Audio clôture → texte manager |
| `services/task_occurrence_service.py` | complete, approve, reopen, list_mine |
| `services/dashboard_service.py` | Dashboard employé traduit |

---

## 5. Synthèse — matrice existe / à faire

| Fonctionnalité | État | Priorité UX |
|----------------|------|-------------|
| Dialog création fixe / ad hoc | ✅ Existe | — |
| Choix formulaire vs audio en entrée | ⚠️ À refaire (UX) | Haute |
| Voix manager → champs pré-remplis | ✅ Existe | Ajuster parcours |
| Confirmation שליחה après IA | ✅ Existe | — |
| Photo / vidéo / audio référence | ✅ Existe | — |
| Annotation cercle / flèche | ❌ Absent | Nouveau |
| Audio référence → description | ❌ Absent | Moyenne |
| Traduction titre/description employé | ✅ Existe | — |
| Médias originaux chez employé | ✅ Existe | — |
| TTS lecture tâche employé | ✅ Existe | — |
| Complétion texte + médias employé | ✅ Existe | — |
| Audio clôture → texte manager | ✅ Existe | — |
| Audio clôture → texte langue employé | ⚠️ Partiel | Moyenne |
| Revue manager approve / reopen | ✅ Existe | — |
| SSE / refresh auto | ✅ Existe | — |
| Cache traductions | ✅ Existe | — |
| Délégation network manager | ✅ Existe | — |

---

## 6. Variables d’environnement (checklist déploiement)

```env
# Audio → texte (création voix manager + clôture employé)
GEMINI_API_KEY=

# Traduction + TTS employé
GOOGLE_CLOUD_API_KEY=
GOOGLE_TRANSLATE_SOURCE=he   # repli si auteur inconnu

# TTS voix par langue (optionnel, défauts dans config.py)
GOOGLE_TTS_VOICE_FR=fr-FR-Neural2-A
# ...
```

Sans `GEMINI_API_KEY` : pas de création par voix ni transcription audio clôture.  
Sans `GOOGLE_CLOUD_API_KEY` : traduction via LLM (plus lent) ; TTS Google indisponible (repli navigateur pour hébreu).

---

## 7. Ordre d’implémentation suggéré (quand on codera)

1. **UX choix** formulaire / audio (point 1–2) — faible risque, gros gain clarté  
2. **Audio référence → description** (point 5) — réutilise Gemini existant  
3. **Transcript clôture langue employé** (point 8) — traduction Google  
4. **Annotation photo** (point 4) — seul gros morceau net-new (UI + persistance)

Les points 3, 6, 7 et la revue manager sont **déjà opérationnels** ; des ajustements UX peuvent suffire.
