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

test("code: a start anchor finds the block, and a stray bracket warns", () => {
  const source = "import x;\nfunction f(a) {\n  const s = \"}\";\n  if (a) {\n    return 1;\n  }\n  return 2;\n}\nconst y = 1;\n";
  const plain = (spec) => excerpt({ file: "f.js", ...spec }, source).html.replace(/<[^>]+>/g, "");
  assert.equal(plain({ start: "function f(" }), 'function f(a) {\n  const s = &quot;}&quot;;\n  if (a) {\n    return 1;\n  }\n  return 2;\n}');
  assert.equal(plain({ start: "function f(", cut: "3-5" }), 'function f(a) {\n  const s = &quot;}&quot;;\n  …\n  return 2;\n}');
  assert.equal(plain({ start: "if (a)", end: "return 2" }), "if (a) {\n  return 1;\n}\nreturn 2;");
  assert.equal(excerpt({ file: "f.js", start: "function f(" }, source).stray, false);
  assert.equal(excerpt({ file: "f.js", lines: "3-8" }, source).stray, true);
  assert.throws(() => excerpt({ file: "f.js", start: "nope" }, source), /no line in f\.js contains "nope"/);
});

test("code: reads the committed file from git and captions it with the path", () => {
  const html = code({ file: "scripts/gather.mjs", rev: "2cddb0c", lines: "159-167", cut: "160-166" }, { base: root });
  assert.match(html, /<figcaption><span>scripts\/gather\.mjs<\/span><button type="button" class="copy" aria-label="Copy code">/);
  assert.match(html, /<span class="k">let<\/span> p;\n<span class="cut">…<\/span>\n<span class="k">if<\/span> \(isBotPr/);
  assert.throws(() => code({ file: "nope.js" }, { base: root }), /can't read nope\.js/);
});

test("term: one command, kept lines with gaps, bare caption", () => {
  const html = term({ cmd: "ls", out: ["a", "b", "c", "d"], keep: "1,3" });
  assert.match(html, /<figcaption><span>Terminal<\/span><button type="button" class="copy" aria-label="Copy command">/);
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

test("steps: --i/--n, hot box, live highlight", async () => {
  const { render } = await import("../../scripts/viz/steps.mjs");
  const html = render({ label: "Flow", live: true, steps: [{ label: "A", sub: "a" }, { label: "B", hot: true }] });
  assert.match(html, /<ol class="steps live" style="--n:2" aria-label="Flow">/);
  assert.match(html, /<li style="--i:1" class="hot"><div class="box"><b>B<\/b><\/div><\/li>/);
  assert.throws(() => render({ steps: [{ label: "A" }] }), /at least two/);
});

test("shader: attributes, fallback, and the checks on its source", async () => {
  const { render } = await import("../../scripts/viz/shader.mjs");
  const html = render({ label: "Waves <cross>", glsl: "uniform vec2 u_a; void main() { gl_FragColor = vec4(u_paper, 1.0); }", loop: 4, rest: 1, uniforms: { u_a: [0.3, 0.5] } });
  assert.match(html, /<div class="shader" data-loop="4" data-rest="1" data-uniforms="\{&quot;u_a&quot;:\[0\.3,0\.5\]\}" style="--aspect:16 \/ 9">/);
  assert.match(html, /<canvas role="img" aria-label="Waves &lt;cross&gt;"><\/canvas>/);
  assert.match(html, /<div class="fallback">Waves &lt;cross&gt;<\/div>/);
  assert.throws(() => render({ glsl: "void main() {}" }), /needs a label/);
  assert.throws(() => render({ label: "x", glsl: "void f() {}" }), /void main/);
  assert.throws(() => render({ label: "x", glsl: "uniform float u_time; void main() {}" }), /declared for you/);
  assert.throws(() => render({ label: "x", glsl: "void main() {}</script>" }), /<\/script/);
  assert.throws(() => render({ label: "x", glsl: "void main() {}", uniforms: { u_time: 1 } }), /built-in/);
  render({ label: "x", glsl: "void main() { float t = u_time; }", loop: 2 }, { id: "t" });
  assert.match(takeWarnings().join(" "), /build the motion on u_phase/);
});

test("build re-renders a shader when only its .glsl changed", async () => {
  const { build } = await import("../../scripts/viz.mjs");
  const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "viz-shader-"));
  mkdirSync(join(dir, "viz"));
  writeFileSync(join(dir, "viz/s.json"), JSON.stringify({ label: "x", frag: "s.glsl", loop: 2 }));
  writeFileSync(join(dir, "viz/s.glsl"), "void main() { gl_FragColor = vec4(u_paper, 1.0); }");
  const once = build("<figure>\n<!-- viz shader viz/s.json -->\n<!-- /viz -->\n</figure>", dir).html;
  assert.equal(build(once, dir, { check: true }).problems.length, 0);
  writeFileSync(join(dir, "viz/s.glsl"), "void main() { gl_FragColor = vec4(u_ink, 1.0); }");
  assert.match(build(once, dir, { check: true }).problems[0], /changed since the last render/);
});

test("matrix warns on a mark carrying a value; code takes wrap", () => {
  takeWarnings();
  matrix.render(mdTable("| | A | **B** |\n|---|---|---|\n| How many | ✓ 10 per account | 10 per workspace |\n| Shared | ✗ | ✓ every member |"), { id: "m" });
  assert.deepEqual(takeWarnings(), ['matrix "m", How many / A: "✓ 10 per account" puts a mark on a value; write the value as plain text ("10 per account")']);
  assert.match(code({ file: "a.js", source: "const a = 1;\n", wrap: true }), /^<figure class="code wrap">/);
  assert.match(code({ file: "a.js", source: "const a = 1;\n" }), /^<figure class="code">/);
});
