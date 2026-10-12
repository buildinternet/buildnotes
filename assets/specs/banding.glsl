// One gradient, paper to accent, squeezed into a few levels. Top: each pixel rounds to the nearest
// level, so the steps show as bands. Bottom: the same levels, but each pixel adds a little noise
// before rounding, so neighbours land on different levels and the eye averages them back to smooth.
uniform float u_levels;

// Interleaved gradient noise: an even scatter of thresholds across neighbouring pixels.
float noise(vec2 px) { return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715)))); }

void main() {
  vec2 size = u_resolution / u_dpr;
  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_dpr;
  float x = clamp(p.x / size.x, 0.0, 1.0);
  float steps = u_levels - 1.0;
  bool dithered = p.y > size.y * 0.5;
  float level = dithered ? floor(x * steps + noise(gl_FragCoord.xy)) / steps : floor(x * steps + 0.5) / steps;
  vec3 col = mix(u_paper, u_accent, level);
  if (abs(p.y - size.y * 0.5) < 2.0) col = u_paper;                        // gap between the halves
  gl_FragColor = vec4(col, 1.0);
}
