import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownToPlainText } from "@/lib/tts-text";

// ============ markdownToPlainText ============
// Edge-TTS input must be plain prose: markdown syntax stripped, ordinary
// punctuation (，。！？,.!?) preserved.

test("headings, bold and italic markers are stripped, content kept", () => {
  const out = markdownToPlainText("## 标题一\n\n这是**加粗**的内容，还有*斜体*部分。");
  assert.equal(out, "标题一\n\n这是加粗的内容，还有斜体部分。");
});

test("links keep their text, URLs are dropped", () => {
  const out = markdownToPlainText("参考[来源A](https://a.example/x)与![图片](https://b.example/i.png)说明。");
  assert.equal(out, "参考来源A与图片说明。");
});

test("footnote references and definitions are removed entirely", () => {
  const md = "第一条结论[^1]，第二条结论[^2]。\n\n[^1]: [title](https://a.example)\n[^2]: [other](https://b.example)";
  const out = markdownToPlainText(md);
  assert.equal(out, "第一条结论，第二条结论。");
});

test("list markers are stripped but items remain", () => {
  const out = markdownToPlainText("- 第一项\n- 第二项\n1. 有序一\n2) 有序二");
  assert.equal(out, "第一项\n第二项\n有序一\n有序二");
});

test("ordinary punctuation is preserved", () => {
  const out = markdownToPlainText("你好，世界！这是测试吗？是的。Yes, indeed! Really? 3.14…");
  assert.equal(out, "你好，世界！这是测试吗？是的。Yes, indeed! Really? 3.14…");
});

test("blockquote, horizontal rule and code fences are cleaned", () => {
  const out = markdownToPlainText("> 引用内容\n\n---\n\n```js\nconst a = 1;\n```");
  assert.equal(out, "引用内容\n\nconst a = 1;");
});

test("inline code keeps its content without backticks", () => {
  const out = markdownToPlainText("使用 `npm test` 命令。");
  assert.equal(out, "使用 npm test 命令。");
});

test("multiplication and mid-word underscores are NOT treated as markdown", () => {
  const out = markdownToPlainText("计算 2*3=6，变量 my_var 保持不变。");
  assert.equal(out, "计算 2*3=6，变量 my_var 保持不变。");
});

test("table pipes become pauses, separator rows vanish", () => {
  const out = markdownToPlainText("| 名称 | 数值 |\n| --- | --- |\n| 甲 | 1 |");
  assert.ok(!out.includes("|") && !out.includes("---"), `got: ${out}`);
  assert.ok(out.includes("名称") && out.includes("数值") && out.includes("甲") && out.includes("1"));
});

test("empty and whitespace-only input", () => {
  assert.equal(markdownToPlainText(""), "");
  assert.equal(markdownToPlainText("   "), "");
});
