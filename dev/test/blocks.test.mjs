// Checks for the table, code, terminal and strip renderers. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as options from "../../scripts/viz/options.mjs";
import * as matrix from "../../scripts/viz/matrix.mjs";
import { render as code, highlight, excerpt } from "../../scripts/viz/code.mjs";
import { render as term } from "../../scripts/viz/term.mjs";
import { render as strip } from "../../scripts/viz/strip.mjs";
import { inline, mdTable, takeWarnings } from "../../scripts/viz/util.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("inline Markdown escapes everything else", () => {
  assert.equal(inline("a <b> `x<y>` **bold** [docs](https://e.com)"), 'a &lt;b&gt; <code>x&lt;y&gt;</code> <strong>bold</strong> <a href="https://e.com">docs</a>');
});

test("mdTable reads pipes, escaped pipes, and rejects ragged rows", () => {
  const t = mdTable("intro\n| a | b |\n|---|---|\n| 1 | x \\| y |\n");
  assert.deepEqual(t, { head: ["a", "b"], rows: [["1", "x | y"]] });
  assert.throws(() => mdTable("| a | b |\n|---|---|\n| 1 |"), /1 cells for 2/);
  assert.throws(() => mdTable("no table"), /Markdown table/);
});

test("options: the bold row is chosen, cells carry their column", () => {
  const html = options.render(options.parse("| Option | Verdict | Why |\n|---|---|---|\n| A | rejected | slow |\n| **B** | chosen | fast |"));
  assert.match(html, /<tr class="chosen"><td data-label="Option">B<\/td><td class="verdict" data-label="Verdict">chosen<\/td>/);
  assert.equal((html.match(/data-label=/g) ?? []).length, 6);
  options.render(options.parse("| Option | Why |\n|---|---|\n| A | x |"), { id: "t" });
  assert.match(takeWarnings()[0], /0 chosen rows/);
});

test("matrix: marks get spoken text, the bold column is hot", () => {
  const html = matrix.render(matrix.parse("| | X | **Y** |\n|---|---|---|\n| fast | ✗ | ✓ about 20 s |\n| tidy | ~ | yes |"));
  assert.match(html, /<th class="hot">Y<\/th>/);
  assert.match(html, /<td class="hot" data-label="Y"><span class="val"><span class="mk yes" aria-hidden="true">✓<\/span><span class="vh">yes<\/span> <span class="note">about 20 s<\/span><\/span><\/td>/);
  assert.match(html, /mk no/);
  assert.match(html, /mk part[^]*<span class="vh">partly<\/span>/);
});

test("highlight: comments, strings and keywords; a shell # inside a word is not a comment", () => {
  assert.equal(highlight('const a = "x"; // note', "js"), '<span class="k">const</span> a = <span class="s">&quot;x&quot;</span>; <span class="c">// note</span>');
  assert.equal(highlight("curl https://e.com/#top # fetch", "sh"), 'curl https://e.com/#top <span class="c"># fetch</span>');
  assert.equal(highlight("SELECT id FROM t -- all", "sql"), '<span class="k">SELECT</span> id <span class="k">FROM</span> t <span class="c">-- all</span>');
  assert.equal(highlight("x < y", "unknown"), "x &lt; y");
});

test("code: lines, cuts and dedent from a source", () => {
  const source = "a\n  if (x) {\n    one();\n    two();\n  }\nz\n";
  const { html, shown } = excerpt({ file: "f.js", lines: "2-5", cut: "3-4" }, source);
  assert.equal(html, '<span class="k">if</span> (x) {\n  <span class="cut">…</span>\n}');
  assert.equal(shown, 2);
  assert.throws(() => excerpt({ file: "f.js", lines: "2-9" }, source), /has 6 lines/);
});

test("code: reads the committed file from git and captions it with the path", () => {
  const html = code({ file: "scripts/gather.mjs", rev: "2cddb0c", lines: "159-167", cut: "160-166" }, { base: root });
  assert.match(html, /<figcaption><span>scripts\/gather\.mjs<\/span><\/figcaption>/);
  assert.match(html, /<span class="k">let<\/span> p;\n<span class="cut">…<\/span>\n<span class="k">if<\/span> \(isBotPr/);
  assert.throws(() => code({ file: "nope.js" }, { base: root }), /can't read nope\.js/);
});

test("term: one command, kept lines with gaps, bare caption", () => {
  const html = term({ cmd: "ls", out: ["a", "b", "c", "d"], keep: "1,3" });
  assert.match(html, /<figcaption><span>Terminal<\/span><\/figcaption>/);
  assert.match(html, /\$ <\/span>ls\na\n<span class="dim">…<\/span>\nc\n<span class="dim">…<\/span><\/code>/);
  term({ cmd: "npm test && npm run build", out: "" }, { id: "t" });
  assert.match(takeWarnings()[0], /more than one command/);
  assert.match(term({ cmd: "x", out: ["Error: the build could not find the module you asked for in any of the paths it searched"] }), /class="code term wrap"/);
  assert.throws(() => term({ out: ["x"] }), /cmd/);
});

test("strip: 2–4 frames, last one accented, commit labels warned", () => {
  const html = strip({ frames: [{ label: "Before", term: { out: ["a"] } }, { label: "After", src: "x.png", alt: "x" }] });
  assert.match(html, /--n:2/);
  assert.match(html, /<span class="tag">Before<\/span><figure class="code term"><pre><code>a<\/code><\/pre><\/figure>/);
  assert.match(html, /<span class="tag after">After<\/span><img src="x\.png" alt="x">/);
  assert.throws(() => strip({ frames: [{ label: "x", src: "a" }] }), /use 2 to 4/);
  strip({ frames: [{ label: "a1b2c3d", src: "a", alt: "a" }, { label: "PR #12", src: "b", alt: "b" }] }, { id: "t" });
  assert.equal(takeWarnings().length, 2);
});
