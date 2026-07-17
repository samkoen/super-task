# זרימת יצירת משימה — מצב נוכחי

> מסמך מיושר לקוד **כפי שהוא עובד היום**.  
> מסלול מוצר (8 נקודות), מחסנית AI, endpoints וכללי עסק.

---

## 1. מסלול מוצר (סיכום)

| # | שלב | התנהגות נוכחית |
|---|-----|-----------------|
| 1 | משימה חדשה | לחיצה → דיאלוג **מילוי שדות ידני** / **יצירה בהקלטה קולית (AI)** (`TaskCreationModeDialog`) |
| 2 | יצירה ב-AI | הקלטה → Gemini → שדות ממולאים מראש → טופס לעריכה → **שליחה** |
| 3 | מדיה של מנהל | תמונה / וידאו / שמע להמחשה — **אופציונליים** |
| 4 | סימון על תמונה | אחרי צילום: עיגולים / אליפסות / חצים ; התמונה **משוטחת** באישור (`PhotoAnnotationCanvas`) |
| 5 | שמע להמחשה | העלאה מיידית → תמלול Gemini → טקסט **נוסף לתיאור** (ניתן לעריכה לפני שליחה) |
| 6 | תצוגת עובד | כותרת + תיאור מתורגמים ; תמונה / וידאו / שמע **מקוריים** של המנהל |
| 7 | סיום עובד | הערה + **תמונה או וידאו חובה** + שמע אופציונלי → סטטוס `pending_review` |
| 8 | שמע בסיום | תמלול **מנהל** (`audio_transcript`) + תמלול **עובד** (`audio_transcript_employee`) |

---

## 2. סוגי משימות ומי יוצר

| סוג | ממשק | מי | שיוך |
|-----|------|-----|------|
| **קבועה** (`fixed`) | « משימה קבועה חדשה » | **branch_manager** בלבד | חובה (עובד של הסניף) |
| **מזדמנת** (`ad_hoc`) | « משימה מזדמנת » | admin / network_manager / branch_manager | חובה ביצירה |

- מנהל רשת / אדמין: בוחרים **סניף** ואז עובד.
- **אין יצירה בלי שיוך**: מסלול « ממתין להעברה » ביצירה הוסר (ה-API `delegate` והדגל `pending_delegation` עדיין קיימים לנתוני legacy, אבל **אין UI** שמשתמש בהם).

### מדיווח תקלה

- `ManagerIssuesPage` → **צור משימה** → `/manager/tasks` עם מילוי מראש למשימה מזדמנת (`issueReportTaskPrefill.ts`).
- הנמען = **המדווח** ; מדיה מהדיווח מועתקת ל-`task_*` ביצירה.

---

## 3. מחסנית AI / שפות

### שמע → טקסט (speech-to-text)

| מקרה | טכנולוגיה | נקודת כניסה |
|------|-----------|-------------|
| יצירת משימה בקול מנהל | **Gemini** מולטימודלי | `POST /api/ai/task-from-voice` · `task_voice_ai_service.py` |
| שמע להמחשה של מנהל → תיאור | **Gemini** | `POST /api/ai/transcribe-reference-audio` · `reference_audio_transcription_service.py` |
| שמע בסיום עובד | **Gemini** | `completion_audio_transcription_service.py` → `audio_transcript` + `audio_transcript_employee` |

> Translate API ו-TTS **אינם** עושים STT. רק **Gemini** לשמע → טקסט.

### טקסט → שמע (TTS)

| מקרה | טכנולוגיה | נקודת כניסה |
|------|-----------|-------------|
| האזנה למשימה אצל עובד | **Google Cloud TTS** | `POST /api/ai/task-tts` · `task_tts_service.py` |
| נפילה לעברית | `window.speechSynthesis` | `useTaskSpeech.ts` |

קורא את `spoken_text` (נגזר מהתרגום).

### תרגום (מנהל → עובד)

| רכיב | פירוט |
|------|--------|
| שירות | Google Cloud Translation v2 (אחרת נפילה ל-Gemini / OpenCode) |
| מקור | `preferred_language` של היוצר / המנהל |
| יעד | `preferred_language` של העובד (`he` · `ar` · `th` · `fr` · `en`) |
| מטמון | `task_occurrence_translations` |
| אוטומטי | `GET /api/tasks/mine`, דשבורד עובד ; נפילה `POST /api/tasks/mine/translate` |

---

## 4. פירוט לפי שלב

### 4.1 בחירה בין טופס לבין קול AI

1. לחיצה על **משימה קבועה** / **משימה מזדמנת**
2. `TaskCreationModeDialog` : ידני או קול
3. ידני → דיאלוג טופס ; קול → `TaskVoiceCreationDialog` ואז טופס ממולא מראש
4. **שליחה** יוצרת את המשימה (שום דבר לא נשמר לפני כן)

קבצים: `ManagerTasksPage.tsx`, `TaskCreationModeDialog.tsx`, `TaskVoiceCreationDialog.tsx`, `TaskVoiceAssistant.tsx`

### 4.2 יצירה בקול AI

- מיקרופון: `useAudioRecorder.ts`
- `aiService.parseTaskFromVoice()` → `POST /api/ai/task-from-voice`
- Gemini → `{ title, description, assignee_name }` (`domain/task_voice.py`)
- שמע המנהל **לא נשמר** ; רק ה-JSON המבני ממלא את הטופס
- אישור חובה דרך **שליחה**

### 4.3 מדיה להמחשה של מנהל

- UI: `TaskReferenceMediaEditor` + `MediaCaptureActions`
- תמונה / וידאו: קבצים מקומיים (`pending_*`) → העלאה ב-**שליחה**
- שמע: העלאה מיד בצילום + תמלול → תיאור
- העלאה: `POST /api/tasks/upload-photo|video|audio`
- שדות: `reference_photo_url`, `reference_video_url`, `reference_audio_url` (תבנית + מופע)
- תבנית → מופע: **העתקה** דרך `blob_storage.copy_media_url` (מדיה מבודדת)

### 4.4 סימון על תמונה

- אחרי צילום תמונה, עורך canvas מקורי (`PhotoAnnotationCanvas` — בלי Fabric)
- כלים: עיגול / אליפסה / חץ
- באישור: תמונת JPEG **משוטחת** (אין JSON של סימונים ב-DB)
- ואז אותו מסלול העלאה כמו שאר התמונות

### 4.5 שמע להמחשה → תיאור

- `TaskReferenceMediaEditor` קורא ל-`aiService.transcribeReferenceAudio`
- Backend: `reference_audio_transcription_service.py` (Gemini, שפת המנהל)
- הטקסט מצורף לתיאור (`appendDescriptionBlock`) ; המנהל יכול לערוך לפני שליחה
- קובץ השמע נשאר זמין לעובד (`reference_audio_url`)

### 4.6 תצוגת עובד

- כותרת / תיאור מתורגמים ; `title_he` נשמר אם השפה ≠ עברית
- מדיה להמחשה **לא מתורגמת** (קבצים מקוריים)
- TTS « האזן »: `spoken_text`
- תג מיום קודם: « לא הושלמה מיום קודם » אם תאריך `created_at` &lt; תאריך `due_at` (אחרי גלגול)

### 4.7 סיום עובד

1. `POST .../start` → `in_progress` (מ-`pending` / `overdue`)
2. דיאלוג: **בוצע** / **לא בוצע** + הערה + מדיה
3. אם **בוצע**: **תמונה או וידאו חובה**, שמע אופציונלי (`domain/completion_media.py`)
4. `POST .../complete` → לעובד מוצלח: סטטוס **`pending_review`**
5. מנהל: `approve` → `completed` ; `reopen` → `in_progress` + `rejection_note`

העלאת סיום: אותם `/api/tasks/upload-*`.  
ביקורת: `TaskCompletionReviewDialog` · תור בדשבורד « ממתין לאישור ».

### 4.8 שמע בסיום — דו-לשוני

- בסיום עם `audio_path`: תמלול Gemini
- `audio_transcript` → שפת **המנהל**
- `audio_transcript_employee` → שפת **העובד**
- תצוגה: ביקורת מנהל + תצוגה מקדימה אצל העובד

---

## 5. APIs ליצירה (לעיון)

קידומת: `/api/tasks`

| פעולה | שיטה | הערות |
|-------|------|--------|
| רשימת תבניות | `GET /templates` | סינון `branch_id` אופציונלי |
| יצירת קבועה | `POST /templates` | `assignee_user_id` חובה ; חזרה `daily` / `weekly` / `biweekly` / `monthly` ; יוצר מופע להיום אם רלוונטי |
| יצירת מזדמנת | `POST /ad-hoc` | `assignee_user_id` + `due_at` חובה ; `photo_required` ברירת מחדל `true` |
| העלאת מדיה | `POST /upload-photo\|video\|audio` | תיקיות `task_photos` / `task_videos` / `task_audio` |
| מופעים למנהל | `GET /occurrences` | + גלגול משימות פתוחות להיום |
| המשימות שלי | `GET /mine` | תרגום אוטומטי ; `due_on` ברירת מחדל = היום |
| התחלה / סיום | `POST /occurrences/{id}/start\|complete` | |
| אישור / פתיחה מחדש | `POST /occurrences/{id}/approve\|reopen` | |
| תזמון ידני | `POST /run-scheduler` | מנהלים |

דיווחים: `POST /api/issue-reports`, העלאות `issue_photos|videos|audio`.

---

## 6. אחסון מדיה

| סביבה | התנהגות |
|-------|----------|
| מוגדר `BLOB_READ_WRITE_TOKEN` | **Vercel Blob** (`blob_storage.put_bytes`) |
| מקומי בלי טוקן | דיסק `/uploads/{folder}/{uuid}{ext}` |
| פרוד בלי טוקן | העלאה נדחית |

- תמונה: דחיסה לפני העלאה (`media_compression.py`)
- מגבלות: תמונה 10MB · וידאו 50MB · שמע 20MB
- קריאה בפרוד: פרוקסי מאומת `GET /api/media/proxy?src=...` (אין static ציבורי)
- שמירה/מחיקה: `MediaRetentionService` + cron `GET/POST /api/cron/purge-media`

---

## 7. גלגול משימות פתוחות

בכל `list_occurrences`, `list_mine`, דשבורד או `run-scheduler`:

- סטטוסים: `pending`, `overdue`, `in_progress`
- אם `due_at` הוא **לפני** תחילת היום הנוכחי (אזור זמן `Asia/Jerusalem`) → `due_at` מקודם ל-**יום הנוכחי** (השעה נשמרת)
- `created_at` לא משתנה (מקור גלוי ב-UI)

---

## 8. מפת קבצים

### Frontend מנהל
| קובץ | תפקיד |
|------|--------|
| `pages/manager/ManagerTasksPage.tsx` | יצירת קבועה / מזדמנת, סינונים, עריכה, ביקורת, מילוי מדיווח |
| `components/tasks/TaskCreationModeDialog.tsx` | בחירה ידני מול קול |
| `components/tasks/TaskVoiceCreationDialog.tsx` | הקלטת AI |
| `components/ai/TaskVoiceAssistant.tsx` | פענוח קול |
| `components/tasks/TaskReferenceMediaEditor.tsx` | מדיה להמחשה + תמלול שמע |
| `components/media/MediaCaptureActions.tsx` | צילום + סימון על תמונה |
| `components/media/PhotoAnnotationCanvas.tsx` | עיגולים / חצים (canvas 2D) |
| `components/tasks/TaskCompletionReviewDialog.tsx` | אישור / פתיחה מחדש |
| `pages/manager/ManagerIssuesPage.tsx` | צור משימה מדיווח |
| `utils/issueReportTaskPrefill.ts` | מילוי מראש למזדמנת |

### Frontend עובד
| קובץ | תפקיד |
|------|--------|
| `pages/employee/EmployeeTasksPage.tsx` | רשימה, התחלה, סיום, TTS, דיווח |
| `components/tasks/TaskReferenceMediaDisplay.tsx` | מדיה של מנהל |
| `components/tasks/CompletionMediaPreview.tsx` | תצוגה מקדימה + תמלולים |

### Backend
| קובץ | תפקיד |
|------|--------|
| `controllers/task_controller.py` | CRUD, העלאה, complete, approve, reopen |
| `controllers/ai_controller.py` | task-from-voice, task-tts, transcribe-reference-audio |
| `services/task_template_service.py` | יצירת תבניות קבועות |
| `services/task_occurrence_service.py` | מזדמנת, complete, approve, reopen, list_mine |
| `services/task_scheduler_service.py` | יצירה + גלגול |
| `services/blob_storage.py` | Blob Vercel / `/uploads` מקומי |
| `services/media_upload_service.py` | אימות + העלאה |
| `services/reference_audio_transcription_service.py` | שמע להמחשה → טקסט |
| `services/completion_audio_transcription_service.py` | שמע בסיום דו-לשוני |
| `domain/completion_media.py` | כלל תמונה **או** וידאו |
| `domain/employee_task_carry_over.py` | גלגול יום |

---

## 9. מטריצה — מצב

| יכולת | מצב |
|-------|-----|
| דיאלוג יצירת קבועה / מזדמנת | ✅ |
| בחירה טופס מול קול בכניסה | ✅ |
| קול מנהל → שדות ממולאים + שליחה | ✅ |
| תמונה / וידאו / שמע להמחשה | ✅ |
| סימון עיגול / חץ (תמונה משוטחת) | ✅ |
| שמע להמחשה → תיאור | ✅ |
| תרגום כותרת / תיאור לעובד | ✅ |
| מדיה מקורית אצל עובד | ✅ |
| TTS האזנה למשימה | ✅ |
| סיום: תמונה **או** וידאו + שמע אופציונלי | ✅ |
| שמע בסיום → טקסט מנהל + עובד | ✅ |
| ביקורת מנהל approve / reopen | ✅ |
| מילוי מזדמנת מדיווח תקלה | ✅ |
| אחסון Blob (+ מקומי בפיתוח) | ✅ |
| גלגול משימות שלא הושלמו | ✅ |
| SSE / רענון אוטומטי | ✅ |
| האצלה « ממתין להעברה » (יצירה / UI) | ❌ הוסר (רק backend legacy) |

---

## 10. משתני סביבה

```env
# שמע → טקסט (קול מנהל, שמע להמחשה, סיום)
GEMINI_API_KEY=

# תרגום + TTS לעובד
GOOGLE_CLOUD_API_KEY=
GOOGLE_TRANSLATE_SOURCE=he

# אחסון מדיה (חובה בפרוד / Vercel)
BLOB_READ_WRITE_TOKEN=
BLOB_ACCESS=private

# קולות TTS לפי שפה (אופציונלי — ברירות מחדל ב-config.py)
GOOGLE_TTS_VOICE_FR=fr-FR-Neural2-A
```

בלי `GEMINI_API_KEY`: אין יצירה בקול ואין תמלולי שמע.  
בלי `GOOGLE_CLOUD_API_KEY`: תרגום דרך LLM ; TTS של Google לא זמין (נפילה לדפדפן בעברית).  
בלי `BLOB_READ_WRITE_TOKEN` בפרוד: אי אפשר להעלות קבצים.
