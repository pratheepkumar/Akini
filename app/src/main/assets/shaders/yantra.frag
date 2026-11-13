// Sri Yantra — the sacred geometry of interlocking triangles, drawn in glowing gold.

float triLine(vec2 p, vec2 apex, vec2 size, float down, float w) {
    vec2 q = p - apex;
    if (down > 0.5) q.y = -q.y;
    return smoothstep(w, 0.0, abs(sdTriIso(q, size)));
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p -= uTilt * 0.01;
    vec2 q = p - vec2(0.0, 0.03);
    float r = length(q);
    float w = 2.0 / uRes.y;
    vec3 col = mix(uC3 * 0.4, uC3 * 0.08, smoothstep(0.0, 0.6, r));
    float g = 0.0;
    float S = 0.17;
    // four upward (Shiva) and five downward (Shakti) triangles
    g += triLine(q, vec2(0.0, S * 0.95), vec2(S * 0.95, S * 1.55), 0.0, w);
    g += triLine(q, vec2(0.0, S * 0.62), vec2(S * 0.7, S * 1.05), 0.0, w);
    g += triLine(q, vec2(0.0, S * 0.42), vec2(S * 0.5, S * 0.75), 0.0, w);
    g += triLine(q, vec2(0.0, S * 0.20), vec2(S * 0.32, S * 0.45), 0.0, w);
    g += triLine(q, vec2(0.0, -S * 0.95), vec2(S * 0.95, S * 1.6), 1.0, w);
    g += triLine(q, vec2(0.0, -S * 0.75), vec2(S * 0.78, S * 1.2), 1.0, w);
    g += triLine(q, vec2(0.0, -S * 0.52), vec2(S * 0.6, S * 0.85), 1.0, w);
    g += triLine(q, vec2(0.0, -S * 0.35), vec2(S * 0.42, S * 0.55), 1.0, w);
    g += triLine(q, vec2(0.0, -S * 0.18), vec2(S * 0.22, S * 0.28), 1.0, w);
    // circles and lotus petal rings (8 and 16 petals)
    g += smoothstep(w, 0.0, abs(r - S * 1.12));
    float a = atan(q.y, q.x);
    float p8 = abs(fract(a / TAU * 8.0) - 0.5) * 2.0;
    g += smoothstep(w * 1.5, 0.0, abs(r - (S * 1.15 + S * 0.25 * (1.0 - p8 * p8))));
    g += smoothstep(w, 0.0, abs(r - S * 1.42));
    float p16 = abs(fract(a / TAU * 16.0) - 0.5) * 2.0;
    g += smoothstep(w * 1.5, 0.0, abs(r - (S * 1.45 + S * 0.2 * (1.0 - p16 * p16))));
    g += smoothstep(w, 0.0, abs(r - S * 1.68)) + smoothstep(w, 0.0, abs(r - S * 1.74));
    // the square enclosure with four gates
    vec2 aq = abs(q);
    for (int i = 0; i < 3; i++) {
        float e = S * (1.92 + float(i) * 0.07);
        float sq = abs(max(aq.x, aq.y) - e);
        float gate = step(min(aq.x, aq.y), S * 0.28) * step(S * 1.85, max(aq.x, aq.y));
        g += smoothstep(w, 0.0, sq) * (1.0 - gate * step(1.5, float(i) + 0.6));
    }
    g = clamp(g, 0.0, 1.5);
    // light pulses outward from the centre point (bindu)
    float pulse = 0.65 + 0.35 * pow(0.5 + 0.5 * sin(r * 30.0 - uTime * 1.2), 3.0);
    vec3 gold = mix(uC1, uC2, smoothstep(0.0, 0.35, r));
    col += gold * g * pulse;
    col += gold * exp(-abs(sdBox(q, vec2(S * 1.95))) * 40.0) * 0.08;
    col += uC2 * 0.0006 / (r * r + 0.0006) * (0.8 + 0.2 * sin(uTime));
    col += uC2 * exp(-r * 5.0) * 0.1;
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
