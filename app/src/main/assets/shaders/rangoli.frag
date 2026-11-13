// Rangoli — a festive floor pattern of coloured powder, petals and kolam dots,
// slowly turning and shimmering.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p -= uTilt * 0.01;
    vec2 q = p - vec2(0.0, 0.02);
    float r = length(q);
    float a = atan(q.y, q.x);
    // terracotta floor with powder texture
    vec3 col = mix(vec3(0.16, 0.07, 0.05), vec3(0.09, 0.04, 0.03), smoothstep(0.0, 0.6, r));
    col *= 0.9 + 0.1 * vnoise(p * 300.0);
    float grain = 0.88 + 0.12 * vnoise(p * 500.0);

    // rings of petals, each ring with its own colour and petal count
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float count = 6.0 + fi * 4.0;
        float spin = uTime * 0.02 * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0);
        float pa = fract((a + spin) / TAU * count) - 0.5;            // -0.5..0.5 across a petal
        float rIn = 0.03 + fi * 0.055;
        float rOut = rIn + 0.06;
        float t = (r - rIn) / (rOut - rIn);
        float width = 0.45 * sin(clamp(t, 0.0, 1.0) * PI);
        float petal = step(0.0, t) * step(t, 1.0) * smoothstep(width, width - 0.06, abs(pa));
        vec3 pc = fi < 0.5 ? uC1 : (fi < 1.5 ? uC2 : (fi < 2.5 ? uC3 : (fi < 3.5 ? mix(uC1, uC2, 0.5) : mix(uC3, vec3(1.0), 0.3))));
        pc *= 0.85 + 0.25 * (1.0 - t);
        col = mix(col, pc * grain, petal);
        // white outline
        float outline = smoothstep(0.08, 0.0, abs(abs(pa) - width)) * step(0.0, t) * step(t, 1.0);
        col = mix(col, vec3(0.95, 0.92, 0.85) * grain, outline * 0.85);
    }
    // centre flower and dots ring (kolam)
    col = mix(col, uC2 * grain, fillAA(r - 0.025));
    col = mix(col, vec3(1.0, 0.95, 0.8), fillAA(r - 0.01));
    float dr = 0.33;
    float dots = smoothstep(0.012, 0.008, length(vec2(fract(a / TAU * 36.0 + uTime * 0.005) - 0.5, (r - dr) * 36.0 / TAU / dr) * vec2(TAU * dr / 36.0, TAU * dr / 36.0)));
    col = mix(col, vec3(0.97, 0.95, 0.9) * grain, dots);
    float wave = smoothstep(0.004, 0.0, abs(r - (0.36 + 0.012 * sin(a * 18.0 + uTime * 0.05))));
    col = mix(col, uC1 * grain, wave);
    // a glimmer of light travelling round the pattern
    float glim = pow(0.5 + 0.5 * cos(a - uTime * 0.4), 20.0) * smoothstep(0.4, 0.05, r);
    col += vec3(1.0, 0.9, 0.7) * glim * 0.2;
    // small diya flames at the four corners of the design
    for (int i = 0; i < 4; i++) {
        float ang = float(i) * 1.5708 + 0.785;
        vec2 dp = q - vec2(cos(ang), sin(ang)) * 0.43;
        float flick = 0.8 + 0.2 * sin(uTime * 7.0 + float(i) * 2.0);
        col += vec3(1.0, 0.65, 0.25) * 0.0012 / (dot(dp, dp) + 0.0012) * flick * 0.6;
    }
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.15)), 1.0);
}
