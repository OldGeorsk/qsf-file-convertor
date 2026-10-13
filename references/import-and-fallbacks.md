# Import Procedures, Error Reading, Automation, Fallbacks

## Manual import (always works)

1. Qualtrics → any survey's builder → **Tools → Import/Export → Import survey** (or Projects page → Create → Survey → Import). Accepts `.qsf`, `.txt`, `.docx`.
2. The banner "This import will create a new survey" is expected — QSF import never merges into an existing survey.
3. After import: check question count, spot-check TE questions and logic; add ChoiceGroups / end-of-survey gates in the UI.

## Reading import errors

| Error | Meaning |
| --- | --- |
| `Error parsing file: The file does not appear to be a valid survey` | Structural: skeleton/syntax broken (e.g. BL payload as array, missing boilerplate). |
| `Error calling service` / "An error occurred while uploading the file" | A content rule was violated: an **un-truncated** long `QuestionDescription` on TE, TE with `SubSelector`, or `ChoiceGroups` present. Fix payload and retry. |

Isolate a stubborn failure by importing a single-question probe file containing just the suspect feature (same skeleton, one SQ).

## Browser-automation import (when a Qualtrics session is available in an in-app browser)

New-builder reality (verified 2026-10-13 batch test, 10/10 imports): the builder's **Tools menu does not open** under in-app-browser synthesized events (role clicks, coordinate clicks, node-id clicks all fail); the classic builder URL (`/Q/EditSection/Blocks`) redirects to the new builder; and the old `POST /Q/EditSection/Blocks/Ajax/ImportSurveyProject` endpoint returns 403 (needs app-side headers). Use the catalog flow instead:

1. Serve the QSF locally: tiny Node http server returning the file with headers `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Private-Network: true`.
2. Navigate to `https://<brand>.qualtrics.com/app/catalog/projects?offeringId=Survey` (or homepage → "Create a new project" → Survey). Wait for the "Get started" button, click it — the "Create a new project" dialog opens.
3. In the dialog: combobox "How do you want to start your survey?" → select **"Import a QSF file"**.
4. Set the file programmatically (in-app browsers have no native file chooser):
   ```js
   const dt = new DataTransfer();
   dt.items.add(new File([text], "survey.qsf", { type: "application/json" })); // text fetched from the local server
   const input = document.querySelector("input[type=file]");
   input.files = dt.files;
   input.dispatchEvent(new Event("input", { bubbles: true }));
   input.dispatchEvent(new Event("change", { bubbles: true }));
   ```
5. Fill the project Name (React input — use the native value-setter + `input` event), then click "Create project". Success = page navigates to the new survey's builder URL (`…/survey-builder/SV_…/edit`).
6. Name test surveys `ZZ …` so they are easy to delete.

Robustness notes: the catalog SPA renders progressively — don't use fixed sleeps. Run the whole dialog dance as an **in-page async routine** that polls for each element (`Get started` → combobox → option → file input → name → enabled `Create project`, ~10–20s budgets), taps each via `mousedown`+`mouseup`+`click()` events, and reports its step log from a `window` variable. Triggering it fire-and-forget and polling sidesteps evaluate-time caps; after the Create click the page navigates, so read the new SurveyID from the URL.

## Verifying an import (readback channel)

From any same-origin Qualtrics page: `GET /survey-editor-service/v2/surveys/{SV_id}` with `cache: "no-store"` returns the live model — survey name, question count, and per-block `Standard[].BlockElements[]`; each question element carries `QuestionDefinition` (= the SQ payload) and non-question elements are page breaks. Diff `DataExportTag`, type/selector, plain text, `ChoiceOrder`/`Choices` (+`TextEntry`), `AnswerOrder`/`Answers`, and `DisplayLogic` presence against the source QSF. This verified all 120 questions of the 2026-10-13 test with zero mismatches.

## Official fallback: Advanced TXT import format

Qualtrics officially documents a text format that creates surveys and handles every question type including forms and essays. Key syntax (one file, plain TXT, UTF-8; questions separated by 2 blank lines):

```
[[Block]] Block name
[[Question:MC:MultipleAnswer]] Question text?
[[Choices]]
Choice A
Choice B
[[Question:Matrix:SingleAnswer]] Grid question text
[[Choices]]
Row statement 1
[[Answers]]
Never
Often
[[Question:TextEntry:Essay]] Open question text
[[Question:TextEntry:Form]] Form question text
[[Choices]]
Field label 1:
Field label 2:
[[Question:Text]] Descriptive text block
[[ID:Q3]] sets the export tag
```

Docs: https://www.qualtrics.com/support/survey-platform/survey-module/survey-tools/import-and-export-surveys/ — prefer QSF (more control: TextEntry choices, DisplayLogic, page breaks); use TXT when a feature is QSF-blocked and UI work should be minimized.
