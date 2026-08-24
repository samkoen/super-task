# Flux PR : GitHub + Origin + Bugbot

GitHub est la source de vérité. Origin (Cursor) est un miroir. Vercel reste branché sur GitHub.

Le remote local `origin` pointe vers GitHub (`samkoen/super-task`). Un `git push` part sur GitHub ; Origin se synchronise tout seul.

## Réglages en place

- Ruleset GitHub `protect-main` (branche `main`, **Active**) :
  - PR obligatoire avant merge
  - pas de suppression de `main`
  - pas de force-push
  - **0** approval obligatoire (compte solo : un 2e reviewer bloquerait le merge)
- Bugbot : **activé**, trigger **Manual only**
- Security review auto : **off**
- PR Routing / auto-approve : **off**

Pas de check `qa-ok`. Le merge, c’est le développeur qui clique après avoir testé.

## 1. Ne jamais coder sur `main`

```bash
git checkout main
git pull
git checkout -b feat/nom-de-la-feature
```

Dans Cursor : demander une branche `feat/…` puis le travail.

## 2. Coder, commit, push

```bash
git add …
git commit -m "…"
git push -u origin feat/nom-de-la-feature
```

Ça part sur GitHub, puis Origin. Pas de push direct sur `main`.

## 3. Ouvrir la PR

- GitHub : **Compare & pull request**, base = `main`
- ou Cursor / Origin : PR vers `main`

La PR apparaît des deux côtés (GitHub ↔ Origin).

## 4. Review IA, à la demande

Sur la PR, un commentaire :

```text
cursor review
```

ou

```text
bugbot run
```

Bugbot ne tourne pas tout seul. Relancer le commentaire seulement si une nouvelle review est utile après corrections.

Corriger, re-push sur **la même branche**. Ne pas merger tout de suite.

## 5. Tests unitaires (en local)

Pas de CI GitHub pour l’instant.

- backend : `pytest` (dans `backend/`)
- frontend : `npm test` (dans `frontend/`)

## 6. Test humain

Lancer l’app et vérifier le flux. Ni Bugbot ni Cursor ne mergent à la place du développeur.

## 7. Merge vers `main`

Sur la PR GitHub (ou Origin) : **Merge**.

`main` se met à jour sur GitHub → Origin sync → Vercel déploie si le projet est toujours lié à GitHub.

## Récap

```text
branche feat/…  →  code + push  →  PR vers main
        →  commentaire "cursor review"  (si besoin)
        →  corriger + re-push
        →  pytest / npm test
        →  test de l’app
        →  Merge
        →  GitHub + Origin + Vercel à jour
```

## À ne pas faire

- Pusher sur `main`
- Remettre Bugbot en **Every Push** (coût à chaque push, ~1–1,50 $ par review)
- Activer **Automatically Approve PRs**
- S’ajouter dans la **Bypass list** du ruleset (ça contourne la PR obligatoire)
- Créer un 2e repo Origin en parallèle de GitHub (les PR Origin-only ne vont pas sur GitHub)

## Facturation Bugbot

Inclus dans le plan Pro via le crédit d’usage mensuel. Une review manuelle ≈ 1–1,50 $. Pas de review = pas de coût Bugbot. Le usage-based billing ne facture du extra qu’après épuisement du crédit inclus, si le paiement à la demande est activé.
