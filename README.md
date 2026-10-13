# QSF File Convertor

English | [简体中文](README-zh.md)

A skill that helps an AI assistant turn your questionnaire into a file you can import into Qualtrics. No programming is needed.

## Brief description

Have survey questions in a document? This skill helps your AI assistant turn them into an online survey without copying each question by hand.

- **Qualtrics** is a website for creating and sharing online surveys.
- **QSF** is the file format Qualtrics uses to store a survey's questions, answer choices, and layout.
- **A skill** is a set of instructions that teaches an AI assistant how to carry out a particular task.

Give the assistant your questionnaire and ask it to use this skill. It reads the questions, creates a `.qsf` file, and checks that the wording and choices match your original document. You then import the file into Qualtrics and preview the survey.

It supports:

- Questions with one answer or several answers.
- Agreement scales, such as Strongly disagree to Strongly agree.
- Tables where students choose one response for each statement.
- Written answers, instructions, and page breaks.
- Rules that show a question only when a previous answer meets a condition.

You can use Word documents (`.docx`), PDFs, plain text (`.txt`), or Markdown (`.md`). PDFs need a separate PDF-reading skill. Excel files (`.xlsx`) also work when your assistant has a spreadsheet reader.

Some advanced survey features need adjustments inside Qualtrics. Importing a QSF file creates a **new survey**; it does not add questions to an existing survey.

## Get the skill

You need an AI assistant that can use skill folders and read local files, plus a Qualtrics account to import the finished survey.

1. On this GitHub page, choose **Code → Download ZIP** and extract the ZIP file. Rename the extracted folder to `qsf-file-convertor`. Keep `SKILL.md`, `assets`, and `references` together.
2. Put the folder inside `.agents/skills` in your user folder. On Windows, the location usually looks like this:

   ```text
   C:\Users\your-name\.agents\skills\qsf-file-convertor\
   ```

   Replace `your-name` with your Windows username. If your assistant uses a different location for skills, follow its installation instructions.
3. Open your assistant and ask it to use `qsf-file-convertor`. If it cannot find the skill, give it the full path to `SKILL.md`.
4. Prepare a base file from your own Qualtrics account: open a small survey, choose **Tools → Import/Export → Export survey**, and save the QSF file. Give this file to your assistant along with your questionnaire so it can use the correct account settings.

You do not need to edit the skill's files or understand how they work.

## Example

Attach your questionnaire and the base QSF file, then send this message:

> Use qsf-file-convertor to turn my attached questionnaire into a QSF file. Use my attached Qualtrics export as the base. Keep the questions, answer choices, and question order unchanged.

For a five-point agreement survey, you can also add:

> At the start, explain that 1 means Strongly disagree and 5 means Strongly agree. Show only the answer words, without numbers, in each question's choices.

When the assistant finishes:

1. Save the QSF file it gives you.
2. In Qualtrics, open **Tools → Import/Export → Import survey** and select the file. You may also see an import option when creating a survey.
3. Open the new survey and choose **Preview**.
4. Check the question count, wording, answer choices, and page order. Try answering it as a student would before sharing it.

## Structure

```text
qsf-file-convertor/
├── README.md
├── README-zh.md
├── SKILL.md
├── assets/
├── references/
└── scripts/
```

- **README.md**: the English guide, displayed by default on GitHub.
- **README-zh.md**: the optional Simplified Chinese guide.
- **SKILL.md**: instructions the AI assistant follows to convert a survey.
- **assets/**: a sample QSF template and a survey showing supported features.
- **references/**: detailed guides for question types, page breaks, question display rules, and importing files.
- **scripts/**: `md2qsf.mjs`, a self-checking converter for questionnaires written in the skill's raw-markdown convention (batch-tested: 10/10 imports verified).
