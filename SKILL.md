---
name: qsf-file-convertor
description: Convert questionnaire documents (docx, pdf, txt, md) into import-safe Qualtrics QSF files and import them into Qualtrics. Use whenever the user wants to turn a survey/questionnaire file into a Qualtrics online survey, mentions QSF or Qualtrics import, or asks to batch-create online surveys from questionnaire documents — even if they never say "QSF".
---

# QSF File Convertor

Turn a questionnaire document into a Qualtrics-importable `.qsf` file. Every payload pattern was verified by real Qualtrics imports (2026-10 round-trip tests; a 10-survey / 120-question batch test on 2026-10-13 passed 10/10 imports with 10/10 verbatim verifications). The public QSF assets contain synthetic examples and placeholder account settings — use a real export from the destination account as the boilerplate source (see step 3).

## Workflow

1. **Extract** the questionnaire into a structured list: blocks, questions (type, text, choices, matrix rows/columns, logic notes).
   - docx: python-docx or unzip + parse `word/document.xml` (paragraphs AND table cells).
   - pdf: use the convert-pdf-to-md skill first.
   - txt/md: read directly.
2. **Map** question types:
   - single-choice → `MC/SAVR`; multi-choice → `MC/MAVR`
   - "Other: ____" → choice `{"Display":"Other:","TextEntry":"true"}`
   - Likert grid / "mark one per row" table → `Matrix/Likert/SingleAnswer` (table rows = Choices, columns = Answers)
   - open essay box → `TE/ML`; labeled input fields → `TE/FORM` (labels = Choices)
   - instructions, headings, thank-you text → `DB/TB`
3. **Generate** the QSF: use a small QSF export supplied from the destination Qualtrics account for the skeleton and boilerplate (Tools → Import/Export → Export survey on any tiny survey); use `assets/template-boilerplate.qsf` only as a structural reference; emit SQ payloads per `references/question-payloads.md`. For questionnaires already in the raw-md convention (below), `scripts/md2qsf.mjs --boilerplate <account-export.qsf>` converts and self-checks in one step — round-trip validated on 10 surveys / 120 questions with 10/10 verified imports (2026-10-13).

   Raw-md convention: `# Title`, intro lines, `Q1. (single|multi|matrix|essay|form) text`, `- choice` bullets, `- Other: (text entry)`, `Rows:`/`Columns:` for matrix, `Fields:` for form, standalone `[Page break]`, `[Shown only if Q2 = "Choice text"]` under a question for DisplayLogic, closing line.
4. **Validate** locally before handoff: JSON parses; every `BlockElements` ref exists in the SQ set; `QC.SecondaryAttribute` = question count; all hard rules below hold; question/choice texts diff verbatim against the source document.
5. **Import** and verify per `references/import-and-fallbacks.md`.

## Hard rules (violations proven to break import)

- `QuestionDescription` must be truncated `plainText.slice(0, N) + "..."` when the text is long. Full-length descriptions are silently accepted on MC/DB/Matrix but **rejected on TE** — the #1 silent killer. Verified caps: 50 chars total (47+"...") and 80 chars total (77+"...", probe import 2026-10-13, stored verbatim) both pass on TE; the platform's own exports truncate at 80–98. **Truncation itself is mandatory; 47 is the conservative default, up to ~80 is proven safe.**
- TE questions carry **no `SubSelector` key** (`SearchSource` optional).
- **NEVER emit `ChoiceGroups`/`ChoiceGroupOrder`** — the importer rejects hand-written group schemas. Flatten grouped choices in order; add the group headers in the builder UI afterwards.
- BL `Payload` is an **object keyed `"1","2"…`** (never an array); element `PrimaryAttribute: "Survey Blocks"`.
- FL `Payload` needs `"FlowID":"FL_1","Type":"Root"`; block nodes carry `FlowID:"FL_3"…` in order; `Properties.Count = blocks + 2`.
- Keep the full boilerplate element set (PL, PROJ, QC, QG, QGO, RS, SCO, SO, STAT) copied from a real export of the **destination account**, not from the public placeholder assets (Tools → Import/Export → Export survey on any tiny survey).
- Branch/skip logic: use per-question `DisplayLogic` (template in `references/logic-and-pagebreaks.md`). Page breaks: `{"Type":"Page Break"}` entries inside `BlockElements`.

## References

| Read this | When |
| --- | --- |
| `references/skeleton.md` | Assembling SurveyEntry / BL / FL / boilerplate |
| `references/question-payloads.md` | Writing any SQ payload (all verified types) |
| `references/logic-and-pagebreaks.md` | Display logic, page breaks, consent gates |
| `references/import-and-fallbacks.md` | Import procedure, error reading, browser automation, TXT fallback |

## Assets

- `assets/template-boilerplate.qsf` — generic one-question example with placeholder account settings; replace the skeleton and boilerplate with an export from the destination account.
- `assets/example-full-features.qsf` — synthetic example with TE (essay and form), Matrix, MC+TextEntry, DisplayLogic, and page breaks; use it to inspect payload shapes.
- `scripts/md2qsf.mjs` — maintained raw-md → QSF converter with a built-in self-check (`node md2qsf.mjs in.md out.qsf --name "Survey Name" --boilerplate <account-export.qsf>`); exits non-zero on any rule or text violation. It refuses the synthetic bundled boilerplate unless `--allow-synthetic-boilerplate` is passed.

## Boundaries

- QSF import **always creates a NEW survey** (new SurveyID); it cannot merge into an existing one.
- ChoiceGroups and end-of-survey (SkipLogic) logic are not hand-authorable in QSF — add them in the builder UI after import (2–3 clicks each).
- If a questionnaire needs features outside the verified set, fall back to the officially documented Advanced TXT format or the builder UI (`references/import-and-fallbacks.md`).
