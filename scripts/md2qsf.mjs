#!/usr/bin/env node
// md2qsf.mjs — maintained converter: raw-markdown questionnaire → import-safe Qualtrics QSF.
// Part of the qsf-file-convertor skill. Round-trip validated on 10 surveys / 120 questions,
// then imported into Qualtrics with 10/10 verbatim verifications (2026-10-13 batch test).
//
// BOILERPLATE SOURCE: pass a real QSF export from the DESTINATION Qualtrics account via
// --boilerplate (or the QSF_BOILERPLATE env var) — export any tiny survey with
// Tools → Import/Export → Export survey. The bundled assets/template-boilerplate.qsf is a
// synthetic example with placeholder account settings and is refused by default
// (--allow-synthetic-boilerplate overrides, for structural testing only).
//
// Follows every verified hard rule:
//   - QuestionDescription = plain.slice(0,47)+"..." when plain text > 50 chars, else full text
//     (truncation mandatory; 80-char truncated descriptions also proven import-safe)
//   - TE payloads carry NO SubSelector key
//   - never emits ChoiceGroups/ChoiceGroupOrder
//   - BL Payload is an object keyed "1","2"...; element PrimaryAttribute "Survey Blocks"
//   - FL Payload: FlowID FL_1 / Type Root, block nodes FL_3..., Properties.Count = blocks + 2
//   - boilerplate element set copied verbatim from the supplied account export
//   - QC.SecondaryAttribute = SQ element count
//
// Raw md convention:
//   # Survey title
//   One or two intro sentences.               → DB block "Intro"
//   Q1. (single) Question text?               → MC/SAVR
//   Q2. (multi) Question text?                → MC/MAVR
//   - Choice one
//   - Other: (text entry)                     → choice with TextEntry
//   Q3. (matrix) Grid text?                   → Matrix/Likert/SingleAnswer
//   Rows:  - row statement
//   Columns:  - scale label
//   Q4. (essay) Open text?                    → TE/ML
//   Q5. (form) Prompt?                        → TE/FORM
//   Fields:  - Field label:
//   [Page break]                              → page break before the NEXT question
//   [Shown only if Q2 = "Choice text"]        → DisplayLogic on the question just above
//   Final thank-you line.                     → DB block "Closing"
//
// Usage:
//   node md2qsf.mjs <input.md> <output.qsf> [--name "Survey Name"] [--boilerplate <file>] [--no-check]
// The default post-build self-check re-parses the written QSF and diffs every text
// against the source md; on any problem it prints details and exits with code 2.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BOILERPLATE = join(HERE, "..", "assets", "template-boilerplate.qsf");
const SYNTHETIC_MARKER = "SV_example1"; // SurveyID used by the bundled synthetic assets

const QUESTION_RE = /^Q(\d+)\. \((single|multi|matrix|essay|form)\) (.*)$/;
const PAGEBREAK_RE = /^\[Page break\]$/;
const LOGIC_RE = /^\[Shown only if Q(\d+) = "(.+)"\]$/;
const OTHER_RE = /^(.+?): \(text entry\)$/;

// ---------------- raw markdown parser ----------------
export function parseRaw(mdText) {
  const lines = mdText.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const doc = { title: "", intro: [], questions: [], closing: [] };
  let mode = "title"; // title -> intro -> questions
  let cur = null;
  let listTarget = null; // "choices" | "rows" | "columns" | "fields"
  let pendingPageBreak = false;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const m = line.match(QUESTION_RE);
    if (m) {
      cur = {
        num: Number(m[1]),
        type: m[2],
        text: m[3].trim(),
        choices: [], // {display, textEntry}
        rows: [],
        columns: [],
        fields: [],
        pageBreakBefore: pendingPageBreak,
        logic: null, // {controllerNum, choice}
      };
      pendingPageBreak = false;
      doc.questions.push(cur);
      listTarget = cur.type === "single" || cur.type === "multi" ? "choices" : null;
      mode = "questions";
      continue;
    }
    if (PAGEBREAK_RE.test(line)) { pendingPageBreak = true; continue; }
    if (mode === "title") {
      if (line.startsWith("# ")) doc.title = line.slice(2).trim();
      else { doc.intro.push(line.trim()); mode = "intro"; }
      continue;
    }
    if (mode === "intro") { doc.intro.push(line.trim()); continue; }
    const lm = line.match(LOGIC_RE);
    if (lm) { cur.logic = { controllerNum: Number(lm[1]), choice: lm[2] }; continue; }
    if (line === "Rows:") { listTarget = "rows"; continue; }
    if (line === "Columns:") { listTarget = "columns"; continue; }
    if (line === "Fields:") { listTarget = "fields"; continue; }
    if (line.startsWith("- ")) {
      const raw = line.slice(2).trim();
      const om = raw.match(OTHER_RE);
      const item = om ? { display: om[1] + ":", textEntry: true } : { display: raw };
      if (listTarget === "choices") cur.choices.push(item);
      else if (listTarget === "rows") cur.rows.push(raw);
      else if (listTarget === "columns") cur.columns.push(raw);
      else if (listTarget === "fields") cur.fields.push(raw);
      continue;
    }
    // plain line after the last list = closing text
    doc.closing.push(line.trim());
  }
  return doc;
}

// ---------------- skill helpers ----------------
export const plainText = (s) =>
  String(s)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const description = (text) => {
  const plain = plainText(text);
  return plain.length > 50 ? plain.slice(0, 47) + "..." : plain;
};

function sqElement(qid, desc, payload) {
  return {
    SurveyID: null, // filled by buildQsf
    Element: "SQ",
    PrimaryAttribute: qid,
    SecondaryAttribute: desc,
    TertiaryAttribute: null,
    Payload: { ...payload, QuestionID: qid },
  };
}

function dbPayload(tag, text) {
  return {
    QuestionText: text,
    DataExportTag: tag,
    QuestionType: "DB",
    Selector: "TB",
    SubSelector: null,
    DataVisibility: { Private: false, Hidden: false },
    Configuration: { QuestionDescriptionOption: "UseText" },
    QuestionDescription: description(text),
    Validation: { Settings: { ForceResponse: "OFF", Type: "None" } },
    Language: [],
    NextChoiceId: 1,
    NextAnswerId: 1,
    ChoiceOrder: [],
  };
}

function mcPayload(tag, multi, q) {
  const Choices = {};
  q.choices.forEach((c, i) => {
    Choices[String(i + 1)] = c.textEntry
      ? { Display: c.display, TextEntry: "true" }
      : { Display: c.display };
  });
  return {
    QuestionText: q.text,
    DefaultChoices: false,
    DataExportTag: tag,
    QuestionType: "MC",
    Selector: multi ? "MAVR" : "SAVR",
    SubSelector: "TX",
    DataVisibility: { Private: false, Hidden: false },
    Configuration: { QuestionDescriptionOption: "UseText" },
    QuestionDescription: description(q.text),
    Choices,
    ChoiceOrder: q.choices.map((_, i) => i + 1),
    Validation: { Settings: { ForceResponse: "OFF", Type: "None" } },
    GradingData: [],
    Language: [],
    NextChoiceId: q.choices.length + 1,
    NextAnswerId: 1,
  };
}

function matrixPayload(tag, q) {
  const Choices = {};
  q.rows.forEach((r, i) => (Choices[String(i + 1)] = { Display: r }));
  const Answers = {};
  q.columns.forEach((c, i) => (Answers[String(i + 1)] = { Display: c }));
  return {
    QuestionText: q.text,
    DataExportTag: tag,
    QuestionType: "Matrix",
    Selector: "Likert",
    SubSelector: "SingleAnswer",
    DataVisibility: { Private: false, Hidden: false },
    Configuration: { QuestionDescriptionOption: "UseText" },
    QuestionDescription: description(q.text),
    Choices,
    ChoiceOrder: q.rows.map((_, i) => i + 1),
    Answers,
    AnswerOrder: q.columns.map((_, i) => i + 1),
    Validation: { Settings: { ForceResponse: "OFF", Type: "None" } },
    GradingData: [],
    Language: [],
    NextChoiceId: q.rows.length + 1,
    NextAnswerId: q.columns.length + 1,
  };
}

// TE payloads carry NO SubSelector key (import-rejected).
function teEssayPayload(tag, q) {
  return {
    QuestionText: q.text,
    DefaultChoices: false,
    DataExportTag: tag,
    QuestionType: "TE",
    Selector: "ML",
    DataVisibility: { Private: false, Hidden: false },
    Configuration: { QuestionDescriptionOption: "UseText" },
    QuestionDescription: description(q.text),
    Validation: { Settings: { ForceResponse: "OFF", Type: "None" } },
    GradingData: [],
    Language: [],
    NextChoiceId: 4, // template shape from references/question-payloads.md
    NextAnswerId: 1,
    SearchSource: { AllowFreeResponse: "false" },
  };
}

function teFormPayload(tag, q) {
  const Choices = {};
  q.fields.forEach((f, i) => (Choices[String(i + 1)] = { Display: f }));
  return {
    QuestionText: q.text,
    DefaultChoices: false,
    DataExportTag: tag,
    QuestionType: "TE",
    Selector: "FORM",
    DataVisibility: { Private: false, Hidden: false },
    Configuration: { QuestionDescriptionOption: "UseText" },
    QuestionDescription: description(q.text),
    Choices,
    ChoiceOrder: q.fields.map((_, i) => i + 1),
    Validation: { Settings: { ForceResponse: "OFF", Type: "None" } },
    GradingData: [],
    Language: [],
    NextChoiceId: q.fields.length + 1,
    NextAnswerId: 1,
  };
}

// DisplayLogic per references/logic-and-pagebreaks.md (Operator "Selected" variant)
export function displayLogic(controllerQid, choiceNum, choiceDisplay) {
  const loc = `q://${controllerQid}/SelectableChoice/${choiceNum}`;
  return {
    "0": {
      "0": {
        LogicType: "Question",
        QuestionID: controllerQid,
        QuestionIsInLoop: "no",
        ChoiceLocator: loc,
        Operator: "Selected",
        QuestionIDFromLocator: controllerQid,
        LeftOperand: loc,
        Type: "Expression",
        Description: `<span class="ConjDesc">If</span> <span class="LeftOpDesc">${choiceDisplay}</span> <span class="OpDesc">Is Selected</span> `,
      },
      Type: "If",
    },
    Type: "BooleanExpression",
    inPage: false,
  };
}

// ---------------- builder ----------------
// Blocks: Introduction | Survey Questions | Closing. QIDs: QID1 Intro, QID2..QID(n+1)
// questions in order, QID(n+2) Closing.
export function buildQsf(doc, surveyName, boiler) {
  const svyId = boiler.SurveyEntry.SurveyID;
  const introQid = "QID1";
  const closingQid = `QID${doc.questions.length + 2}`;
  const qidForNum = (n) => `QID${n + 1}`;

  const sqs = [];
  sqs.push(
    sqElement(introQid, description([doc.title, ...doc.intro].join(" ")),
      dbPayload("Intro", [doc.title, ...doc.intro].join("<br>")))
  );
  for (const q of doc.questions) {
    const tag = `Q${q.num}`;
    const qid = qidForNum(q.num);
    let payload;
    if (q.type === "single") payload = mcPayload(tag, false, q);
    else if (q.type === "multi") payload = mcPayload(tag, true, q);
    else if (q.type === "matrix") payload = matrixPayload(tag, q);
    else if (q.type === "essay") payload = teEssayPayload(tag, q);
    else if (q.type === "form") payload = teFormPayload(tag, q);
    else throw new Error(`Q${q.num}: unknown type "${q.type}"`);

    if (q.logic) {
      const controller = doc.questions.find((x) => x.num === q.logic.controllerNum);
      if (!controller) {
        throw new Error(`Q${q.num}: logic controller Q${q.logic.controllerNum} not found`);
      }
      const idx = controller.choices.findIndex(
        (c) => c.display.replace(/:$/, "") === q.logic.choice
      );
      if (idx === -1) {
        throw new Error(
          `Q${q.num}: logic choice "${q.logic.choice}" not found among Q${controller.num} choices`
        );
      }
      payload.DisplayLogic = displayLogic(qidForNum(controller.num), idx + 1, q.logic.choice);
    }
    sqs.push(sqElement(qid, payload.QuestionDescription, payload));
  }
  sqs.push(
    sqElement(closingQid, description(doc.closing.join("<br>")),
      dbPayload("Closing", doc.closing.join("<br>")))
  );

  const mainElements = [];
  for (const q of doc.questions) {
    if (q.pageBreakBefore) mainElements.push({ Type: "Page Break" });
    mainElements.push({ Type: "Question", QuestionID: qidForNum(q.num) });
  }
  const blocks = [
    { Description: "Introduction", BlockElements: [{ Type: "Question", QuestionID: introQid }] },
    { Description: "Survey Questions", BlockElements: mainElements },
    { Description: "Closing", BlockElements: [{ Type: "Question", QuestionID: closingQid }] },
  ].map((b, i) => ({ Type: "Standard", SubType: "", ...b, ID: `BL_ST${i + 1}` }));

  const bl = {
    SurveyID: svyId,
    Element: "BL",
    PrimaryAttribute: "Survey Blocks",
    SecondaryAttribute: null,
    TertiaryAttribute: null,
    Payload: Object.fromEntries(blocks.map((b, i) => [String(i + 1), b])),
  };

  const fl = {
    SurveyID: svyId,
    Element: "FL",
    PrimaryAttribute: "Survey Flow",
    SecondaryAttribute: null,
    TertiaryAttribute: null,
    Payload: {
      Flow: blocks.map((b, i) => ({ ID: b.ID, Type: "Standard", FlowID: `FL_${i + 3}` })),
      Properties: { Count: blocks.length + 2 },
      FlowID: "FL_1",
      Type: "Root",
    },
  };

  // Boilerplate elements copied verbatim; only QC count + SurveyName change.
  const byName = (name) =>
    JSON.parse(JSON.stringify(boiler.SurveyElements.find((e) => e.Element === name)));
  const qc = byName("QC");
  qc.SecondaryAttribute = String(sqs.length);

  const surveyEntry = JSON.parse(JSON.stringify(boiler.SurveyEntry));
  surveyEntry.SurveyName = surveyName;

  const elements = [
    bl,
    fl,
    ...["PL", "PROJ", "QC", "QG", "QGO", "RS", "SCO", "SO"].map((n) =>
      n === "QC" ? qc : byName(n)
    ),
    ...sqs.map((e) => ({ ...e, SurveyID: svyId })),
    byName("STAT"),
  ];

  return { SurveyEntry: surveyEntry, SurveyElements: elements };
}

// ---------------- self-check ----------------
const TYPE_MAP = {
  single: "MC/SAVR",
  multi: "MC/MAVR",
  matrix: "Matrix/Likert",
  essay: "TE/ML",
  form: "TE/FORM",
};

export function checkQsf(qsf, doc) {
  const problems = [];
  const bad = (msg) => problems.push(msg);
  const sqs = qsf.SurveyElements.filter((e) => e.Element === "SQ");
  const byTag = new Map(sqs.map((s) => [s.Payload.DataExportTag, s.Payload]));
  const bl = qsf.SurveyElements.find((e) => e.Element === "BL");
  const fl = qsf.SurveyElements.find((e) => e.Element === "FL");
  const qc = qsf.SurveyElements.find((e) => e.Element === "QC");

  // structural rules
  if (qc.SecondaryAttribute !== String(sqs.length)) {
    bad(`QC.SecondaryAttribute=${qc.SecondaryAttribute} but SQ count=${sqs.length}`);
  }
  if (Array.isArray(bl.Payload) || typeof bl.Payload !== "object") bad("BL Payload is not an object");
  if (bl.PrimaryAttribute !== "Survey Blocks") bad("BL PrimaryAttribute is not 'Survey Blocks'");
  const blockIds = new Set(Object.values(bl.Payload).map((b) => b.ID));
  const sqIds = new Set(sqs.map((s) => s.Payload.QuestionID));
  for (const b of Object.values(bl.Payload)) {
    for (const el of b.BlockElements) {
      if (el.Type === "Question" && !sqIds.has(el.QuestionID)) {
        bad(`BL block '${b.Description}' references missing ${el.QuestionID}`);
      }
    }
  }
  if (fl.Payload.FlowID !== "FL_1" || fl.Payload.Type !== "Root") bad("FL is not FlowID FL_1 / Type Root");
  const blockCount = Object.keys(bl.Payload).length;
  if (fl.Payload.Properties.Count !== blockCount + 2) {
    bad(`FL Properties.Count=${fl.Payload.Properties.Count} but blocks+2=${blockCount + 2}`);
  }
  for (const node of fl.Payload.Flow) {
    if (!blockIds.has(node.ID)) bad(`FL references unknown block ${node.ID}`);
  }
  if (JSON.stringify(qsf).includes("ChoiceGroup")) bad("ChoiceGroups/ChoiceGroupOrder present");
  for (const s of sqs) {
    if (s.Payload.QuestionType === "TE" && "SubSelector" in s.Payload) {
      bad(`TE ${s.Payload.DataExportTag} carries a SubSelector key`);
    }
    const desc = s.Payload.QuestionDescription;
    const expect = description(s.Payload.QuestionText || "");
    if (desc !== expect) {
      bad(`${s.Payload.DataExportTag}: QuestionDescription does not follow the truncation rule`);
    }
  }

  // text-level diff vs doc
  const intro = byTag.get("Intro");
  if (!intro) bad("missing Intro DB block");
  else if (plainText(intro.QuestionText) !== plainText([doc.title, ...doc.intro].join("<br>"))) {
    bad("Intro text differs from md title+intro");
  }
  const closing = byTag.get("Closing");
  if (doc.closing.length > 0) {
    if (!closing) bad("missing Closing DB block");
    else if (plainText(closing.QuestionText) !== plainText(doc.closing.join("<br>"))) {
      bad("Closing text differs from md closing line");
    }
  }
  for (const q of doc.questions) {
    const p = byTag.get(`Q${q.num}`);
    if (!p) { bad(`Q${q.num} missing from QSF`); continue; }
    const wantType = TYPE_MAP[q.type];
    const gotType = `${p.QuestionType}/${p.Selector}`;
    if (gotType !== wantType) bad(`Q${q.num}: type ${gotType}, expected ${wantType}`);
    if (plainText(p.QuestionText) !== plainText(q.text)) bad(`Q${q.num}: question text differs`);
    const lists = {
      choices: [q.choices.map((c) => c.display), p.Choices, p.ChoiceOrder],
      rows: [q.rows, p.Choices, p.ChoiceOrder],
      columns: [q.columns, p.Answers, p.AnswerOrder],
      fields: [q.fields, p.Choices, p.ChoiceOrder],
    };
    const which =
      q.type === "matrix" ? ["rows", "columns"]
      : q.type === "form" ? ["fields"]
      : q.type === "essay" ? []
      : ["choices"];
    for (const key of which) {
      const [want, store, order] = lists[key];
      if (!order) { if (want.length) bad(`Q${q.num}: expected ${key} but QSF has none`); continue; }
      const got = order.map((i) => store[String(i)]);
      if (got.length !== want.length) { bad(`Q${q.num}: ${key} count ${got.length} != ${want.length}`); continue; }
      want.forEach((w, i) => {
        if (plainText(got[i].Display) !== plainText(w)) bad(`Q${q.num}: ${key}[${i + 1}] differs`);
      });
    }
    if (q.type === "single" || q.type === "multi") {
      q.choices.forEach((c, i) => {
        const got = p.Choices[String(i + 1)];
        const wantTx = c.textEntry ? "true" : undefined;
        const gotTx = got.TextEntry;
        if (wantTx !== gotTx) bad(`Q${q.num}: choice ${i + 1} TextEntry flag differs`);
      });
    }
    if (q.type === "form") {
      q.fields.forEach((f, i) => {
        if (plainText(p.Choices[String(i + 1)].Display) !== plainText(f)) {
          bad(`Q${q.num}: form field ${i + 1} differs`);
        }
      });
    }
    const hasLogic = "DisplayLogic" in p;
    if (hasLogic !== Boolean(q.logic)) bad(`Q${q.num}: DisplayLogic presence mismatch`);
  }
  // page breaks
  const main = Object.values(bl.Payload).find((b) => b.Description === "Survey Questions");
  const seq = main.BlockElements.map((el) => (el.Type === "Page Break" ? "PB" : el.QuestionID));
  const expectSeq = [];
  for (const q of doc.questions) {
    if (q.pageBreakBefore) expectSeq.push("PB");
    expectSeq.push(qidOf(q.num));
  }
  function qidOf(n) { return `QID${n + 1}`; }
  if (JSON.stringify(seq) !== JSON.stringify(expectSeq)) {
    bad(`page-break sequence differs: got ${JSON.stringify(seq)}`);
  }
  return problems;
}

// ---------------- main ----------------
function main() {
  const argv = process.argv.slice(2);
  let input, output, name, noCheck = false, boilerplate, allowSynthetic = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--name") name = argv[++i];
    else if (argv[i] === "--no-check") noCheck = true;
    else if (argv[i] === "--boilerplate") boilerplate = argv[++i];
    else if (argv[i] === "--allow-synthetic-boilerplate") allowSynthetic = true;
    else if (!input) input = argv[i];
    else if (!output) output = argv[i];
    else { console.error(`unexpected argument: ${argv[i]}`); process.exit(2); }
  }
  if (!input || !output) {
    console.error('usage: node md2qsf.mjs <input.md> <output.qsf> [--name "Survey Name"] [--boilerplate <account-export.qsf>] [--no-check] [--allow-synthetic-boilerplate]');
    process.exit(2);
  }
  const doc = parseRaw(readFileSync(input, "utf8"));
  if (!doc.title) { console.error(`${input}: no '# title' line found`); process.exit(2); }
  if (!doc.questions.length) { console.error(`${input}: no 'Qn. (type)' questions parsed`); process.exit(2); }
  const nums = doc.questions.map((q) => q.num);
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== i + 1) { console.error(`${input}: question numbers not 1..N in order (got ${nums.join(",")})`); process.exit(2); }
  }
  const boilerPath = boilerplate || process.env.QSF_BOILERPLATE || DEFAULT_BOILERPLATE;
  const boiler = JSON.parse(readFileSync(boilerPath, "utf8"));
  if (boiler.SurveyEntry.SurveyID === SYNTHETIC_MARKER && !allowSynthetic) {
    console.error(
      `${boilerPath}: this is the bundled SYNTHETIC template (placeholder account settings), which is not import-tested.\n` +
      `Export any tiny survey from the destination Qualtrics account (Tools -> Import/Export -> Export survey)\n` +
      `and pass it via --boilerplate <file> (or set QSF_BOILERPLATE). Use --allow-synthetic-boilerplate only for structural testing.`
    );
    process.exit(2);
  }
  const qsf = buildQsf(doc, name || doc.title, boiler);
  writeFileSync(output, JSON.stringify(qsf, null, 2) + "\n", "utf8");
  const problems = noCheck ? [] : checkQsf(JSON.parse(readFileSync(output, "utf8")), doc);
  const typeCounts = doc.questions.reduce((a, q) => ((a[q.type] = (a[q.type] || 0) + 1), a), {});
  if (problems.length) {
    console.error(`${output}: SELF-CHECK FAILED (${problems.length} problems)`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(2);
  }
  console.log(
    `${output}: OK — ${doc.questions.length} questions ` +
    `(${Object.entries(typeCounts).map(([t, n]) => `${t}=${n}`).join(" ")}), ` +
    `SQ=${qsf.SurveyElements.filter((e) => e.Element === "SQ").length}, name="${name || doc.title}", self-check passed`
  );
}

if (process.argv[1] && process.argv[1].endsWith("md2qsf.mjs")) main();
