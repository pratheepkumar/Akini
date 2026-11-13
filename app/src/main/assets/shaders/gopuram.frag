// Temple Gopuram — a South Indian temple tower glowing at sunrise, birds circling.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC2, uC1, smoothstep(-0.2, 0.5, p.y));
    vec2 sp = p - vec2(-0.13, -0.05);
    col += uC3 * (fillAA(length(sp) - 0.05) * 0.9 + 0.01 / (length(sp) + 0.02));
    col = mix(col, mix(uC3, vec3(1.0), 0.3), smoothstep(0.55, 0.8, fbm4(vec2(p.x * 2.5 + uTime * 0.01, p.y * 8.0))) * 0.3);

    // stepped tower: tiers narrowing upward, each with niches and sculpture
    float base = -0.26;
    float H = 0.52;
    float t = (p.y - base) / H;
    float tier = floor(t * 9.0);
    float ty = fract(t * 9.0);
    float hw = mix(0.17, 0.06, clamp(t, 0.0, 1.0)) - ty * 0.006;
    float body = step(abs(p.x), hw) * step(0.0, t) * step(t, 1.0);
    // barrel-vaulted roof on top
    vec2 rp = p - vec2(0.0, base + H + 0.022);
    float roof = fillAA(sdRoundBox(rp, vec2(0.075, 0.022), 0.02));
    // kalasam finials
    float kal = 0.0;
    for (int i = 0; i < 5; i++) {
        float x = (float(i) - 2.0) * 0.032;
        vec2 kp = p - vec2(x, base + H + 0.05);
        kal = max(kal, fillAA(min(sdCircle(kp, 0.008), sdBox(kp - vec2(0.0, 0.012), vec2(0.0015, 0.01)))));
    }
    // stone shading: lit from the left by the low sun
    vec3 stone = mix(uC3 * 0.9, uC3 * 0.35, smoothstep(-hw, hw, p.x));
    float niche = step(0.25, ty) * step(ty, 0.8) * step(0.35, fract(p.x * 26.0)) * step(fract(p.x * 26.0), 0.65);
    float ledge = smoothstep(0.12, 0.0, ty) * 0.4 - smoothstep(0.85, 1.0, ty) * 0.35;
    float sculpt = fbm4(vec2(p.x * 120.0, t * 200.0));
    stone *= 1.0 - niche * 0.35 + ledge;
    stone *= 0.85 + 0.25 * sculpt * niche;
    col = mix(col, stone, body);
    col = mix(col, mix(uC3, uC1, 0.4) * 0.8, roof);
    col = mix(col, vec3(1.0, 0.8, 0.4), kal);
    // entrance gateway
    float door = fillAA(min(sdBox(p - vec2(0.0, base + 0.04), vec2(0.03, 0.04)), sdCircle(p - vec2(0.0, base + 0.08), 0.03)));
    col = mix(col, vec3(0.04, 0.025, 0.02), door);
    col += vec3(1.0, 0.7, 0.35) * door * exp(-abs(p.y - base) * 30.0) * 0.4;   // lamp light inside
    // compound wall and coconut palms
    if (p.y < base) col = mix(vec3(0.3, 0.18, 0.1), vec3(0.12, 0.07, 0.04), smoothstep(base, base - 0.3, p.y));
    for (int i = 0; i < 2; i++) {
        float s = i == 0 ? -1.0 : 1.0;
        vec2 tp = p - vec2(s * 0.2, base);
        float trunk = sdSegment(tp, vec2(0.0, 0.0), vec2(s * 0.02, 0.22)) - 0.004;
        float fronds = 1e3;
        for (int k = 0; k < 6; k++) {
            float ang = float(k) * 1.05 + 0.3;
            vec2 tip = vec2(s * 0.02, 0.22) + vec2(cos(ang), sin(ang) * 0.6 - 0.25) * 0.07;
            fronds = min(fronds, sdSegment(tp, vec2(s * 0.02, 0.22), tip) - 0.003);
        }
        col = mix(col, vec3(0.04, 0.03, 0.02), fillAA(min(trunk, fronds)));
    }
    // birds circling the tower
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float ang = uTime * 0.25 + fi * 1.6;
        vec2 b = p - vec2(cos(ang) * 0.2, base + H + 0.08 + sin(ang) * 0.04 + fi * 0.02);
        float flap = sin(uTime * 8.0 + fi * 2.0) * 0.004;
        float bird = min(sdSegment(b, vec2(-0.009, flap), vec2(0.0, 0.0)), sdSegment(b, vec2(0.0, 0.0), vec2(0.009, flap))) - 0.0012;
        col = mix(col, vec3(0.06, 0.04, 0.03), fillAA(bird));
    }
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.15)), 1.0);
}
