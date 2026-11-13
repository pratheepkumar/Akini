// Steam Express — a locomotive crossing a stone viaduct at dusk, trailing smoke.

float train(vec2 p) {
    // locomotive facing right, at the origin
    float d = sdRoundBox(p - vec2(0.0, 0.018), vec2(0.045, 0.014), 0.01);       // boiler
    d = min(d, sdBox(p - vec2(-0.045, 0.03), vec2(0.016, 0.026)));                // cab
    d = min(d, sdBox(p - vec2(-0.045, 0.058), vec2(0.021, 0.003)));               // cab roof
    d = min(d, sdBox(p - vec2(0.03, 0.044), vec2(0.005, 0.012)));                 // chimney
    d = min(d, sdBox(p - vec2(0.03, 0.057), vec2(0.008, 0.002)));
    d = min(d, sdCircle(p - vec2(0.005, 0.035), 0.007));                           // dome
    d = min(d, sdTriIso(vec2(p.x - 0.055, -p.y + 0.012) * vec2(1.0, -1.0), vec2(0.01, 0.012))); // cow-catcher
    d = min(d, sdBox(p - vec2(0.0, 0.003), vec2(0.06, 0.004)));                    // frame
    // carriages
    for (int i = 0; i < 4; i++) {
        float x = -0.1 - float(i) * 0.085;
        d = min(d, sdRoundBox(p - vec2(x, 0.028), vec2(0.038, 0.024), 0.006));
    }
    return d;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC2, uC1, smoothstep(-0.2, 0.45, p.y));
    vec2 sp = p - vec2(0.12, -0.02);
    col += uC3 * (fillAA(length(sp) - 0.06) * 0.8 + 0.01 / (length(sp) + 0.02) * 0.6);
    // distant hills
    float hills = -0.06 + 0.04 * sin(p.x * 4.0 + 1.0) + 0.02 * fbm4(vec2(p.x * 8.0, 2.0));
    col = mix(col, mix(uC1, uC2, 0.4) * 0.55, smoothstep(0.001, -0.001, p.y - hills));

    // viaduct deck and arches
    float deck = -0.12;
    float bridge = step(p.y, deck) * step(deck - 0.012, p.y);
    float px = fract(p.x * 7.0) - 0.5;
    float pier = step(p.y, deck - 0.012) * step(-0.45, p.y);
    float archHole = step(length(vec2(px / 0.38, (p.y - (deck - 0.07)) / 0.19)), 1.0) + step(abs(px), 0.38) * step(p.y, deck - 0.07);
    pier *= 1.0 - clamp(archHole, 0.0, 1.0);
    vec3 stone = vec3(0.09, 0.07, 0.055) * (0.85 + 0.15 * fbm4(p * 60.0));
    col = mix(col, stone, clamp(bridge + pier, 0.0, 1.0));

    // the train moves across and loops
    float tx = fract(uTime * 0.025) * 1.4 - 0.45;
    vec2 tp = p - vec2(tx, deck + 0.004);
    float tr = train(tp);
    col = mix(col, vec3(0.03, 0.025, 0.02), fillAA(tr));
    // lit carriage windows
    for (int i = 0; i < 4; i++) {
        vec2 w = tp - vec2(-0.1 - float(i) * 0.085, 0.034);
        float win = step(abs(w.y), 0.006) * step(0.3, fract(w.x * 70.0)) * step(abs(w.x), 0.03);
        col += uC3 * win * 0.6;
    }
    // smoke drifting back from the chimney
    vec2 sm = p - vec2(tx + 0.03, deck + 0.065);
    float back = -sm.x;
    if (back > -0.01) {
        float spread = 0.012 + back * 0.25;
        float rise = back * 0.35 + 0.01 * sin(back * 30.0 - uTime * 2.0);
        float cloud = exp(-pow((sm.y - rise) / spread, 2.0)) * smoothstep(0.7, 0.0, back);
        cloud *= 0.5 + 0.7 * fbm4(vec2(sm.x * 25.0 + uTime * 1.5, sm.y * 25.0));
        col = mix(col, mix(uC2, vec3(0.85, 0.8, 0.75), 0.4), clamp(cloud, 0.0, 0.9));
    }
    // river below
    if (p.y < -0.45) col = mix(uC2 * 0.4, uC1 * 0.3, smoothstep(-0.45, -0.6, p.y)) + uC3 * exp(-abs(p.x - 0.12) * 30.0) * 0.15;
    col = filmLook(col, 0.8);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
