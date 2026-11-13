// Classic Car — a 1950s cruiser rolling along a coast road at sunset, on old film.

float carBody(vec2 p) {
    float body = sdRoundBox(p - vec2(0.0, 0.0), vec2(0.175, 0.026), 0.02);
    float cabin = sdRoundBox(p - vec2(-0.025, 0.040), vec2(0.075, 0.030), 0.028);
    float hood = sdRoundBox(p - vec2(0.10, 0.018), vec2(0.07, 0.012), 0.012);
    float fin = sdRoundBox(p - vec2(-0.15, 0.022), vec2(0.03, 0.01), 0.008);
    float d = smin(body, cabin, 0.02);
    d = smin(d, hood, 0.015);
    d = smin(d, fin, 0.01);
    // wheel arches
    d = max(d, -sdCircle(p - vec2(0.105, -0.028), 0.036));
    d = max(d, -sdCircle(p - vec2(-0.105, -0.028), 0.036));
    return d;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    float horizon = -0.02;
    // sunset sky
    vec3 col = mix(uC1, uC2, smoothstep(horizon, 0.5, p.y));
    vec2 sp = p - vec2(0.06, horizon + 0.07);
    col += uC3 * (fillAA(length(sp) - 0.07) * 0.9 + 0.012 / (length(sp) + 0.02));
    float clouds = smoothstep(0.55, 0.8, fbm4(vec2(p.x * 2.0 + uTime * 0.01, p.y * 7.0)));
    col = mix(col, uC1 * 0.7, clouds * smoothstep(0.05, 0.25, p.y) * 0.5);
    // distant sea and headland
    if (p.y < horizon) col = mix(uC2 * 0.55, uC1 * 0.4, smoothstep(horizon, horizon - 0.12, p.y)) + uC3 * exp(-abs(p.x - 0.06) * 25.0) * 0.25 * step(-0.12, p.y);
    float hill = horizon + 0.07 * smoothstep(-0.02, -0.3, p.x) + 0.006 * sin(p.x * 40.0);
    col = mix(col, uC1 * 0.25, smoothstep(0.001, -0.001, p.y - hill) * step(horizon - 0.02, p.y));

    // the road
    float roadTop = -0.16;
    float roadBot = -0.28;
    if (p.y < roadTop) {
        col = mix(vec3(0.16, 0.13, 0.11), vec3(0.08, 0.07, 0.06), smoothstep(roadTop, roadBot, p.y));
        float dash = step(0.5, fract(p.x * 4.0 + uTime * 1.2)) * smoothstep(0.004, 0.0, abs(p.y - (roadTop + roadBot) * 0.5));
        col += vec3(0.6, 0.55, 0.45) * dash * 0.5;
        if (p.y < roadBot) col = vec3(0.12, 0.10, 0.07) * (0.8 + 0.2 * fbm4(p * 40.0));
    }
    // telephone poles whizzing past
    float poleX = fract(p.x * 1.4 + uTime * 0.5) - 0.5;
    float pole = step(abs(poleX), 0.006) * step(roadTop, p.y) * step(p.y, 0.18);
    col = mix(col, vec3(0.05, 0.04, 0.035), pole);
    float wire = smoothstep(0.002, 0.0, abs(p.y - 0.16 + 0.03 * (1.0 - 4.0 * poleX * poleX)));
    col = mix(col, vec3(0.05), wire * 0.7);

    // the car
    vec2 cp = p - vec2(-0.01, -0.16 + 0.065 + 0.0015 * sin(uTime * 9.0));
    float car = carBody(cp);
    vec3 paint = vec3(0.06, 0.05, 0.05);
    float rim = smoothstep(0.0, -0.006, car) * smoothstep(-0.012, -0.004, car) * smoothstep(-0.02, 0.06, cp.y + cp.x * 0.3);
    vec3 carCol = paint + uC3 * rim * 0.55;
    // windows show the sky
    float win = sdRoundBox(cp - vec2(-0.025, 0.045), vec2(0.06, 0.018), 0.016);
    win = max(win, -sdBox(cp - vec2(-0.025, 0.045), vec2(0.004, 0.03)));
    carCol = mix(carCol, mix(uC2, uC1, 0.4) * 0.7, fillAA(win));
    // chrome trim and headlight
    carCol += vec3(0.9, 0.85, 0.7) * smoothstep(0.003, 0.0, abs(cp.y - 0.004)) * step(abs(cp.x), 0.16) * 0.35;
    carCol += uC3 * 0.0004 / (dot(cp - vec2(0.17, 0.012), cp - vec2(0.17, 0.012)) + 0.0002) * 0.3;
    col = mix(col, carCol, fillAA(car));
    // wheels with whitewalls and spinning spokes
    for (int i = 0; i < 2; i++) {
        vec2 wc = cp - vec2(i == 0 ? 0.105 : -0.105, -0.03);
        float wr = length(wc);
        float tyre = fillAA(wr - 0.031);
        vec3 wcol = vec3(0.03);
        wcol = mix(wcol, vec3(0.75, 0.7, 0.62), smoothstep(0.003, 0.0, abs(wr - 0.022)) * 0.8);
        float spokes = step(0.5, fract(atan(wc.y, wc.x) / TAU * 6.0 - uTime * 2.0)) * step(wr, 0.016);
        wcol = mix(wcol, vec3(0.5, 0.47, 0.42), spokes * 0.5 + smoothstep(0.006, 0.0, wr) * 0.6);
        col = mix(col, wcol, tyre);
    }
    // dust kicked up behind
    float dust = fbm4(vec2(p.x * 8.0 + uTime * 2.0, p.y * 12.0)) * smoothstep(-0.12, -0.26, p.x) * smoothstep(-0.05, -0.14, p.y) * smoothstep(-0.2, -0.13, p.y);
    col = mix(col, uC2 * 0.8, dust * 0.4);

    col = filmLook(col, 0.85);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
