# Super — תעודות משלוח (arrivage + סחורה פגומה)

> Design uniquement — **aucun code dans ce document**  
> Branche : `feat/delivery-notes`  
> Date : 18 août 2026  
> Exemple source : `mishloah.pdf` (scan Visioneer OneTouch)

Complément ciblé de `PRODUCTS-FEATURES.md` (vision Comex / תעודות כניסה).  
Cette spec décrit le **MVP PDF-first** : lire des תעודות משלוח, les ventiler par סניף, comptabiliser ce qui est arrivé, et ce qui était פגום.

---

## 1. Lecture du document d’exemple

Le PDF n’a **aucune couche texte** (scan). En-tête lu sur l’image :

| Champ | Valeur extraite |
|--------|-----------------|
| Fournisseur | ביכורי השדה צפון 1994 ג.ד. בע"מ |
| Type | תעודת משלוח **2289123** |
| Date | 18/08/26 |
| Destinataire | סופר רמת אהרון **(231)** |
| Adresse | צמח צדק 4, לוד |
| Logistique | רמפה 2 · מחסן טריים · נהג · מספר משאית |
| Commande | הזמנה 831155 · קו הפצה לוד רמלה |
| Totaux | 33 שורות · 110 אריזות · 1 157 ק"ג נטו · 1 283 ק"ג ברוטו |

Colonnes de lignes (RTL) : משטח · חיצוני · תוצרת/זן · גודל · איכות · אריזה · כמות · משקל נטו · מחיר · סה״כ.

**Constats pour le design :**

1. **Une תעודה = un סניף.** Le multi-magasin dont tu parles, c’est un **PDF (ou lot) qui contient plusieurs תעודות**, pas une seule grille mixte. Le parser découpe en N notes.
2. **Il n’y a pas de colonne « פגום »** sur le papier. Le cassé est un **événement Super**, saisi par l’עובד à la réception.
3. Le tampon כשרות au milieu **cache des cellules** → l’OCR ne sera jamais 100 %. Revue humaine obligatoire avant de comptabiliser.
4. L’unité métier du reporting mensuel (tonnes / kg) est le **משקל**, pas seulement le nombre d’ארגזים. On stocke les deux.

---

## 2. Positionnement

### Ce que ce MVP fait

```
PDF scanné → extraction (Gemini vision) → 1..N תעודות par סניף
  → matching סניף + מוצר
  → revue manager
  → réception עובד (OK / פגום)
  → agrégat mensuel : הגיע vs מקולקל
```

Exemple cible (fin de mois) :

> סניף ברוק — עגבניה : 7 000 ק"ג הגיעו, מתוכם 700 ק"ג מקולקל (10 %).

### Ce que ce MVP ne fait pas (volontairement)

| Hors scope | Raison |
|------------|--------|
| Comex / EDI / חותמת אדומה | Déjà spécifié dans `PRODUCTS-FEATURES.md` — autre source d’ingestion, plus tard |
| Pré-validation « הזמנו / לא הזמנו » ligne par ligne | Besoin distinct (anti « לדחוף סחורה ») |
| Stock magasin / inventaire | Pas demandé |
| Une משימה par ligne produit | Trop bruyant (33 tâches pour cet exemple) |

Les deux specs **convergent** : `DeliveryNote` d’aujourd’hui pourra plus tard être alimenté par Comex autant que par PDF.

---

## 3. Flux métier

```
[מנהל רשת / מנהל סניף]
    upload PDF (1 ou N pages, 1 ou N תעודות)
        │
        ▼
[DeliveryDocument] status = parsing
        │
        ▼
[Gemini vision, page par page] → JSON structuré
        │
        ▼
[domain] split par (note_number, store_code/name)
        │
        ├── match branch  (code 231 / alias / nom)
        └── match product (nom + SKU fournisseur)
        │
        ▼
status = needs_review  ──► manager corrige unmatched
        │
        ▼
status = confirmed  ──► 1 משימה ad hoc « קליטת משלוח » par תעודה
        │                    (warehouse_worker / stockers du סניף)
        ▼
[עובד] ouvre la תעודה
    pour chaque ligne :
      - reçu conforme, ou
      - פגום : qty et/ou kg + photo + motif
        │
        ▼
status = received
        │
        ▼
[דוח חודשי] SUM(arrived) / SUM(damaged) par סניף × מוצר
```

**Idempotence** : même `supplier + note_number` → pas de doublon (ré-upload = upsert + alerte).

---

## 4. Modèle de données

### 4.1 `delivery_documents` — fichier source

| Champ | Rôle |
|-------|------|
| `network_id` | Périmètre רשת |
| `uploaded_by_id` | Acteur |
| `file_url` | Blob (PDF) |
| `page_count` | Pages rendues pour l’OCR |
| `status` | `uploaded` → `parsing` → `parsed` → `needs_review` → `confirmed` / `failed` |
| `parse_error` | Message si échec |
| `raw_extraction_json` | Sortie modèle, audit |

### 4.2 `delivery_notes` — une תעודת משלוח (= un סניף)

| Champ | Rôle |
|-------|------|
| `document_id` | FK fichier |
| `branch_id` | Nullable tant que unmatched |
| `supplier_name` | ביכורי השדה צפון… |
| `note_number` | `2289123` (unique avec supplier) |
| `delivery_date` | Date sur la תעודה |
| `store_name_raw` / `store_code_raw` | « סופר רמת אהרון » / `231` |
| `order_number` | `831155` |
| `driver_name`, `truck_plate`, `warehouse_label` | Logistique, informatif |
| `total_lines`, `total_packages`, `net_weight_kg`, `gross_weight_kg`, `amount` | Totaux pied de page |
| `status` | `pending_review` → `awaiting_receipt` → `received` |
| `match_confidence` | 0–1, pour trier les cas douteux |

Contrainte unique : `(supplier_name_normalized, note_number)`.

### 4.3 `delivery_note_lines` — ligne produit

**Quantités « papier » (immuables après confirmation) :**

| Champ | Exemple |
|-------|---------|
| `product_name_raw` | מלפפון / ענבים / אבוקדו |
| `variety`, `size`, `quality`, `packaging` | זן, XL, בד״ץ, ארגז קטן |
| `pallet_id`, `external_code` | משטח, קוד ספק |
| `quantity` | מספר אריזות |
| `net_weight_kg` | משקל נטו |
| `unit_price`, `line_total` | optionnel (reporting financier plus tard) |
| `product_id` | FK nullable après matching |

**Quantités « terrain » (saisies par l’עובד) :**

| Champ | Règle |
|-------|--------|
| `received_quantity` / `received_weight_kg` | Défaut = papier. Modifiable si manquant (חוסר) — V1.1 |
| `damaged_quantity` / `damaged_weight_kg` | 0 par défaut. `≤ received` |
| `damage_reason` | `rotten` / `crushed` / `overripe` / `other` |
| `damage_notes` | Texte libre hébreu |
| `damage_photo_url` | Même pipeline média que les issues |
| `damage_reported_by_id` / `damage_reported_at` | Traçabilité |

Règle domaine : `damaged_weight_kg ≤ received_weight_kg` (idem quantité).  
**Arrivé comptable** = `received_weight_kg` (ou `net_weight_kg` si réception non encore saisie, selon le rapport : voir § 6).

### 4.4 `branch_aliases` — matching magasin

Le PDF dit `סופר רמת אהרון (231)`. Super a aujourd’hui `branches.name` **sans code fournisseur**.

| Champ | Rôle |
|-------|------|
| `branch_id` | סניף Super |
| `supplier_name` | Optionnel (code différent selon ספק) |
| `external_code` | `231` |
| `alias` | « רמת אהרון », « סופר רמת אהרון », « ברוק » |

Sans cette table, le matching cassera dès le 2ᵉ fournisseur.

### 4.5 Produits

Pas de catalogue national aujourd’hui (`Product` est rattaché à une מחלקה d’un סניף).  
Matching V1 : nom normalisé (espaces, ״, final ם/ן) contre les produits **actifs du סניף** (rayon ירקות en priorité d’après le fournisseur).

Si inconnu : ligne `unmatched`, **pas** de création automatique de produit dans le MVP (évite le bruit). Le manager peut lier ou ignorer.  
Création brouillon = phase 2 (déjà prévue dans `PRODUCTS-FEATURES.md`).

---

## 5. Extraction (OCR / vision)

Le client Gemini **sait déjà** envoyer un binaire (`generate_from_audio` : `inline_data`). On ajoute le même pattern pour `image/png` / `application/pdf`.

**Pipeline :**

1. Upload PDF → blob (`delivery_notes/` folder).
2. Rasteriser chaque page (PyMuPDF côté worker) → PNG haute résolution.
3. Appel Gemini **structured output** (JSON schema), température basse.
4. Validation domaine (totaux, types numériques, store code).
5. Si `page_count > 1` : fusionner les pages qui partagent le même `note_number`, sinon N notes.

**Schéma JSON attendu (par page) :**

```json
{
  "supplier_name": "",
  "note_number": "",
  "delivery_date": "YYYY-MM-DD",
  "store_name": "",
  "store_code": "",
  "order_number": "",
  "totals": { "lines": 0, "packages": 0, "net_weight_kg": 0, "gross_weight_kg": 0 },
  "lines": [
    {
      "product_name": "",
      "size": "",
      "packaging": "",
      "quantity": 0,
      "net_weight_kg": 0
    }
  ]
}
```

**Garde-fous :**

- Jamais `confirmed` sans revue si `match_confidence < seuil` ou totaux page ≠ somme des lignes.
- Tampon / scan flou → `needs_review` + highlights des champs `null`.
- Timeout / quota Gemini → `failed` + retry manuel.

Tests unitaires du parser : **fixtures JSON** (sortie modèle), pas d’appel réseau.  
Un test d’intégration optionnel sur `mishloah.pdf` (marqué skip CI si pas de clé).

---

## 6. Comptabilité arrivé / פגום

Deux agrégats, jamais mélangés :

| Métrique | Formule | Usage |
|----------|---------|--------|
| **הגיע (arrivé)** | `SUM(received_weight_kg)` des notes `received` du mois ; si une note est encore `awaiting_receipt`, elle n’entre **pas** dans le rapport « clôturé » | Tonnes reçues |
| **פגום (abîmé)** | `SUM(damaged_weight_kg)` | Cassé documenté |
| **שיעור פגום** | `damaged / arrived` (0 si arrived = 0) | % |

Dimensions : `branch_id` × `product_id` (ou `normalized_product_name` si unmatched) × mois calendaire (`delivery_date`).

**Unité d’affichage :** kg (et tonnes si ≥ 1000). La כמות (ארגזים) est un second axe, pas le primaire du rapport « 7 טון ».

**Photo פגום :** obligatoire si `damaged_weight_kg > 0` (configurable). Réutilise `media_upload_service` + dossier `delivery_damage_photos`.

---

## 7. UI (hébreu, `he.ts`)

| Écran | Rôle | Contenu |
|-------|------|---------|
| `/manager/deliveries` | network / branch manager | Upload PDF, liste documents, statuts parsing |
| `/manager/deliveries/:id` | idem | Revue : notes extraites, matching סניף, lignes unmatched |
| `/employee` (détail משימה קליטה) **ou** `/employee/deliveries/:noteId` | warehouse_worker, stockers | Lignes + bouton « סחורה פגומה » |
| Onglet dans `/manager/reports` | managers | Période + סניף + tableau מוצר / הגיע / פגום / % |

**Mשימה d’entrée :** une seule occurrence ad hoc par תעודה confirmée :

- Titre : `קליטת משלוח — {supplier} #{note_number}`
- Assignée au `warehouse_worker` du סניף, sinon `stockers`
- Lien `delivery_note_id` (colonne nullable sur `task_occurrences`)
- Compléter la tâche = toutes les lignes traitées (OK ou פגום saisi)

Pas de FAB ni de texte dur : tout passe par `i18n/he.ts`.

---

## 8. Permissions

| Action | admin | network_manager | branch_manager | warehouse_worker / stockers | autre עובד |
|--------|-------|-----------------|----------------|------------------------------|------------|
| Upload PDF multi-סניף | ✅ | ✅ | ✅ (son סניף seulement ; notes d’autres magasins → unmatched) | ❌ | ❌ |
| Confirmer matching | ✅ | ✅ | ✅ son סניף | ❌ | ❌ |
| Saisir פגום | ✅ | ✅ | ✅ | ✅ son סניף | ❌ |
| Voir דוח mensuel | ✅ | ✅ tout le réseau | ✅ son סניף | ❌ | ❌ |

Périmètre : réutiliser `domain/scope.py`. Un PDF réseau qui contient רמת אהרון + ברוק crée deux `delivery_notes` ; chaque מנהל סניף ne voit que la sienne.

---

## 9. Architecture modules (cible)

```
backend/app/
  models/delivery_document.py
  models/delivery_note.py
  models/delivery_note_line.py
  models/branch_alias.py
  domain/delivery_note_status.py
  domain/delivery_extraction.py      # split, totaux, idempotence
  domain/delivery_matching.py        # branch + product
  domain/delivery_damage.py          # bornes qty/kg
  domain/delivery_monthly_report.py  # agrégats purs
  services/delivery_document_service.py
  services/delivery_receipt_service.py
  services/delivery_parse_service.py # orchestration OCR
  repositories/delivery_note_repository.py
  controllers/delivery_note_controller.py
  integrations/delivery_ocr/gemini_vision.py

frontend/src/
  pages/manager/ManagerDeliveriesPage.tsx
  pages/manager/ManagerDeliveryReviewPage.tsx
  pages/employee/EmployeeDeliveryReceiptPage.tsx
  components/deliveries/
  services/deliveryNoteService.ts
  hooks/useDeliveryDamageForm.ts
```

API ébauche :

| Méthode | Route |
|---------|--------|
| POST | `/api/delivery-documents` (multipart PDF) |
| GET | `/api/delivery-documents` |
| GET | `/api/delivery-documents/{id}` |
| POST | `/api/delivery-documents/{id}/confirm` |
| GET | `/api/delivery-notes` (filtre branch, date, status) |
| GET | `/api/delivery-notes/{id}` |
| PATCH | `/api/delivery-notes/{id}/lines/{line_id}/damage` |
| POST | `/api/delivery-notes/{id}/complete-receipt` |
| GET | `/api/reports/deliveries` (période, branch_id) |

---

## 10. Phases d’implémentation

| Phase | Livrable | Tests (DoD) |
|-------|----------|-------------|
| **0 — fondations** | Tables + aliases + statuts domain | matching code `231` → branch ; unmatched si inconnu |
| **1 — ingest PDF** | Upload, raster, Gemini JSON, split N notes | fixture 1 page 1 magasin ; fixture 2 pages 2 magasins ; doublon note_number |
| **2 — revue** | Écran matching + confirm | permission branch_manager ne voit pas l’autre סניף |
| **3 — פגום** | Saisie qty/kg + photo ; 1 משימה קליטה | damage > received → ValueError ; ligne vide → 0 |
| **4 — דוח** | Agrégat mensuel kg / % | ברוק 7000 / 700 → 10 % ; période vide |

Aucune phase « plus tard » : chaque phase livrée **avec** tests unitaires (règle workspace).

---

## 11. Décisions proposées (à valider)

| # | Proposition | Alternative |
|---|-------------|-------------|
| D1 | PDF-first, Comex plus tard sur les **mêmes** tables | Attendre Comex (bloquant) |
| D2 | 1 משימה par תעודה, pas par ligne | Tout dans un écran hors משימות |
| D3 | Photo obligatoire si פגום | Photo optionnelle |
| D4 | Rapport clôturé = notes `received` seulement | Inclure le papier dès `confirmed` (gonfle « הגיע » avant contrôle) |
| D5 | Pas de création auto de `Product` | Draft automatique (plus de bruit) |
| D6 | `branch_aliases` dès le MVP | Matcher uniquement sur `branches.name` (fragile) |

---

## 12. Questions ouvertes client

1. Qui uploade le PDF au quotidien — מנהל רשת, מחסנאי, ou les deux ?
2. Un PDF « tournée » contient-il vraiment **plusieurs** תעודות (pages), ou plutôt un fichier par magasin ?
3. Faut-il aussi saisir un **חוסר** (arrivé < papier), ou seulement le פגום ?
4. Le % פגום sert-il à une réclamation fournisseur (crédit), ou uniquement au pilotage interne ?
5. Code magasin `(231)` : le même code chez tous les ספקים, ou table d’alias par fournisseur ?

---

## 13. Critères d’acceptation MVP

- [ ] Upload d’un scan type `mishloah.pdf` → une `delivery_note` pour רמת אהרון (ou unmatched + assignation manuelle)
- [ ] PDF 2 תעודות → 2 notes, chacune rattachée au bon סניף
- [ ] עובד documente 700 ק"ג פגום sur une ligne ; le mensuel du סניף affiche הגיע / פגום / %
- [ ] Ré-upload de la même תעודה 2289123 → pas de double comptage
- [ ] UI 100 % `he.ts`, périmètre rôle, tests nominal + limite
