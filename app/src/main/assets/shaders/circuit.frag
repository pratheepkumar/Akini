// Circuit Board — copper traces on a dark board, with pulses of data racing along them.

// Truchet-style tile: each cell holds a trace in one of four shapes.
vec2 traceDist(vec2 p, out float along) {
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float h = hash12(id);
    float d;
    if (h < 0.25) {
        d = abs(f.y);                         // straight horizontal
        along = f.x + id.x;
    } else if (h < 0.5) {
        d = abs(f.x);                         // straight vertical
        along = f.y + id.y;
    } else if (h < 0.75) {
        d = abs(f.x - f.y) * 0.7071;          // diagonal
        along = (f.x + f.y) * 0.7071 + id.x + id.y;
    } else {
        d = abs(f.x + f.y) * 0.7071;          // other diagonal
        along = (f.x - f.y) * 0.7071 + id.x - id.y;
    }
    return vec2(d, h);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.02;
    vec3 board = mix(vec3(0.004, 0.012, 0.012), vec3(0.01, 0.025, 0.03), fbm4(p * 3.0));
    vec3 col = board;
    float px = 1.0 / uRes.y;

    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        float sc = 14.0 + fi * 12.0;
        vec2 q = p * sc + fi * 7.3;
        float along;
        vec2 td = traceDist(q, along);
        float w = 0.07 - fi * 0.02;
        float edge = px * sc * 1.5;
        float trace = 1.0 - smoothstep(w - edge, w + edge, td.x);
        vec3 metal = mix(uC1, uC1 * 0.6, fi);
        col = mix(col, metal * (0.18 + 0.1 * fbm4(q)), trace * (0.9 - fi * 0.3));
        // vias at cell corners
        vec2 cq = fract(q) - 0.5;
        float via = step(0.82, hash12(floor(q) + 9.0));
        float ring = smoothstep(edge, 0.0, abs(length(cq) - 0.15) - 0.04);
        col = mix(col, metal * 0.35, ring * via);
        // travelling pulses
        float speed = 1.5 + 2.0 * td.y;
        float ph = fract(along * 0.25 - uTime * speed * 0.25 + td.y * 7.0);
        float pulse = exp(-ph * 18.0) * step(0.55, hash12(floor(q) + 2.0));
        float glow = exp(-td.x * 18.0);
        col += uC2 * pulse * (trace * 1.6 + glow * 0.5) * (1.0 - fi * 0.4);
    }
    // a central processor die
    vec2 cp = p - vec2(0.0, 0.05);
    float chip = sdRoundBox(cp, vec2(0.09), 0.01);
    col = mix(col, vec3(0.015, 0.018, 0.022), fillAA(chip));
    col += uC2 * exp(-abs(chip) * 120.0) * (0.35 + 0.25 * sin(uTime * 2.0));
    float pins = step(0.5, fract((cp.x + cp.y * 0.0) * 60.0)) * step(abs(cp.y), 0.11) * step(0.09, abs(cp.y)) * step(abs(cp.x), 0.08);
    pins += step(0.5, fract(cp.y * 60.0)) * step(abs(cp.x), 0.11) * step(0.09, abs(cp.x)) * step(abs(cp.y), 0.08);
    col = mix(col, uC1 * 0.5, pins);
    col += uC3 * fillAA(sdBox(cp, vec2(0.035))) * (0.12 + 0.05 * sin(uTime * 3.0));

    col *= 1.0 - 0.45 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.4)), 1.0);
}
