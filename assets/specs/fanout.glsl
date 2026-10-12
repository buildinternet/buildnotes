// One request fans out: a wave leaves the centre and lights each server (dot) as it arrives,
// then the light fades. By the end of the loop every dot is dark again, so the loop closes cleanly.
void main() {
  vec2 p = gl_FragCoord.xy / u_dpr;                 // CSS pixels, so the grid keeps its spacing
  vec2 size = u_resolution / u_dpr;
  float cell = 22.0;
  vec2 c = (floor(p / cell) + 0.5) * cell;          // this cell's dot
  float d = distance(c, size * 0.5);
  float reach = length(size) * 0.5 + 240.0;
  float front = u_phase * reach;
  float lit = step(d, front) * exp(-(front - d) / 60.0);
  bool hub = d < cell * 0.5;                        // the dot the request starts from
  float r = hub ? 5.0 : mix(1.6, 3.4, lit);
  float m = 1.0 - smoothstep(r - 0.7, r + 0.7, distance(p, c));
  vec3 tint = mix(u_dim, u_accent, lit);
  gl_FragColor = vec4(mix(u_paper, hub ? u_ink : tint, m), 1.0);
}
