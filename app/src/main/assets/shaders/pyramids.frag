// Giza Sunset — the great pyramids glowing in the last light, like an old photograph.

vec3 pyramid(vec2 p, vec2 apex, vec2 size, vec3 col, vec3 lit, vec3 shade) {
    float d = sdTriIso(p - apex, size);
    float inside = fillAA(d);
    // the sunlit face is to the left of the ridge line
    float ridge = (p.x - apex.x) + (apex.y - p.y) * 0.25;
    vec3 face = mix(lit, shade, smoothstep(-0.004, 0.004, ridge));
    // stone courses
    float courses = smoothstep(0.35, 0.5, abs(fract((p.y - apex.y) * 220.0) - 0.5));
    face *= 0.9 + 0.1 * courses;
    return mix(col, face, inside);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    float horizon = -0.05;
    vec3 col = mix(uC2, uC1, smoothstep(horizon, 0.45, p.y));
    vec2 sp = p - vec2(-0.12, horizon + 0.10);
    col += uC3 * (fillAA(length(sp) - 0.055) + 0.01 / (length(sp) + 0.02) * 0.6);
    // wispy high clouds
    float cl = smoothstep(0.55, 0.8, fbm4(vec2(p.x * 2.5 + uTime * 0.008, p.y * 9.0 + 3.0)));
    col = mix(col, mix(uC3, vec3(1.0), 0.3), cl * smoothstep(0.08, 0.3, p.y) * 0.35);
    // heat shimmer near the ground
    vec2 hp = p;
    hp.x += 0.0015 * sin(p.y * 260.0 + uTime * 3.0) * smoothstep(horizon + 0.08, horizon, p.y);

    vec3 lit = mix(uC3, uC2, 0.35);
    vec3 shade = uC1 * 0.45;
    col = pyramid(hp, vec2(-0.20, horizon + 0.11), vec2(0.13, 0.11), col, lit * 0.85, shade);
    col = pyramid(hp, vec2(0.10, horizon + 0.17), vec2(0.20, 0.17), col, lit, shade);
    col = pyramid(hp, vec2(-0.03, horizon + 0.08), vec2(0.09, 0.08), col, lit * 0.95, shade * 0.9);

    // dunes in front
    float dune1 = horizon - 0.03 + 0.025 * sin(p.x * 6.0 + 0.5);
    float dune2 = horizon - 0.12 + 0.04 * sin(p.x * 4.0 + 2.0);
    if (p.y < dune1) col = mix(uC2 * 0.9, uC1 * 0.5, smoothstep(dune1, dune1 - 0.1, p.y));
    if (p.y < dune2) col = mix(uC2 * 0.75, uC1 * 0.35, smoothstep(dune2, dune2 - 0.2, p.y)) * (0.92 + 0.08 * sin(p.x * 120.0 + p.y * 40.0));
    // a camel caravan silhouette crossing the dunes
    float cx = fract(uTime * 0.01) * 0.8 - 0.4;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 c = p - vec2(cx - fi * 0.045, dune2 + 0.012 + 0.04 * sin((cx - fi * 0.045) * 4.0 + 2.0) - 0.04 * sin(p.x * 4.0 + 2.0) * 0.0);
        float camel = sdRoundBox(c - vec2(0.0, 0.012), vec2(0.014, 0.006), 0.005);
        camel = min(camel, sdCircle(c - vec2(-0.004, 0.02), 0.006));
        camel = min(camel, sdSegment(c, vec2(0.012, 0.014), vec2(0.02, 0.028)) - 0.002);
        camel = min(camel, sdSegment(c, vec2(-0.01, 0.006), vec2(-0.01, -0.008)) - 0.0015);
        camel = min(camel, sdSegment(c, vec2(0.01, 0.006), vec2(0.01, -0.008)) - 0.0015);
        col = mix(col, vec3(0.05, 0.035, 0.02), fillAA(camel));
    }
    // birds
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 b = p - vec2(fract(uTime * 0.012 + fi * 0.3) * 0.7 - 0.35, 0.2 + fi * 0.04);
        float flap = sin(uTime * 6.0 + fi) * 0.004;
        float bird = min(sdSegment(b, vec2(-0.01, flap), vec2(0.0, 0.0)), sdSegment(b, vec2(0.0, 0.0), vec2(0.01, flap))) - 0.0012;
        col = mix(col, vec3(0.08, 0.06, 0.04), fillAA(bird));
    }
    col = filmLook(col, 0.8);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
