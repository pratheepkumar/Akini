// Candlelight — a cluster of candles, flames trembling, soft light all around.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC2 * 0.06, vec3(0.006, 0.004, 0.004), vUv.y);
    // out-of-focus lights in the background
    vec2 bq = p * 5.0 + vec2(uTime * 0.02, 0.0);
    vec2 bid = floor(bq);
    vec2 bf = fract(bq) - 0.5 - (hash22(bid) - 0.5) * 0.5;
    col += uC1 * step(0.6, hash12(bid)) * smoothstep(0.3, 0.25, length(bf)) * 0.05 * smoothstep(-0.1, 0.3, p.y);

    float glow = 0.0;
    vec3 front = vec3(0.0);
    float mask = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float x = (fi - 2.0) * 0.085 + (hash12(vec2(fi, 1.0)) - 0.5) * 0.02;
        float h = 0.12 + hash12(vec2(fi, 2.0)) * 0.16;
        float w = 0.028 + hash12(vec2(fi, 3.0)) * 0.012;
        float baseY = -0.3 + abs(fi - 2.0) * 0.025;
        vec2 cp = p - vec2(x, baseY);
        // wax body with a soft, translucent glow near the top
        float body = sdRoundBox(cp - vec2(0.0, h * 0.5), vec2(w, h * 0.5), 0.004);
        float m = fillAA(body);
        vec3 wax = mix(uC3 * 0.35, uC3, smoothstep(0.0, h, cp.y));
        wax += uC1 * exp(-(h - cp.y) * 25.0) * 0.35;
        wax *= 0.8 + 0.2 * smoothstep(-w, w * 0.5, cp.x);
        // melted drips
        float drip = step(abs(cp.x - w * 0.5), 0.004) * step(h - 0.03 - hash12(vec2(fi, 4.0)) * 0.04, cp.y) * step(cp.y, h);
        wax = mix(wax, uC3 * 1.1, drip * 0.5);
        // wick and flame
        vec2 fp = cp - vec2(0.0, h + 0.005);
        float t = uTime * (6.0 + fi) + fi * 3.0;
        float sway = (fbm4(vec2(uTime * 1.3 + fi * 5.0, fi)) - 0.5) * 0.012;
        fp.x -= sway * clamp(fp.y / 0.04, 0.0, 1.0);
        float fh = 0.055 * (0.92 + 0.08 * sin(t) * sin(t * 1.9));
        float fd = smin(sdCircle(fp - vec2(0.0, fh * 0.25), fh * 0.28), sdTriIso(fp - vec2(0.0, fh), vec2(fh * 0.22, fh * 0.85)), fh * 0.15);
        float flame = smoothstep(0.003, -0.003, fd);
        float core = smoothstep(-0.006, -0.018, fd);
        vec3 fc = mix(uC1 * 1.2, vec3(1.0, 0.93, 0.75), core * 0.8);
        fc = mix(vec3(0.25, 0.35, 0.9), fc, smoothstep(-0.008, 0.004, fp.y));
        float wick = step(abs(fp.x), 0.0012) * step(-0.006, fp.y) * step(fp.y, 0.004);
        vec3 c = mix(wax * m, vec3(0.05), wick);
        c = mix(c, fc * 1.6, flame);
        float cm = max(m, max(flame, wick));
        front = mix(front, c, cm);
        mask = max(mask, cm);
        float gd = length(fp - vec2(0.0, fh * 0.4));
        glow += 0.002 / (gd * gd + 0.002);
    }
    col += uC1 * glow * 0.09;
    col = mix(col, front, mask);
    // reflections on a polished table
    float tableY = -0.3;
    if (p.y < tableY - 0.01) col += uC1 * glow * 0.05 * smoothstep(tableY - 0.2, tableY, p.y);
    col *= 1.0 - 0.45 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
