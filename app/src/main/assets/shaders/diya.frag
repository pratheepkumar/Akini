// Diya Lights — a row of clay oil lamps glowing for Deepavali, flames dancing.

float flameShape(vec2 p, float h, float sway) {
    // teardrop: round base tapering to a point that sways
    p.x -= sway * p.y * p.y / (h * h) * 0.6 * h;
    float d = sdCircle(p, h * 0.28);
    d = smin(d, sdTriIso(p - vec2(0.0, h), vec2(h * 0.22, h * 0.9)), h * 0.15);
    return d;
}

vec3 diya(vec2 p, float seed, float scale, inout float glowAcc) {
    p /= scale;
    vec3 col = vec3(0.0);
    // clay bowl
    float bowl = max(sdCircle(p - vec2(0.0, 0.05), 0.08), p.y - 0.035);
    bowl = smin(bowl, sdRoundBox(p - vec2(0.0, -0.035), vec2(0.03, 0.008), 0.004), 0.01);
    float spout = sdTriIso(vec2(p.x - 0.06, -(p.y - 0.04)), vec2(0.02, 0.03));
    bowl = min(bowl, spout);
    float b = fillAA(bowl * scale);
    vec3 clay = mix(uC3 * 0.35, uC3, smoothstep(-0.06, 0.04, p.y) * smoothstep(0.08, -0.04, p.x));
    clay *= 0.8 + 0.2 * smoothstep(0.004, 0.0, abs(p.y - 0.02));    // painted rim
    col = clay * b;
    // flame
    float t = uTime * (5.0 + seed * 2.0) + seed * 10.0;
    float flick = 0.9 + 0.1 * sin(t) * sin(t * 1.7);
    float sway = (fbm4(vec2(uTime * 1.5 + seed * 7.0, seed)) - 0.5) * 1.6;
    vec2 fp = p - vec2(0.045, 0.045);
    float h = 0.11 * flick;
    float fd = flameShape(fp, h, sway);
    float flame = smoothstep(0.004, -0.004, fd);
    float core = smoothstep(-0.01, -0.03, fd);
    vec3 fcol = mix(uC1 * 1.2, vec3(1.0, 0.92, 0.7), core * 0.8);
    fcol = mix(vec3(0.3, 0.45, 1.0), fcol, smoothstep(-0.012, 0.004, fp.y));   // blue at the base
    col = mix(col, fcol * 1.6, flame);
    float gd = length(fp - vec2(0.0, h * 0.4));
    glowAcc += 0.0025 / (gd * gd * scale * scale + 0.0025) * flick;
    return col + b * 0.0;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC2 * 0.05, vec3(0.01, 0.005, 0.01), vUv.y);
    // warm bokeh of more lamps far away
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 q = p * (6.0 + fi * 4.0) + vec2(fi * 3.0, 0.0);
        vec2 id = floor(q);
        vec2 f = fract(q) - 0.5 - (hash22(id) - 0.5) * 0.5;
        float on = step(0.55, hash12(id + fi)) * smoothstep(0.1, 0.35, p.y + 0.2);
        float disc = smoothstep(0.32, 0.26, length(f));
        col += uC1 * disc * on * (0.06 + 0.04 * sin(uTime + hash12(id) * 30.0));
    }
    float glow = 0.0;
    vec3 lamps = vec3(0.0);
    float any = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float x = (fi - 2.0) * 0.095;
        float y = -0.12 - 0.035 * (fi - 2.0) * (fi - 2.0) * 0.5;
        float s = 1.0 - abs(fi - 2.0) * 0.08;
        vec2 lp = p - vec2(x, y);
        vec3 l = diya(lp, fi, s, glow);
        float mask = step(0.001, dot(l, vec3(1.0)));
        lamps = mix(lamps, l, mask);
        any = max(any, mask);
    }
    col += uC1 * glow * 0.12;
    col = mix(col, lamps, any);
    // marigold petals scattered on the floor
    float floorY = -0.2;
    if (p.y < floorY) {
        col = mix(col, uC2 * 0.08, 0.6);
        vec2 q = p * vec2(30.0, 60.0);
        vec2 id = floor(q);
        float petal = step(0.8, hash12(id)) * smoothstep(0.4, 0.2, length(fract(q) - 0.5));
        col += mix(uC1, uC2, hash12(id + 2.0)) * petal * 0.4 * (0.6 + glow * 0.3);
    }
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
