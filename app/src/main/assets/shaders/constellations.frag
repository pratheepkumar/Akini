// Constellations — famous star patterns traced in light across a deep sky.

vec3 acc;          // accumulated light (set in main)
vec2 P;            // current pixel
float pulse;       // per-constellation fade

void star(vec2 c, float mag, vec3 tint) {
    float d = length(P - c);
    float core = smoothstep(0.004 * mag, 0.0, d);
    float halo = 0.00004 * mag / (d * d + 0.00004);
    acc += tint * (core * 1.5 + halo * 0.35);
}

void link(vec2 a, vec2 b) {
    float d = sdSegment(P, a, b);
    // leave a gap around each star
    float gap = smoothstep(0.010, 0.016, length(P - a)) * smoothstep(0.010, 0.016, length(P - b));
    acc += uC1 * (smoothstep(0.0018, 0.0, d) * 0.55 + exp(-d * 180.0) * 0.12) * gap * pulse;
}

float wave(float k) {
    return 0.35 + 0.65 * smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(uTime * 0.35 - k * 1.3));
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    P = p + uTilt * 0.015 + vec2(sin(uTime * 0.01), 0.0) * 0.01;
    acc = vec3(0.0);
    vec3 col = mix(vec3(0.004, 0.006, 0.025), vec3(0.01, 0.015, 0.04), vUv.y);
    // faint Milky Way haze
    vec2 mq = rot2(0.9) * P;
    col += vec3(0.05, 0.06, 0.10) * exp(-mq.y * mq.y * 20.0) * (0.4 + 0.6 * fbm4(mq * vec2(3.0, 8.0)));
    col += starLayer(P, 100.0, 0.93, 2.0) * 0.45;
    col += starLayer(P, 45.0, 0.96, 6.0) * 0.7;

    vec3 W = vec3(0.92, 0.95, 1.0);
    vec3 B = vec3(0.70, 0.82, 1.0);
    vec3 R = vec3(1.0, 0.55, 0.35);

    // Big Dipper (top)
    pulse = wave(0.0);
    vec2 o = vec2(-0.10, 0.36);
    vec2 d1 = o + vec2(0.00, 0.000), d2 = o + vec2(0.055, -0.018), d3 = o + vec2(0.10, -0.012), d4 = o + vec2(0.13, 0.010);
    vec2 d5 = o + vec2(0.20, 0.000), d6 = o + vec2(0.215, 0.050), d7 = o + vec2(0.155, 0.055);
    link(d1, d2); link(d2, d3); link(d3, d4); link(d4, d5); link(d5, d6); link(d6, d7); link(d7, d4);
    star(d1, 1.0, W); star(d2, 1.1, W); star(d3, 1.0, W); star(d4, 0.8, W); star(d5, 1.1, W); star(d6, 1.1, W); star(d7, 0.9, W);

    // Cassiopeia (upper right)
    pulse = wave(1.0);
    o = vec2(0.06, 0.20);
    vec2 c1 = o, c2 = o + vec2(0.035, -0.04), c3 = o + vec2(0.07, -0.005), c4 = o + vec2(0.10, -0.045), c5 = o + vec2(0.14, -0.01);
    link(c1, c2); link(c2, c3); link(c3, c4); link(c4, c5);
    star(c1, 1.0, W); star(c2, 1.0, B); star(c3, 0.9, W); star(c4, 0.9, W); star(c5, 0.8, B);

    // Orion (centre)
    pulse = wave(2.0);
    o = vec2(-0.02, -0.02);
    vec2 bet = o + vec2(-0.075, 0.110), bel = o + vec2(0.060, 0.100), mei = o + vec2(-0.005, 0.150);
    vec2 aln = o + vec2(-0.025, 0.000), alm = o + vec2(0.000, 0.008), min_ = o + vec2(0.025, 0.016);
    vec2 sai = o + vec2(-0.055, -0.100), rig = o + vec2(0.070, -0.090);
    link(bet, mei); link(mei, bel); link(bet, aln); link(bel, min_);
    link(aln, alm); link(alm, min_); link(aln, sai); link(min_, rig);
    star(bet, 1.6, R); star(bel, 1.2, B); star(mei, 0.8, B); star(aln, 1.1, B); star(alm, 1.1, B); star(min_, 1.0, B);
    star(sai, 1.0, B); star(rig, 1.6, B);

    // Southern Cross (lower left)
    pulse = wave(3.0);
    o = vec2(-0.12, -0.24);
    vec2 x1 = o + vec2(0.0, 0.07), x2 = o + vec2(0.0, -0.06), x3 = o + vec2(-0.045, 0.0), x4 = o + vec2(0.04, 0.012);
    link(x1, x2); link(x3, x4);
    star(x1, 1.2, R); star(x2, 1.4, B); star(x3, 1.1, B); star(x4, 1.0, B); star(o + vec2(0.02, -0.025), 0.6, W);

    // Scorpius (bottom right), with red Antares at its heart
    pulse = wave(4.0);
    o = vec2(0.10, -0.20);
    vec2 s1 = o + vec2(-0.03, 0.10), s2 = o + vec2(-0.005, 0.085), s3 = o + vec2(0.02, 0.07), s4 = o + vec2(0.005, 0.03);
    vec2 s5 = o + vec2(0.0, 0.0), s6 = o + vec2(0.01, -0.04), s7 = o + vec2(0.04, -0.08), s8 = o + vec2(0.08, -0.095);
    vec2 s9 = o + vec2(0.10, -0.07), s10 = o + vec2(0.09, -0.04);
    link(s1, s2); link(s2, s3); link(s2, s4); link(s4, s5); link(s5, s6); link(s6, s7); link(s7, s8); link(s8, s9); link(s9, s10);
    star(s1, 0.8, W); star(s2, 1.0, B); star(s3, 0.8, W); star(s4, 1.6, R); star(s5, 0.9, W);
    star(s6, 0.9, W); star(s7, 0.9, W); star(s8, 1.0, B); star(s9, 1.1, B); star(s10, 0.8, W);

    col += acc;
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
