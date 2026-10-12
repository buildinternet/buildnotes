// options.mjs — the turn as a table: one row per option the record shows, the winner marked.
//
// Spec: a Markdown table. Bold the first cell of the chosen row; a column headed "Verdict" is set
// small. On a narrow screen each row becomes a card, with each cell labelled by its column.
//   | Option | Verdict | Why |
//   |---|---|---|
//   | One shared database | rejected | Migrations on one branch break the others. |
//   | **Database per branch** | chosen | Isolation for the cost of a 20 s copy. |

import { esc, inline, mdTable, unbold, warn } from "./util.mjs";

export const parse = (text) => mdTable(text);

export function render({ head, rows }, { id = "options" } = {}) {
  const chosen = rows.filter((r) => unbold(r[0]).bold).length;
  if (chosen !== 1) warn(`options "${id}": ${chosen} chosen rows; bold the first cell of exactly one`);
  if (rows.length > 5) warn(`options "${id}": ${rows.length} options; keep the ones the record shows were weighed`);
  const verdict = head.findIndex((h) => /^verdict$/i.test(h));
  const out = [`<div class="options vtable">`, `<table>`];
  out.push(`  <thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>`);
  out.push(`  <tbody>`);
  for (const r of rows) {
    const first = unbold(r[0]);
    const cells = r.map((c, k) => {
      const text = k === 0 ? first.text : c;
      const cls = k === verdict ? ` class="verdict"` : "";
      return `<td${cls} data-label="${esc(head[k])}">${inline(text)}</td>`;
    });
    out.push(`    <tr${first.bold ? ` class="chosen"` : ""}>${cells.join("")}</tr>`);
  }
  out.push(`  </tbody>`, `</table>`, `</div>`);
  return out.join("\n");
}
