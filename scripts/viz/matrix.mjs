// matrix.mjs — a comparison table: things down the side, options across, marks in the cells.
//
// Spec: a Markdown table. Cells start with ✓ (or yes), ✗ (or no) or ~ (or partly), optionally
// followed by a short note; anything else prints as text. Marks answer yes/no rows; a row whose
// answer is a value (a count, who, a time) takes plain text, and a mark followed by a number warns. Bold a column header to highlight the
// option the post is about. On a narrow screen each row becomes a card.
//   | | Shared DB | **Per branch** | Snapshots |
//   |---|---|---|---|
//   | Isolated migrations | ✗ | ✓ | ✓ |
//   | Ready in under a minute | ✓ | ~ 20 s copy | ✗ |

import { esc, inline, mdTable, unbold, warn } from "./util.mjs";

export const parse = mdTable;

const MARKS = [
  [/^(✓|✔|yes)(?=\s|$)\s*/i, "yes", "✓"],
  [/^(✗|✘|×|no)(?=\s|$)\s*/i, "no", "✗"],
  [/^(~|partly|partial)(?=\s|$)\s*/i, "part", "~"],
];

function cell(text, where) {
  for (const [re, kind, glyph] of MARKS) {
    const m = text.match(re);
    if (m) {
      const note = text.slice(m[0].length);
      if (/^\d/.test(note)) warn(`matrix ${where}: "${text}" puts a mark on a value; write the value as plain text ("${note}")`);
      const said = { yes: "yes", no: "no", part: "partly" }[kind];
      return `<span class="val"><span class="mk ${kind}" aria-hidden="true">${glyph}</span><span class="vh">${said}</span>${note ? ` <span class="note">${inline(note)}</span>` : ""}</span>`;
    }
  }
  return `<span class="val">${inline(text)}</span>`;
}

export function render({ head, rows }, { id = "matrix" } = {}) {
  const cols = head.map(unbold);
  const hot = cols.findIndex((c, k) => k > 0 && c.bold);
  if (head.length > 5) warn(`matrix "${id}": ${head.length - 1} options; more than four rarely reads on a phone`);
  const out = [`<div class="matrix vtable">`, `<table>`];
  out.push(`  <thead><tr>${cols.map((c, k) => `<th${k === hot ? ` class="hot"` : ""}>${inline(c.text)}</th>`).join("")}</tr></thead>`);
  out.push(`  <tbody>`);
  for (const r of rows) {
    const cells = r.map((c, k) => (k === 0
      ? `<th scope="row">${inline(c)}</th>`
      : `<td${k === hot ? ` class="hot"` : ""} data-label="${esc(cols[k].text)}">${cell(c, `"${id}", ${unbold(r[0]).text} / ${cols[k].text}`)}</td>`));
    out.push(`    <tr>${cells.join("")}</tr>`);
  }
  out.push(`  </tbody>`, `</table>`, `</div>`);
  return out.join("\n");
}
