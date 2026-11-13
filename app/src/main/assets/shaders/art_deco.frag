// Art Deco — 1920s gold fan motifs on black lacquer, shimmering as light passes.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.01;
    vec2 g = p * vec2(5.0, 5.0);
    // offset every other row like fish scales
    float row = floor(g.y);
    g.x += mod(row, 2.0) * 0.5;
    vec2 id = floor(g);
    vec2 f = fract(g) - vec2(0.5, 0.0);
    // fan centred at the bottom of each cell
    float r = length(f);
    float a = atan(f.x, f.y);
    float inFan = step(r, 0.62);
    float rays = smoothstep(0.08, 0.0, abs(fract(a / PI * 7.0 + 0.5) - 0.5)) * step(0.12, r);
    float arcs = smoothstep(0.012, 0.0, abs(r - 0.62)) + smoothstep(0.01, 0.0, abs(r - 0.45)) + smoothstep(0.01, 0.0, abs(r - 0.25));
    float core = smoothstep(0.1, 0.08, r);
    float lines = clamp((rays * 0.7 + arcs) * inFan + core, 0.0, 1.0);

    // light sweeping diagonally across the gold
    float sweep = exp(-pow(dot(p, vec2(0.7, 0.7)) - (fract(uTime * 0.06) * 2.4 - 1.2), 2.0) * 25.0);
    vec3 gold = mix(uC1 * 0.6, uC2, 0.5 + 0.5 * sin((p.x + p.y) * 12.0));
    vec3 col = uC3 * (0.9 + 0.1 * vnoise(p * 200.0));
    col = mix(col, gold * (0.7 + 0.9 * sweep), lines);
    col += uC2 * lines * sweep * 0.4;
    // a central medallion
    vec2 m = p - vec2(0.0, 0.0);
    float med = abs(sdCircle(m, 0.12)) - 0.006;
    float med2 = abs(sdBox(rot2(0.785) * m, vec2(0.085))) - 0.004;
    float medIn = fillAA(sdCircle(m, 0.118));
    col = mix(col, uC3, medIn);
    float star = smoothstep(0.01, 0.0, abs(fract(atan(m.y, m.x) / TAU * 16.0) - 0.5) * length(m) * 6.0) * step(length(m), 0.1);
    col = mix(col, gold * (0.9 + 0.8 * sweep), clamp(fillAA(med) + fillAA(med2) + star * 0.8, 0.0, 1.0));
    col = filmLook(col, 0.15);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
