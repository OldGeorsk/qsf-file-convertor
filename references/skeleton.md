# QSF Skeleton

Minimal import-safe file layout. Use a small real export from the destination account for concrete values: IDs are account-scoped. The bundled assets use placeholder account settings and are structural examples only.

```json
{
  "SurveyEntry": {
    "SurveyID": "SV_xxx", "SurveyName": "<CHANGE>",
    "SurveyDescription": null, "SurveyOwnerID": "UR_xxx", "SurveyBrandID": "<brand>",
    "DivisionID": null, "SurveyLanguage": "EN", "SurveyActiveResponseSet": "RS_xxx",
    "SurveyStatus": "Inactive", "SurveyStartDate": "0000-00-00 00:00:00",
    "SurveyExpirationDate": "0000-00-00 00:00:00", "SurveyCreationDate": "<keep>",
    "CreatorID": "UR_xxx", "LastModified": "<keep>", "LastAccessed": "0000-00-00 00:00:00",
    "LastActivated": "0000-00-00 00:00:00", "Deleted": null
  },
  "SurveyElements": [
    { "SurveyID": "SV_xxx", "Element": "BL", "PrimaryAttribute": "Survey Blocks",
      "SecondaryAttribute": null, "TertiaryAttribute": null,
      "Payload": {
        "1": { "Type": "Standard", "SubType": "", "Description": "Block 1 name",
               "ID": "BL_uniqueid1",
               "BlockElements": [ { "Type": "Question", "QuestionID": "QID1" },
                                  { "Type": "Page Break" } ] }
      } },
    { "SurveyID": "SV_xxx", "Element": "FL", "PrimaryAttribute": "Survey Flow",
      "SecondaryAttribute": null, "TertiaryAttribute": null,
      "Payload": { "Flow": [ { "ID": "BL_uniqueid1", "Type": "Standard", "FlowID": "FL_3" } ],
                   "Properties": { "Count": 3 }, "FlowID": "FL_1", "Type": "Root" } },
    "<PL>", "<PROJ>", "<QC>", "<QG>", "<QGO>", "<RS>", "<SCO>", "<SO>", "<STAT>"
  ]
}
```

## Rules

- `SurveyEntry`: keep the full new field set (above) verbatim from a real export; only change `SurveyName`. Old-spec fields (`Language`, `SurveyButtonNextText`, …) are tolerated by the parser but add nothing.
- BL: payload keys `"1".."n"` define block order. Blocks may also include `"Type": "Trash"` (optional; omit it). `BlockElements` may mix `{"Type":"Question","QuestionID":…}` and `{"Type":"Page Break"}`.
- FL: one node per standard block, `FlowID` starting at `FL_3`; `Properties.Count` = number of blocks + 2. No `IntroEnd` needed.
- Boilerplate elements (PL, PROJ, QC, QG, QGO, RS, SCO, SO, STAT): copy verbatim from the destination account export. Only `QC.SecondaryAttribute` must change (stringified question count). Note the element is `PROJ` (with `ProjectCategory` + `SchemaVersion`), not "PRO".
- SQ elements: `{"SurveyID", "Element":"SQ", "PrimaryAttribute":"QIDn", "SecondaryAttribute":"<truncated description>", "TertiaryAttribute":null, "Payload":{…}}`.
- QIDs: any consistent scheme (QID1…QIDn). The importer remaps them; gaps are fine.
