# Import Procedures, Error Reading, Automation, Fallbacks

## Manual import (always works)

1. Qualtrics → any survey's builder → **Tools → Import/Export → Import survey** (or Projects page → Create → Survey → Import). Accepts `.qsf`, `.txt`, `.docx`.
2. The banner "This import will create a new survey" is expected — QSF import never merges into an existing survey.
3. After import: check question count, spot-check TE questions and logic; add ChoiceGroups / end-of-survey gates in the UI.

## Reading import errors

| Error | Meaning |
| --- | --- |
| `Error parsing file: The file does not appear to be a valid survey` | Structural: skeleton/syntax broken (e.g. BL payload as array, missing boilerplate). |
| `Error calling service` / "An error occurred while uploading the file" | A content rule was violated: TE `QuestionDescription` > ~50 chars, TE with `SubSelector`, or `ChoiceGroups` present. Fix payload and retry. |

Isolate a stubborn failure by importing a single-question probe file containing just the suspect feature (same skeleton, one SQ).

## Browser-automation import (when a Qualtrics session is available in an in-app browser)

IAB cannot use native file choosers; use this verified channel instead:

1. Serve the QSF locally: tiny Node http server returning the file with headers `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Private-Network: true`.
2. In the builder page, open Tools → Import/Export → Import survey (the submenu may need a hover, not a click; menu/dialog items are click-reachable via coordinates from `getBoundingClientRect()` when role-locator clicks time out).
3. In page context: fetch the file, then set it programmatically:
   ```js
   const dt = new DataTransfer();
   dt.items.add(new File([text], "survey.qsf", { type: "application/json" }));
   const input = document.querySelector("input[type=file]");
   input.files = dt.files;
   input.dispatchEvent(new Event("input", { bubbles: true }));
   input.dispatchEvent(new Event("change", { bubbles: true }));
   ```
4. Click Import. Success = page navigates to the new survey's builder; failure = "error occurred" banner stays (read the table above).
5. Name test surveys `ZZ …` so they are easy to delete.

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
