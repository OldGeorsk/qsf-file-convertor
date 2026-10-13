# QSF File Convertor

[English](README.md) | 简体中文

一个帮助 AI 助手将问卷转换为 Qualtrics 可导入文件的技能。无需编程基础。

## 简介

已经在文档中写好了问卷题目？这个技能可以帮助 AI 助手把它们转换成在线问卷，省去逐题复制的工作。

- **Qualtrics** 是一个用于制作和分享在线问卷的网站。
- **QSF** 是 Qualtrics 保存问卷题目、选项和布局的文件格式。
- **技能（skill）** 是一套操作说明，用来指导 AI 助手完成特定任务。

将问卷交给 AI 助手，并请它使用这个技能。它会读取题目，生成 `.qsf` 文件，再检查题目和选项是否与原文一致。之后，你可以把文件导入 Qualtrics，并预览问卷。

支持的内容包括：

- 单选题和多选题。
- 同意程度量表，例如从“非常不同意”到“非常同意”。
- 需要为每条陈述选择一个答案的表格题。
- 文字作答、问卷说明和分页。
- 根据前面题目的答案，决定是否显示后续题目的规则。

可以使用 Word 文档（`.docx`）、PDF、纯文本（`.txt`）或 Markdown（`.md`）。处理 PDF 需要额外的 PDF 阅读技能。如果 AI 助手能够读取电子表格，也可以使用 Excel 文件（`.xlsx`）。

部分高级功能需要在 Qualtrics 中进一步调整。导入 QSF 文件会创建一份**新问卷**，不会把题目添加到已有问卷中。

## 获取技能

你需要一个能够使用技能文件夹、读取本地文件的 AI 助手，以及一个用于导入问卷的 Qualtrics 账号。

1. 在本仓库页面选择 **Code → Download ZIP**，解压下载的 ZIP 文件，并将解压后的文件夹重命名为 `qsf-file-convertor`。请将 `SKILL.md`、`assets` 和 `references` 保存在同一个文件夹中。
2. 将整个文件夹放入用户目录下的 `.agents/skills`。在 Windows 上，路径通常如下：

   ```text
   C:\Users\your-name\.agents\skills\qsf-file-convertor\
   ```

   将 `your-name` 替换为你的 Windows 用户名。如果 AI 助手使用其他技能目录，请遵循它的安装说明。
3. 打开 AI 助手，请它使用 `qsf-file-convertor`。如果它找不到这个技能，可以提供 `SKILL.md` 的完整路径。
4. 从你自己的 Qualtrics 账号准备一份基础文件：打开一份简单的问卷，选择 **Tools → Import/Export → Export survey**，保存导出的 QSF 文件。将它与待转换的问卷一起交给 AI 助手，以便使用与你账号匹配的设置。

你不需要修改技能文件，也不需要了解它们的内部工作方式。

## 使用示例

附上问卷和基础 QSF 文件，然后向 AI 助手发送：

> 请使用 qsf-file-convertor，将我附上的问卷转换为 QSF 文件。以我附上的 Qualtrics 导出文件为基础，保持题目原文、选项和题目顺序不变。

如果问卷使用五点同意程度量表，还可以补充：

> 请在问卷开头说明，1 表示 Strongly disagree，5 表示 Strongly agree。每题的选项只显示文字，不显示数字。

AI 助手完成后：

1. 保存它生成的 QSF 文件。
2. 在 Qualtrics 中打开 **Tools → Import/Export → Import survey**，选择该文件。创建问卷时，也可能看到导入选项。
3. 打开新问卷，选择 **Preview** 进行预览。
4. 检查题目数量、题目原文、选项和页面顺序。正式分享前，试着像学生一样填写一遍。

## 目录结构

```text
qsf-file-convertor/
├── README.md
├── README-zh.md
├── SKILL.md
├── assets/
└── references/
```

- **README.md**：英文使用说明，也是 GitHub 默认显示的说明文件。
- **README-zh.md**：你正在阅读的简体中文使用说明。
- **SKILL.md**：AI 助手转换问卷时遵循的操作说明。
- **assets/**：QSF 示例模板，以及展示支持功能的问卷示例。
- **references/**：题型、分页、题目显示规则和文件导入的详细指南。
