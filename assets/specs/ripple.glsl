// Two sources send out ripples. Where crests from both meet, the water stands highest (accent);
// where a crest meets a trough, it stays flat. Four crests leave each source per loop.
uniform vec2 u_a;
uniform vec2 u_b;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = gl_FragCoord.xy / u_resolution.y;
  vec2 a = u_a * vec2(aspect, 1.0);
  vec2 b = u_b * vec2(aspect, 1.0);
  float da = distance(uv, a);
  float db = distance(uv, b);
  float k = 42.0;
  float t = TAU * u_phase * 4.0;
  float w = sin(k * da - t) / (1.0 + 2.0 * da) + sin(k * db - t) / (1.0 + 2.0 * db);
  float h = clamp(w * 0.3 + 0.5, 0.0, 1.0);
  vec3 col = mix(u_paper, u_accent_wash, smoothstep(0.35, 0.65, h));
  col = mix(col, u_accent, smoothstep(0.72, 0.92, h));
  float src = min(da, db);
  col = mix(col, u_ink, 1.0 - smoothstep(0.011, 0.016, src));
  gl_FragColor = vec4(col, 1.0);
}
