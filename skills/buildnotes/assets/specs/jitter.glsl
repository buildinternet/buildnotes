// Retries after an outage, with and without jitter. The same 80 clients sit in each halfW. At 0.25 of
// the loop every request has just failed; on the left each client retries after the same fixed delay,
// on the right after a random share of a longer window. Each dot flashes when its client retries,
// and the chart below counts the retries landing at each moment against the server's capacity.
uniform float u_capacity;                 // share of all clients the server can take at once (0–1)

const float N = 80.0, COLS = 16.0, ROWS = 5.0;
const float FAIL = 0.25, SPREAD = 0.5, WINDOW = 0.05;

float hash(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
// When client (col, row) retries, in loop phase.
float fireAt(vec2 cell, float jitter) { return FAIL + jitter * hash(cell) * SPREAD; }

void main() {
  vec2 size = u_resolution / u_dpr;
  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;  // CSS px, y down
  float halfW = size.x * 0.5;
  float jitter = step(halfW, p.x);                                           // 0 left, 1 right
  float x = p.x - jitter * halfW;
  float pad = 16.0, w = halfW - pad * 2.0;
  vec3 col = u_paper;

  // Clients: a grid of dots.
  float top = size.y * 0.17, bottom = size.y * 0.53;
  vec2 cellSize = vec2(w / COLS, (bottom - top) / ROWS);
  vec2 g = vec2(x - pad, p.y - top) / cellSize;
  if (g.x >= 0.0 && g.x < COLS && g.y >= 0.0 && g.y < ROWS) {
    vec2 cell = floor(g);
    float since = u_phase - fireAt(cell, jitter);
    float lit = since >= 0.0 ? exp(-since / WINDOW) : 0.0;
    float r = min(cellSize.x, cellSize.y) * mix(0.2, 0.36, lit);
    float d = length((fract(g) - 0.5) * cellSize);
    col = mix(col, mix(u_dim, u_accent, lit), 1.0 - smoothstep(r - 0.6, r + 0.6, d));
  }

  // Load on the server: retries arriving in the last WINDOW, drawn up to now.
  float base = size.y * 0.9, height = size.y * 0.3;
  float t = (x - pad) / w;
  if (t >= 0.0 && t <= 1.0 && p.y > base - height - 1.0 && p.y < base + 1.0) {
    if (t <= u_phase) {
      float n = 0.0;
      for (float k = 0.0; k < N; k++) {
        float s = t - fireAt(vec2(mod(k, COLS), floor(k / COLS)), jitter);
        n += step(0.0, s) * step(s, WINDOW);
      }
      float level = base - height * n / N;
      if (p.y >= level) col = p.y < base - height * u_capacity ? u_mark : u_accent;
    }
    float cap = abs(p.y - (base - height * u_capacity));
    if (cap < 0.6 && mod(x, 6.0) < 3.0) col = u_muted;                     // capacity, dashed
    if (abs(p.y - base) < 0.6) col = u_dim;                                  // baseline
    if (abs(t - u_phase) * w < 0.6) col = u_muted;                           // now
  }
  gl_FragColor = vec4(col, 1.0);
}
