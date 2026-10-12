// A fifth server joins four. The same 60 keys sit around a circle in each half, in hash order.
// Left, each key goes to server hash mod N: going from 4 to 5 servers reassigns most of them, all
// around the circle. Right, a hash ring: each key goes to the next server clockwise, so the new
// server takes only the keys between it and the server before it. Moved keys light up, and the bar
// under each circle fills with the share that moved; the tick marks the new server's fair share (1/5).

const float N = 60.0, JOIN = 0.3, FADE = 0.9;
const float NEW = 0.22;                                   // the new server's place on the ring

// Integer mod in floats; the 0.5 keeps an approximate GPU division from landing on the wrong side.
float imod(float x, float m) { return floor(mod(x + 0.5, m)); }
// Did key k move? Its hash is a small integer, kept small at every step.
bool movedMod(float k) { float h = imod(imod(k * k, 101.0) * 41.0 + k * 7.0 + 5.0, 101.0); return imod(h, 4.0) != imod(h, 5.0); }
bool movedRing(float k) { float p = (k + 0.5) / N; return p > 0.05 && p <= NEW; }
bool moved(float k, float ring) { return ring > 0.5 ? movedRing(k) : movedMod(k); }
// Keys light in turn around the circle once the server joins; all fade before the loop ends.
float lightAt(float k) { return JOIN + 0.15 * k / N; }
float on(float k) { return step(lightAt(k), u_phase) * (1.0 - smoothstep(FADE, 1.0, u_phase)); }

float disc(vec2 p, vec2 c, float r) { return 1.0 - smoothstep(r - 0.6, r + 0.6, distance(p, c)); }

void main() {
  vec2 size = u_resolution / u_dpr;
  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;   // CSS px, y down
  float halfW = size.x * 0.5;
  float ring = step(halfW, p.x);                                              // 0 mod N, 1 ring
  vec2 c = vec2(halfW * (ring + 0.5), size.y * 0.44);
  float R = size.y * 0.27;
  vec3 col = u_paper;

  // The keys: the nearest one around the circle.
  vec2 d = p - c;
  float a = fract(atan(d.x, -d.y) / TAU);                                     // 0 at the top, clockwise
  float k = floor(a * N);
  float ka = (k + 0.5) / N * TAU;
  vec2 kp = c + R * vec2(sin(ka), -cos(ka));
  float lit = moved(k, ring) ? on(k) : 0.0;
  float r = min(3.2, TAU * R / N * 0.3);
  col = mix(col, mix(u_dim, u_accent, lit), disc(p, kp, r * mix(1.0, 1.35, lit)));

  // The ring's servers: ticks outside the circle; the new one appears when it joins.
  if (ring > 0.5) {
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      float sa = (0.05 + 0.25 * float(i)) * TAU;
      vec2 sp = c + (R + r * 3.0) * vec2(sin(sa), -cos(sa));
      s = max(s, disc(p, sp, r * 1.1));
    }
    col = mix(col, u_ink, s);
    float shown = step(JOIN, u_phase) * (1.0 - smoothstep(FADE, 1.0, u_phase));
    vec2 np = c + (R + r * 3.0) * vec2(sin(NEW * TAU), -cos(NEW * TAU));
    col = mix(col, u_mark, disc(p, np, r * 1.3) * shown);
  }

  // The share that moved so far, against the fair share.
  float y = size.y * 0.8, x0 = c.x - R, w = 2.0 * R;
  if (abs(p.y - y) < 3.0 && p.x >= x0 && p.x <= x0 + w) {
    float n = 0.0;
    for (float j = 0.0; j < N; j++) if (moved(j, ring)) n += on(j);
    float t = (p.x - x0) / w;
    col = mix(u_paper, u_dim, 0.35);
    if (t <= n / N) col = t > 0.2 ? u_mark : u_accent;
  }
  if (abs(p.x - (x0 + w * 0.2)) < 0.75 && abs(p.y - y) < 6.0) col = u_ink;   // fair share
  gl_FragColor = vec4(col, 1.0);
}
