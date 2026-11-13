// Agra Dawn — the white marble mausoleum at sunrise, mirrored in its long pool,
// in the soft colours of a hand-tinted postcard.

float onionDome(vec2 p, float r) {
    float d = sdCircle(p, r);
    d = smin(d, sdTriIso(p - vec2(0.0, r * 1.75), vec2(r * 0.45, r * 1.0)), r * 0.25);
    d = max(d, -p.y - r * 0.55);                  // cut flat at the drum
    return d;
}

float monument(vec2 p) {
    float d = sdBox(p - vec2(0.0, 0.0), vec2(0.115, 0.055));          // main hall
    d = min(d, sdBox(p - vec2(0.0, 0.07), vec2(0.045, 0.02)));        // drum
    d = min(d, onionDome(p - vec2(0.0, 0.11), 0.055));                  // great dome
    d = min(d, sdSegment(p, vec2(0.0, 0.2), vec2(0.0, 0.23)) - 0.002); // finial
    for (int i = 0; i < 2; i++) {
        float s = i == 0 ? -1.0 : 1.0;
        vec2 q = p - vec2(s * 0.075, 0.062);
        d = min(d, sdBox(q, vec2(0.015, 0.012)));                     // chhatri base
        d = min(d, onionDome(q - vec2(0.0, 0.022), 0.014));             // small dome
        // minarets
        vec2 m = p - vec2(s * 0.20, 0.0);
        d = min(d, sdBox(m - vec2(0.0, 0.03), vec2(0.008, 0.12)));
        d = min(d, onionDome(m - vec2(0.0, 0.16), 0.011));
        d = min(d, sdBox(m - vec2(0.0, 0.03 + 0.04), vec2(0.011, 0.002)));
        d = min(d, sdBox(m - vec2(0.0, 0.03 - 0.03), vec2(0.011, 0.002)));
    }
    d = min(d, sdBox(p - vec2(0.0, -0.07), vec2(0.24, 0.016)));        // plinth
    return d;
}

vec3 scene(vec2 p) {
    vec3 col = mix(uC2, uC1, smoothstep(-0.05, 0.45, p.y));
    vec2 sp = p - vec2(0.17, 0.0);
    col += uC3 * 0.015 / (length(sp) + 0.03);
    col = mix(col, mix(uC2, vec3(1.0), 0.4), smoothstep(0.5, 0.8, fbm4(vec2(p.x * 2.0 + uTime * 0.01, p.y * 6.0))) * 0.3);
    vec2 mp = p - vec2(0.0, 0.02);
    float m = monument(mp);
    // marble glows warm on the sunlit side
    vec3 marble = mix(vec3(1.05, 0.98, 0.94), uC3, 0.2);
    marble *= 0.82 + 0.18 * smoothstep(-0.1, 0.1, mp.x);
    // the great arch (iwan) and smaller arches in shadow
    float iwan = sdBox(mp - vec2(0.0, -0.005), vec2(0.022, 0.035));
    iwan = min(iwan, sdCircle(mp - vec2(0.0, 0.03), 0.022));
    marble = mix(marble, marble * 0.55, fillAA(iwan));
    float arches = sdBox(vec2(abs(mp.x) - 0.06, mp.y - 0.0), vec2(0.012, 0.022));
    marble = mix(marble, marble * 0.65, fillAA(arches));
    col = mix(col, marble, fillAA(m));
    // morning mist at the base
    col = mix(col, mix(uC2, vec3(1.0), 0.5), smoothstep(-0.02, -0.08, p.y) * 0.35);
    // dark cypress avenues on both sides
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        for (int s = 0; s < 2; s++) {
            float sx = s == 0 ? -1.0 : 1.0;
            vec2 c = p - vec2(sx * (0.12 + fi * 0.03), -0.06 - fi * 0.035);
            float tree = sdTriIso(vec2(c.x, c.y - 0.05 - fi * 0.01), vec2(0.012 + fi * 0.002, 0.07 + fi * 0.012));
            col = mix(col, vec3(0.06, 0.09, 0.07), fillAA(tree));
        }
    }
    return col;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    float water = -0.06;
    vec3 col;
    if (p.y > water) {
        col = scene(p);
    } else {
        vec2 rp = vec2(p.x + 0.002 * sin(p.y * 300.0 + uTime * 2.0), 2.0 * water - p.y);
        col = scene(rp) * vec3(0.8, 0.85, 0.9);
        // pool edges
        float walk = step(0.065, abs(p.x)) * step(abs(p.x), 0.085);
        float lawn = step(0.085, abs(p.x));
        col = mix(col, vec3(0.78, 0.72, 0.66) * (0.85 + 0.15 * fbm4(p * 40.0)), walk);
        col = mix(col, vec3(0.16, 0.24, 0.15) * (0.7 + 0.3 * fbm4(p * 25.0)), lawn);
    }
    col = filmLook(col, 0.35);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
