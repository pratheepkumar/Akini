// Aurora Night — curtains of light over snowy peaks and a still lake.

vec3 aurora(vec2 p) {
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float x = p.x * (1.2 + fi * 0.25) + fi * 1.7;
        float base = 0.05 + fi * 0.06 + 0.10 * sin(x * 2.0 + uTime * 0.05 + fi) + 0.06 * fbm4(vec2(x * 1.5 + uTime * 0.03, fi));
        float h = p.y - base;
        float rays = 0.35 + 0.65 * pow(fbm4(vec2(x * 30.0 + uTime * 0.15, fi * 3.0)), 1.5);
        float fold = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(x * 5.0 + fbm4(vec2(x * 2.0, fi + uTime * 0.04)) * 5.0), 2.0);
        float curtain = smoothstep(0.0, 0.03, h) * exp(-h * (6.0 + fi * 2.0)) * rays * fold;
        float edge = exp(-h * h * 2500.0) * fold;
        vec3 c = mix(uC1, uC2, smoothstep(0.03, 0.28, h));
        acc += c * (curtain * 0.32 + edge * 0.25) * (1.0 - fi * 0.2);
    }
    return acc;
}

float peaks(float x) {
    float h = -0.17;
    h += 0.11 * max(0.0, 1.0 - abs(x - 0.05) * 3.2);
    h += 0.07 * max(0.0, 1.0 - abs(x + 0.20) * 4.0);
    h += 0.05 * max(0.0, 1.0 - abs(x - 0.25) * 4.5);
    h += 0.02 * (fbm4(vec2(x * 12.0, 1.0)) - 0.5);
    return h;
}

vec3 sky(vec2 p) {
    vec3 col = mix(vec3(0.005, 0.012, 0.03), vec3(0.002, 0.004, 0.012), smoothstep(-0.1, 0.5, p.y));
    col += starLayer(p, 110.0, 0.92, 4.0) * 0.5 + starLayer(p, 45.0, 0.96, 8.0) * 0.9;
    col += aurora(p) * 1.3;
    return col;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.02;
    float lake = -0.24;
    vec3 col;
    if (p.y > lake) {
        col = sky(p);
        float m = peaks(p.x);
        if (p.y < m) {
            // snowy slopes catching the aurora's light
            float snow = smoothstep(m - 0.10, m - 0.01, p.y) * smoothstep(0.35, 0.65, fbm4(p * vec2(30.0, 60.0)));
            col = vec3(0.006, 0.009, 0.016) + (uC1 * 0.06 + vec3(0.05, 0.06, 0.08)) * snow;
        }
        // pine forest at the shoreline
        float trees = lake + 0.012 + 0.018 * abs(sin(p.x * 140.0)) * step(0.4, hash12(vec2(floor(p.x * 70.0), 1.0)));
        col = mix(col, vec3(0.002, 0.004, 0.006), smoothstep(0.001, -0.001, p.y - trees));
    } else {
        // mirror lake with gentle ripples
        vec2 rp = vec2(p.x + 0.004 * sin(p.y * 220.0 + uTime * 1.5), 2.0 * lake - p.y);
        col = sky(rp) * 0.55;
        float m = peaks(rp.x);
        if (rp.y < m) col = vec3(0.008, 0.01, 0.018);
        col *= 0.75 + 0.25 * smoothstep(-0.5, 0.5, sin(p.y * 400.0 + p.x * 20.0));
    }
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
