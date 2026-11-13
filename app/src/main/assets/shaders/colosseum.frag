// Roman Ruins — the great amphitheatre at sunset, tiers of arches glowing gold.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC2, uC1, smoothstep(-0.1, 0.45, p.y));
    vec2 sp = p - vec2(-0.14, 0.02);
    col += uC3 * 0.012 / (length(sp) + 0.02);
    col = mix(col, mix(uC3, uC2, 0.5), smoothstep(0.5, 0.8, fbm4(vec2(p.x * 2.2 + uTime * 0.01, p.y * 8.0))) * 0.35);

    // the curved wall: three arcaded tiers and a solid attic, broken away on the right
    float base = -0.14;
    float tierH = 0.065;
    float curve = 0.03 * (1.0 - pow(p.x / 0.4, 2.0));       // gentle curve of the ellipse
    float y = p.y - base - curve;
    float ruin = 0.30 - smoothstep(0.0, 0.25, p.x) * 0.16 + 0.02 * fbm4(vec2(p.x * 20.0, 1.0)) - 0.03 * step(0.6, fract(p.x * 9.0)) * smoothstep(0.05, 0.2, p.x);
    float wall = step(0.0, y) * step(y, ruin) * step(abs(p.x), 0.4);
    float tier = floor(y / tierH);
    float ty = fract(y / tierH);
    vec2 cell = vec2(fract(p.x * 18.0) - 0.5, ty);
    float archHole = (step(length(vec2(cell.x / 0.3, (cell.y - 0.55) / 0.3)), 1.0) + step(abs(cell.x), 0.3) * step(0.1, cell.y) * step(cell.y, 0.55)) * step(tier, 2.5);
    float pillar = smoothstep(0.06, 0.0, abs(abs(cell.x) - 0.42)) * 0.25;
    float cornice = smoothstep(0.08, 0.0, abs(ty - 0.95)) * 0.3;
    // stone lit warmly from the left
    vec3 stone = mix(uC3 * 0.85, uC1 * 0.55, smoothstep(-0.3, 0.4, p.x)) * (0.8 + 0.2 * fbm4(p * 50.0));
    stone *= 1.0 + pillar + cornice;
    // through the arches you see the darker inner wall
    vec3 inner = uC1 * 0.25 * (0.7 + 0.3 * ty);
    vec3 wallCol = mix(stone, inner, clamp(archHole, 0.0, 1.0));
    col = mix(col, wallCol, wall);
    // ground and fallen stones
    if (p.y < base + curve * 0.0) col = mix(uC1 * 0.35, uC1 * 0.15, smoothstep(base, base - 0.3, p.y)) * (0.85 + 0.15 * fbm4(p * 30.0));
    // umbrella pines and cypresses in silhouette
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 c = p - vec2(-0.2 + fi * 0.21, base - 0.02);
        float trunk = sdBox(c - vec2(0.0, 0.05), vec2(0.003, 0.05));
        float crown = sdRoundBox(c - vec2(0.0, 0.11), vec2(0.05 - fi * 0.01, 0.018), 0.018);
        if (i == 1) crown = sdTriIso(c - vec2(0.0, 0.2), vec2(0.016, 0.17));
        col = mix(col, vec3(0.04, 0.035, 0.03), fillAA(min(trunk, crown)));
    }
    col = filmLook(col, 0.7);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
