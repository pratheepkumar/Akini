// Kaleidoscope — mirrored fragments of colour turning slowly around the centre.
// uP.x = number of mirror segments.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p -= uTilt * 0.02;
    float r = length(p);
    float a = atan(p.y, p.x) + uTime * 0.03;
    float seg = TAU / uP.x;
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    vec2 q = vec2(cos(a), sin(a)) * r;
    q = q * 3.0 + vec2(uTime * 0.05, 0.0);
    vec2 w = vec2(fbm4(q + vec2(0.0, uTime * 0.03)), fbm4(q + 4.0));
    float f = fbm4(q + 2.0 * w);
    vec3 col = palette(f * 1.4 + r * 0.6 - uTime * 0.02, vec3(0.5), vec3(0.5), vec3(1.0), uC1);
    col *= 0.25 + 1.0 * smoothstep(0.25, 0.85, f);
    // jewel-like facets
    float facet = abs(fract(f * 8.0) - 0.5);
    col += vec3(1.0) * smoothstep(0.05, 0.0, facet) * 0.15;
    col *= smoothstep(0.75, 0.2, r) * 0.9 + 0.1;
    col += uC2 * exp(-r * 18.0) * 0.6;
    gl_FragColor = vec4(finish(tonemap(col * 1.3)), 1.0);
}
