# English Recall Hub — Independent Draft → Card Builder

**Version:** `0.3.3-m2-builder-foundation`

## Ownership

- ChatGPT writes **only** complete DraftNote JSONL to `draft/profiles/manman/inbox/YYYY/MM/YYYY-MM-DD.jsonl`.
- The Node Builder is the sole writer of formal `card` data. It never changes `draft` or `progress`.
- Web/PWA reads manifest, packs and templates as before. The Web client generates recognition/production Cards from formal Notes.

## Run locally

Requires Node.js 22. No new npm dependencies.

```sh
# Three independent local checkouts/worktrees: app from dev, draft from draft, card from card
node --test tests/builder/*.test.mjs
node scripts/recall-builder.mjs --draft-root ../draft --card-root ../card --profile manman --dry-run
node scripts/recall-builder.mjs --draft-root ../draft --card-root ../card --profile manman
# Review card's git diff; commit and push the card branch in ONE commit.
```

## Execution in GitHub Actions

The proposed `.github/workflows/recall-builder.yml` contains **manual** `workflow_dispatch` only and checks out `dev`, `draft`, and `card` separately. It runs Node unit tests, builds the content and commits all card files in one Git commit. The default GitHub token must have `contents: write` and be permitted to push to `card`.

**Activation caveat:** GitHub requires `workflow_dispatch` workflow files on the repository's *default* branch (`main`). A PR to `dev` alone will **not** make the workflow runnable. After reviewing the `dev` Builder change, install **only the workflow file** on `main`, or invoke the Node Builder from an approved external runner. Do not merge all of `dev` into the currently minimal `main` just to activate this workflow. Do not re-enable the old ChatGPT repeating task until this is independently verified.

## Data contract and processing

1. Read all dated JSONL under `draft/profiles/{profile}/inbox/YYYY/MM/` and parse each line independently.
2. Verify exactly 19 required Draft fields, allowed note types, legal pronunciation keys, source fields, `status=new`, quality, and supported template/card type.
3. Load **every** manifest-listed card pack and require counts and dedupe-index mappings to agree; abort on inconsistency before writing.
4. Existing `dedupe_key` + already-linked `draft_id`: skip. Existing key + new source ID: merge provenance/examples/tags while preserving Note ID. New key: create a stable formal Note in an immutable new pack.
5. Update manifest, dedupe index, collections, and builder ledger. GitHub Actions atomically pushes these files in **one commit**; a failed push leaves remote card unchanged.
6. Re-run after failure. Deduplication by `dedupe_key` and `source_draft_ids` makes it idempotent.

Grammar drafts cannot publish until an approved `grammar` template exists on `card`. Cloze, audio URLs, IPA, pronunciation scores, secrets, logs, and progress snapshots are never created. `sha256` remains `null` in new pack metadata; the client must not claim checksum verification.

## Known limitations

- The Builder checks **obvious** type/quality mismatches; nuanced linguistic accuracy still requires upstream Draft review.
- Full-file local edits happen inside the isolated `card` checkout. This avoids ChatGPT Connector whole-file overwrite failures, but not all possible GitHub Actions/push failures.
- `builder-ledger.jsonl` still grows; large-scale ledger rotation and legacy audit repair are deferred.
- Currently `main` does not host the workflow; **no scheduled or automatic publishing has been activated**.
