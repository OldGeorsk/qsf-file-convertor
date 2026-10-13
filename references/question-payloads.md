# SQ Payload Templates (all import-verified)

Common rules for every payload:

- `QuestionDescription`: **always** a truncated `plainText.slice(0, N) + "..."` when the plain question text is long; otherwise the full text. Caps verified by real imports: 47+"..." (50 total) and 77+"..." (80 total, stored verbatim — probe 2026-10-13); platform exports truncate at 80–98. Never leave a full-length description on TE (import-rejected). 47 stays the default; up to ~80 is proven safe when more context is needed.
- Always include: `DataExportTag` (displayed number, e.g. "Q1"), `DataVisibility: {"Private":false,"Hidden":false}`, `Configuration: {"QuestionDescriptionOption":"UseText"}`, `Validation: {"Settings":{"ForceResponse":"OFF","Type":"None"}}`, `Language: []`, `GradingData: []` (not on DB), `NextChoiceId` (max choice id + 1), `NextAnswerId` (max answer id + 1; 1 unless Matrix).
- `QuestionText`: HTML allowed — use `<br>` for line breaks.

## MC — single answer (SAVR) / multiple answer (MAVR)

```json
{ "QuestionText": "…? Select one.", "DefaultChoices": false, "DataExportTag": "Q2",
  "QuestionType": "MC", "Selector": "SAVR", "SubSelector": "TX",
  "DataVisibility": { "Private": false, "Hidden": false },
  "Configuration": { "QuestionDescriptionOption": "UseText" },
  "QuestionDescription": "…slice(0,47)+\"…\"",
  "Choices": { "1": { "Display": "Option A" },
               "2": { "Display": "Option B" },
               "3": { "Display": "Other:", "TextEntry": "true" } },
  "ChoiceOrder": [1, 2, 3],
  "Validation": { "Settings": { "ForceResponse": "OFF", "Type": "None" } },
  "GradingData": [], "Language": [], "NextChoiceId": 4, "NextAnswerId": 1,
  "QuestionID": "QID5" }
```

- Multi-select: `"Selector": "MAVR"` — everything else identical.
- "Other: ____" choices: add `"TextEntry": "true"` (string, not boolean).
- **Never add ChoiceGroups/ChoiceGroupOrder** (import-rejected). For grouped choice lists, keep choices in visual order and add the group headers via builder UI after import.

## TE — text entry (ML essay / FORM fields)

```json
{ "QuestionText": "…", "DefaultChoices": false, "DataExportTag": "Q9",
  "QuestionType": "TE", "Selector": "ML",
  "DataVisibility": { "Private": false, "Hidden": false },
  "Configuration": { "QuestionDescriptionOption": "UseText" },
  "QuestionDescription": "…slice(0,47)+\"…\"",
  "Validation": { "Settings": { "ForceResponse": "OFF", "Type": "None" } },
  "GradingData": [], "Language": [], "NextChoiceId": 4, "NextAnswerId": 1,
  "SearchSource": { "AllowFreeResponse": "false" },
  "QuestionID": "QID30" }
```

- **No `SubSelector` key** (import-rejected). `SearchSource` optional (verified both ways).
- FORM variant: `"Selector": "FORM"` plus input-field labels:
  `"Choices": { "1": {"Display": "Field label 1:"}, "2": {"Display": "Field label 2:"} }, "ChoiceOrder": [1, 2], "NextChoiceId": 3` (omit `SearchSource`).

## Matrix — Likert single answer

```json
{ "QuestionText": "…Mark one response for each statement.", "DataExportTag": "Q7",
  "QuestionType": "Matrix", "Selector": "Likert", "SubSelector": "SingleAnswer",
  "DataVisibility": { "Private": false, "Hidden": false },
  "Configuration": { "QuestionDescriptionOption": "UseText" },
  "QuestionDescription": "…slice(0,47)+\"…\"",
  "Choices":  { "1": { "Display": "Row statement 1" }, "2": { "Display": "Row statement 2" } },
  "ChoiceOrder": [1, 2],
  "Answers":   { "1": { "Display": "Never" }, "2": { "Display": "Often" } },
  "AnswerOrder": [1, 2],
  "Validation": { "Settings": { "ForceResponse": "OFF", "Type": "None" } },
  "GradingData": [], "Language": [], "NextChoiceId": 3, "NextAnswerId": 3,
  "QuestionID": "QID11" }
```

- Rows = `Choices`, scale columns = `Answers`. Multi-answer matrix: `"SubSelector": "MultipleAnswer"` (not yet import-verified — smoke-test first).

## DB — descriptive text / headings

```json
{ "QuestionText": "Section heading or instructions (HTML ok)", "DataExportTag": "Intro",
  "QuestionType": "DB", "Selector": "TB", "SubSelector": null,
  "DataVisibility": { "Private": false, "Hidden": false },
  "Configuration": { "QuestionDescriptionOption": "UseText" },
  "QuestionDescription": "…slice(0,47)+\"…\"",
  "Validation": { "Settings": { "ForceResponse": "OFF", "Type": "None" } },
  "Language": [], "QuestionID": "QID1" }
```

- DB questions never display a number; use tags like "Intro"/"Closing"/"Heading A".
