# Logic, Page Breaks, and What QSF Cannot Do

## Page breaks (import-verified)

Insert `{"Type": "Page Break"}` entries between `{"Type":"Question","QuestionID":…}` entries inside a block's `BlockElements`. A page break after question QIDn:

```json
"BlockElements": [ { "Type": "Question", "QuestionID": "QID11" },
                   { "Type": "Page Break" },
                   { "Type": "Question", "QuestionID": "QID12" } ]
```

Note: `Type` is the literal string `"Page Break"` (with a space).

## Per-question display logic (import-verified)

Show a question only when a choice of an earlier question is NOT selected (the "skip a section" pattern — apply the same DisplayLogic object to every element of the skipped block):

```json
"DisplayLogic": {
  "0": {
    "0": {
      "LogicType": "Question",
      "QuestionID": "QID8",
      "QuestionIsInLoop": "no",
      "ChoiceLocator": "q://QID8/SelectableChoice/2",
      "Operator": "NotSelected",
      "QuestionIDFromLocator": "QID8",
      "LeftOperand": "q://QID8/SelectableChoice/2",
      "Type": "Expression",
      "Description": "<span class=\"ConjDesc\">If</span> <span class=\"LeftOpDesc\">No — skip Section B</span> <span class=\"OpDesc\">Is Not Selected</span> "
    },
    "Type": "If"
  },
  "Type": "BooleanExpression",
  "inPage": false
}
```

- `ChoiceLocator`/`LeftOperand` = `q://<controller QID>/SelectableChoice/<choice number>`; for "is selected" use `"Operator": "Selected"`.
- `Description` is decorative HTML shown in the builder — include it (copied shape) for fidelity.

## What QSF cannot express (add via builder UI after import)

- **ChoiceGroups** (choice group headers): import-rejected in every hand-written form tested. Add via the edit panel ("Add choice group") after import.
- **End-of-survey logic** (e.g. consent screens: "No → end survey"): question-level `SkipLogic` and Survey-flow `Branch` nodes were never import-verified; the safe path is adding them in the Survey flow UI (Branch → condition → End of Survey) or via question Skip Logic, 1–2 clicks each. Flag any consent gates from the source document explicitly in the handoff report so they are not forgotten.
- Quotas, scoring, embedded data, authenticators: out of scope for this skill.
