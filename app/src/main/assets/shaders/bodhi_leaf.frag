// Bodhi Leaf — the heart-shaped leaf of the tree of awakening, veins glowing gold,
// swaying gently in dappled light.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.01;
    // dappled background
    vec3 col = mix(uC3 * 0.5, uC3 * 0.12, smoothstep(-0.5, 0.5, p.y));
    float dapple = fbm4(p * 4.0 + vec2(uTime * 0.03, uTime * 0.02));
    col += uC2 * smoothstep(0.55, 0.8, dapple) * 0.15;
    // bokeh
    vec2 bq = p * 6.0 + vec2(0.0, uTime * 0.03);
    vec2 bid = floor(bq);
    vec2 bf = fract(bq) - 0.5 - (hash22(bid) - 0.5) * 0.5;
    col += uC2 * step(0.75, hash12(bid)) * smoothstep(0.25, 0.2, length(bf)) * 0.06;

    // sway
    float sway = sin(uTime * 0.5) * 0.06 + sin(uTime * 1.3) * 0.015;
    vec2 q = rot2(sway) * (p - vec2(0.0, 0.25)) + vec2(0.0, 0.25);
    vec2 l = q - vec2(0.0, 0.0);
    // heart shape with a long drip tip pointing down
    float x = abs(l.x);
    // heart curve (x^2 + y^2 - 1)^3 - x^2 y^3 = 0, notch at the stem, point at the bottom
    vec2 hq = vec2(l.x, l.y - 0.02) / vec2(0.16, 0.19);
    float a2 = dot(hq, hq) - 1.0;
    float f = a2 * a2 * a2 - hq.x * hq.x * hq.y * hq.y * hq.y;
    float heart = f * 0.06;
    // long drip tip below the point
    float tipLen = clamp((-l.y - 0.17) / 0.17, 0.0, 1.0);
    float tip = sdSegment(l, vec2(0.0, -0.17), vec2(0.0, -0.36)) - 0.022 * (1.0 - tipLen) * (1.0 - tipLen);
    float leaf = smin(heart, tip, 0.03);
    float m = smoothstep(0.003, -0.003, leaf);
    // veins: midrib + curved side veins
    float mid = smoothstep(0.004, 0.0, abs(l.x)) * step(-0.36, l.y) * step(l.y, 0.16);
    float side = 0.0;
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float y0 = 0.12 - fi * 0.045;
        float vy = y0 + x * 0.7 - x * x * 1.5;
        side += smoothstep(0.003, 0.0, abs(l.y - vy)) * step(x, 0.16 - fi * 0.016) * m;
    }
    float fine = smoothstep(0.45, 0.5, abs(fract(vnoise(l * 60.0) * 3.0) - 0.5)) * 0.15;
    float veins = clamp(mid + side * 0.8, 0.0, 1.0);
    vec3 green = mix(uC1 * 0.5, uC1, smoothstep(-0.2, 0.2, l.x + l.y * 0.5));
    green *= 0.9 + fine;
    float pulse = 0.6 + 0.4 * sin(uTime * 0.8 - l.y * 10.0);
    vec3 leafCol = mix(green, uC2 * (0.8 + 0.6 * pulse), veins);
    // rim light
    leafCol += uC2 * exp(-abs(leaf) * 120.0) * 0.5;
    col = mix(col, leafCol, m);
    col += uC2 * exp(-abs(leaf) * 40.0) * (1.0 - m) * 0.15;
    // stem
    float stem = sdSegment(q, vec2(0.0, 0.18), vec2(0.015, 0.31)) - 0.004;
    col = mix(col, uC1 * 0.4, fillAA(stem));
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.15)), 1.0);
}
