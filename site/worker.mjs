// worker.mjs — the website's Worker script. Static assets serve everything; this runs first only for the
// example videos (assets.run_worker_first in wrangler.jsonc) to answer HTTP Range requests, which the
// static asset layer ignores: it returns the whole file as 200 even on a cache hit, with no Accept-Ranges,
// so a browser cannot scrub the video. The script fetches the asset, slices the requested bytes and
// returns 206 with Content-Range; every video response carries Accept-Ranges: bytes.

export default {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(request);
    if (!asset.ok || !/\.mp4$/.test(new URL(request.url).pathname)) return asset;
    const buf = await asset.arrayBuffer();
    return ranged(request.headers.get("Range"), buf, asset.headers);
  },
};

// A full or partial response for `buf` per a Range header value (null for none). Only one range is
// honoured; a malformed or unsatisfiable one gets 416 with the size, as RFC 9110 asks.
export function ranged(range, buf, headers) {
  const size = buf.byteLength;
  const h = new Headers(headers);
  h.set("Accept-Ranges", "bytes");
  if (!range) {
    h.set("Content-Length", String(size));
    return new Response(buf, { status: 200, headers: h });
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start, end;
  if (m && m[1] !== "") { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  else if (m && m[2] !== "") { start = Math.max(size - Number(m[2]), 0); end = size - 1; }
  if (!m || Number.isNaN(start) || start >= size || start > end) {
    h.set("Content-Range", `bytes */${size}`);
    h.delete("Content-Length");
    return new Response(null, { status: 416, headers: h });
  }
  h.set("Content-Range", `bytes ${start}-${end}/${size}`);
  h.set("Content-Length", String(end - start + 1));
  return new Response(buf.slice(start, end + 1), { status: 206, headers: h });
}
