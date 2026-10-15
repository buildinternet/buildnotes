// shader.mjs — a WebGL figure drawn by a fragment shader. The template's script runs it: it sizes the
// canvas for the screen, feeds the uniforms below, follows the light/dark theme, pauses off screen,
// holds a still frame for reduced motion, and shows the fallback text when WebGL isn't available.
//
// Spec:
//   { "label": "Without jitter every client retries at once and the spike passes capacity",   (required)
//     "frag": "jitter.glsl",            (a file next to the spec) or "glsl": "void main() { … }"
//     "loop": 5,                         (seconds; u_phase runs 0→1 once per loop, so motion built on it loops exactly;
//                                         leave it out for a still figure)
//     "rest": 1,                         (seconds; the frame shown with reduced motion; default 0)
//     "aspect": "16 / 9",                (default 16 / 9)
//     "uniforms": { "u_a": [0.3, 0.5] }, (extra uniforms: a number or 2–4 numbers; declare them in the shader)
//     "labels": [{ "text": "capacity", "x": 0.98, "y": 0.7, "align": "end", "tone": "mark" }],
//                                        (text over the canvas: x, y 0–1 from the top left to the label's middle; align start|center|end;
//                                         tone muted (default), ink or mark. Shaders can't draw text.)
//     "fallback": "…" }                  (shown without WebGL; default the label)
//
// The shader gets these, declared for it (don't redeclare them):
//   vec2 u_resolution (canvas px)   float u_time (s)    float u_phase (0–1 per loop)   float u_loop (s)
//   float u_dpr                     vec2 u_pointer (0–1 across and up the canvas, or -1 when away)
//   float u_dark (1 in the dark theme)
//   vec3 u_paper, u_ink, u_muted, u_accent, u_accent_wash, u_dim, u_mark (the page's colour tokens)
//   #define TAU 6.28318530718

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { esc, warn } from "./util.mjs";

const RESERVED = new Set(["u_resolution", "u_time", "u_phase", "u_loop", "u_dpr", "u_pointer", "u_dark", "u_paper", "u_ink", "u_muted", "u_accent", "u_accent_wash", "u_dim", "u_mark"]);

// The shader file, so viz.mjs build can tell when it changed.
export const deps = (spec, base) => (spec.frag ? [resolve(base ?? ".", spec.frag)] : []);

export function render(spec, { id = "shader", base } = {}) {
  if (!spec.label) throw new Error("shader: the spec needs a label: what the figure shows, in a sentence (screen readers and the fallback use it)");
  let glsl = spec.glsl;
  if (!glsl && spec.frag) {
    try { glsl = readFileSync(resolve(base ?? ".", spec.frag), "utf8"); } catch { throw new Error(`shader: can't read ${spec.frag}`); }
  }
  if (!glsl) throw new Error('shader: the spec needs "frag" (a .glsl file) or "glsl" (the source)');
  if (/<\/script/i.test(glsl)) throw new Error("shader: the source can't contain </script");
  if (!/\bvoid\s+main\s*\(/.test(glsl)) throw new Error("shader: the source needs a void main()");
  for (const name of RESERVED) if (new RegExp(`uniform\\s+\\w+\\s+${name}\\b`).test(glsl)) throw new Error(`shader: ${name} is declared for you; remove its declaration`);
  const uniforms = spec.uniforms ?? {};
  for (const [name, v] of Object.entries(uniforms)) {
    const n = [].concat(v);
    if (!/^u_\w+$/.test(name) || RESERVED.has(name)) throw new Error(`shader: uniform "${name}" needs a u_ name that isn't one of the built-in ones`);
    if (n.length < 1 || n.length > 4 || !n.every(Number.isFinite)) throw new Error(`shader: uniform ${name} must be a number or 2–4 numbers`);
    if (!new RegExp(`uniform\\s+\\w+\\s+${name}\\b`).test(glsl)) warn(`shader "${id}": ${name} is set in the spec but not declared in the shader`);
  }
  const moves = /\bu_(time|phase)\b/.test(glsl);
  if (moves && !spec.loop) warn(`shader "${id}": it moves but has no "loop"; motion won't repeat cleanly, and export needs --seconds`);
  if (/\bu_time\b/.test(glsl) && spec.loop) warn(`shader "${id}": uses u_time with a loop; build the motion on u_phase so the loop closes exactly`);
  const labels = (spec.labels ?? []).map((l, i) => {
    if (!l.text || !(l.x >= 0 && l.x <= 1) || !(l.y >= 0 && l.y <= 1)) throw new Error(`shader: label ${i + 1} needs text, and x and y from 0 to 1`);
    const shift = { start: "0", center: "-50%", end: "-100%" }[l.align ?? "start"];
    if (!shift) throw new Error(`shader: label ${i + 1}: align is start, center or end`);
    const tone = l.tone && l.tone !== "muted" ? ` ${l.tone}` : "";
    if (tone && !/^ (ink|mark)$/.test(tone)) throw new Error(`shader: label ${i + 1}: tone is muted, ink or mark`);
    return `\n  <span class="tag${tone}" aria-hidden="true" style="left:${l.x * 100}%;top:${l.y * 100}%;translate:${shift} -50%">${esc(l.text)}</span>`;
  }).join("");
  const attrs = [
    spec.loop ? ` data-loop="${Number(spec.loop)}"` : "",
    spec.rest ? ` data-rest="${Number(spec.rest)}"` : "",
    Object.keys(uniforms).length ? ` data-uniforms="${esc(JSON.stringify(uniforms))}"` : "",
  ].join("");
  return `<div class="shader"${attrs} style="--aspect:${esc(spec.aspect ?? "16 / 9")}">
  <canvas role="img" aria-label="${esc(spec.label)}"></canvas>${labels}
  <script type="x-shader/x-fragment">
${glsl.trim()}
  </script>
  <div class="fallback">${esc(spec.fallback ?? spec.label)}</div>
</div>`;
}
