// Lotus Bloom — a pink lotus opening on dark water, ripples spreading softly.

float petal(vec2 p, float ang, float len, float wid) {
    p = rot2(-ang) * p;
    // pointed petal: intersection of two circles (a vesica), base at the origin, tip at +len
    float R = (wid * wid + len * len * 0.25) / (2.0 * wid);
    vec2 q = vec2(p.x, p.y - len * 0.5);
    float d = max(length(q - vec2(wid - R, 0.0)) - R, length(q - vec2(R - wid, 0.0)) - R);
    return d;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC3 * 0.25, uC3 * 0.05, smoothstep(-0.5, 0.5, p.y));
    // ripples
    vec2 c = vec2(0.0, -0.05);
    float rr = length((p - c) * vec2(1.0, 2.6));
    float ripple = sin(rr * 60.0 - uTime * 1.5) * exp(-rr * 3.0);
    col += uC2 * 0.08 * max(ripple, 0.0);
    // lily pads
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 lp = (p - vec2(-0.16 + fi * 0.17, -0.2 - fi * 0.06 * (1.0 - fi * 0.5))) * vec2(1.0, 2.4);
        float pad = sdCircle(lp, 0.07 - fi * 0.01);
        float notch = abs(atan(lp.y, lp.x) + 0.8) < 0.15 ? 1.0 : 0.0;
        float on = fillAA(pad) * (1.0 - notch);
        vec3 green = mix(vec3(0.05, 0.18, 0.08), vec3(0.15, 0.35, 0.15), smoothstep(-0.07, 0.07, lp.x + lp.y));
        green *= 0.85 + 0.15 * sin(atan(lp.y, lp.x) * 18.0);
        col = mix(col, green, on);
    }
    // the flower: back petals, then front petals, opening slowly
    vec2 fp = (p - c) * vec2(1.0, 1.0);
    float open = 0.5 + 0.5 * sin(uTime * 0.15);
    vec3 flower = vec3(0.0);
    float fmask = 0.0;
    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        float spread = mix(0.45, 0.7, open) * (1.0 - fl * 0.3);
        float len = 0.17 - fl * 0.035;
        for (int i = 0; i < 5; i++) {
            float fi = float(i) - 2.0;
            float ang = fi * spread * 0.5 + (fl == 1.0 ? 0.25 * spread : 0.0);
            float d = petal(fp * vec2(1.0, 1.15) + vec2(0.0, 0.02 * fl), ang, len, 0.045 - fl * 0.006);
            float m = fillAA(d);
            vec2 lpp = rot2(-ang) * fp;
            float along = clamp(lpp.y / len, 0.0, 1.0);
            vec3 pc = mix(uC1 * 1.1, mix(uC1, vec3(1.0), 0.6), 1.0 - along);
            pc *= 0.75 + 0.25 * smoothstep(-0.03, 0.03, lpp.x * (fi < 0.0 ? -1.0 : 1.0));
            pc *= 1.0 - 0.15 * fl;
            // fine veins
            pc *= 0.92 + 0.08 * sin(lpp.x * 400.0);
            flower = mix(flower, pc, m);
            fmask = max(fmask, m);
        }
    }
    col = mix(col, flower, fmask);
    // golden seed pod glow at the centre
    vec2 pod = fp - vec2(0.0, 0.03);
    col += uC2 * 0.0015 / (dot(pod, pod) + 0.0015) * 0.25;
    // fireflies
    vec2 mq = p * 8.0 + vec2(sin(uTime * 0.2) * 0.5, uTime * 0.1);
    vec2 id = floor(mq);
    vec2 f = fract(mq) - 0.5 - (hash22(id) - 0.5) * 0.6;
    col += uC2 * step(0.8, hash12(id)) * smoothstep(0.06, 0.0, length(f)) * (0.5 + 0.5 * sin(uTime * 3.0 + hash12(id) * 30.0));
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
