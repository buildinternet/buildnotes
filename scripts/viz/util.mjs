// Shared helpers for the viz renderers.

import { createHash } from "node:crypto";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Short content hash, stamped into a viz marker so lint can tell when a spec changed after its render.
export const hash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 6);

// A slug for ids: "From push to preview" → "from-push-to-preview".
export const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "fig";

// Rough text widths in SVG units, for fit checks and layout. The template's fonts:
// labels 13px Schibsted Grotesk 600, sub-labels 11px JetBrains Mono, edge labels 10.5px mono.
export const W_LABEL = 7.6, W_SUB = 6.7, W_EDGE = 6.4;
export const width = (s, per) => Math.max(0, ...String(s ?? "").split("\n").map((l) => l.length * per));

// Round to 0.1 so paths are short and vertices compare exactly.
export const r = (n) => Math.round(n * 10) / 10;

const warnings = [];
export const warn = (msg) => warnings.push(msg);
export const takeWarnings = () => warnings.splice(0);
