// Dharma Wheel — the eight-spoked wheel in gold, turning slowly above a lotus.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p -= uTilt * 0.01;
    vec2 c = vec2(0.0, 0.06);
    vec2 q = p - c;
    float r = length(q);
    vec3 col = mix(uC3 * 0.45, uC3 * 0.06, smoothstep(0.0, 0.6, r));
    // soft rays behind
    float a0 = atan(q.y, q.x);
    col += uC2 * pow(0.5 + 0.5 * cos(a0 * 16.0 - uTime * 0.05), 10.0) * exp(-r * 3.5) * 0.25;

    float spin = uTime * 0.08;
    vec2 w = rot2(spin) * q;
    float a = atan(w.y, w.x);
    float R = 0.17;
    float d = 1e3;
    // rim (double ring) and hub
    d = min(d, abs(r - R) - 0.009);
    d = min(d, abs(r - R * 0.86) - 0.004);
    d = min(d, abs(r - 0.035) - 0.008);
    d = min(d, sdCircle(q, 0.012));
    // eight spokes, each widening toward the rim, with a jewel midway
    float sector = TAU / 8.0;
    float sa = mod(a + sector * 0.5, sector) - sector * 0.5;
    vec2 sp = vec2(cos(sa), sin(sa)) * r;
    float spoke = sdBox(sp - vec2(0.1, 0.0), vec2(0.06, 0.0035 + sp.x * 0.02));
    d = min(d, spoke);
    d = min(d, sdCircle(sp - vec2(0.1, 0.0), 0.009));
    // knobs on the outside of the rim
    d = min(d, sdCircle(sp - vec2(R + 0.018, 0.0), 0.009));
    float shape = fillAA(d);
    // polished gold: brighter on the upper-left, a glint sweeping round
    float shade = 0.75 + 0.35 * dot(normalize(q + 1e-4), normalize(vec2(-0.6, 0.8)));
    float glint = pow(0.5 + 0.5 * cos(a0 - uTime * 0.5), 30.0);
    vec3 gold = mix(uC1, uC2, 0.5 + 0.5 * sin(r * 40.0)) * shade + vec3(1.0, 0.95, 0.8) * glint * 0.6;
    col = mix(col, gold, shape);
    col += uC2 * exp(-abs(d) * 90.0) * 0.12;

    // lotus pedestal
    vec2 lp = p - vec2(0.0, c.y - R - 0.07);
    float lotus = 1e3;
    for (int i = 0; i < 7; i++) {
        float fi = float(i) - 3.0;
        vec2 pp = rot2(fi * 0.32) * (lp - vec2(0.0, -0.04));
        lotus = min(lotus, (length(vec2(pp.x / 0.028, (pp.y - 0.05) / 0.05)) - 1.0) * 0.028);
    }
    lotus = max(lotus, -lp.y - 0.04);
    vec3 lotusCol = mix(uC1 * 0.6, uC2, smoothstep(-0.04, 0.05, lp.y));
    col = mix(col, lotusCol, fillAA(lotus));
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.15)), 1.0);
}
