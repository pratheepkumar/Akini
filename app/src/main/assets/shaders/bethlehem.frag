// Star of Bethlehem — a brilliant star over a sleeping desert town.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC1 * 0.35, uC1 * 0.06, smoothstep(-0.25, 0.5, p.y));
    col += starLayer(p, 110.0, 0.92, 2.0) * 0.5 + starLayer(p, 45.0, 0.96, 6.0) * 0.9;

    vec2 s = p - vec2(0.06, 0.24);
    float r = length(s);
    float tw = 0.9 + 0.1 * sin(uTime * 1.3) * sin(uTime * 2.1);
    // long cross-shaped rays, the downward one longest
    float rayV = exp(-abs(s.x) * 500.0) * exp(-abs(s.y) * (s.y < 0.0 ? 1.8 : 5.0));
    float rayH = exp(-abs(s.y) * 500.0) * exp(-abs(s.x) * 6.0);
    vec2 sd = rot2(0.785) * s;
    float rayD = (exp(-abs(sd.x) * 700.0) * exp(-abs(sd.y) * 14.0) + exp(-abs(sd.y) * 700.0) * exp(-abs(sd.x) * 14.0)) * 0.5;
    col += uC2 * (rayV * 1.2 + rayH * 0.9 + rayD) * tw;
    col += uC2 * 0.0008 / (r * r + 0.0008) * tw;
    col += vec3(1.0) * smoothstep(0.008, 0.0, r);
    // a gentle beam falling toward the town
    float beam = smoothstep(0.12, 0.0, abs(s.x + s.y * 0.05)) * step(s.y, 0.0) * exp(s.y * 1.5) * 0.08;
    col += uC2 * beam;

    // desert hills and a town of flat roofs and domes
    float hills = -0.18 + 0.04 * sin(p.x * 3.0 + 1.0) + 0.02 * sin(p.x * 9.0);
    float town = -0.2;
    float bx = floor(p.x * 22.0);
    float bh = 0.02 + 0.05 * hash12(vec2(bx, 1.0));
    float building = step(p.y, town + bh) * step(abs(p.x - 0.0), 0.3);
    float dome = 0.0;
    for (int i = 0; i < 3; i++) {
        float x = -0.15 + float(i) * 0.14;
        dome = max(dome, fillAA(sdCircle(p - vec2(x, town + 0.06), 0.025)));
        dome = max(dome, fillAA(sdBox(p - vec2(x, town + 0.03), vec2(0.025, 0.03))));
    }
    float skyline = max(building, dome);
    col = mix(col, mix(uC1 * 0.25, uC1 * 0.12, 0.5), smoothstep(0.001, -0.001, p.y - hills) * (1.0 - skyline));
    vec3 houses = vec3(0.02, 0.02, 0.035) + uC2 * 0.02;
    // a few lit windows
    vec2 wq = vec2(p.x * 90.0, (p.y - town) * 90.0);
    float win = step(0.86, hash12(floor(wq))) * step(0.3, fract(wq.x)) * step(0.3, fract(wq.y)) * step(p.y, town + bh - 0.01);
    houses += vec3(1.0, 0.7, 0.35) * win * 0.4 * (0.8 + 0.2 * sin(uTime * 2.0 + hash12(floor(wq)) * 10.0));
    col = mix(col, houses, skyline);
    // palms
    for (int i = 0; i < 2; i++) {
        float sgn = i == 0 ? -1.0 : 1.0;
        vec2 tp = p - vec2(sgn * 0.19, town);
        float trunk = sdSegment(tp, vec2(0.0), vec2(sgn * 0.015, 0.14)) - 0.003;
        float fr = 1e3;
        for (int k = 0; k < 6; k++) {
            float ang = float(k) * 1.05 + 0.3;
            fr = min(fr, sdSegment(tp, vec2(sgn * 0.015, 0.14), vec2(sgn * 0.015, 0.14) + vec2(cos(ang), sin(ang) * 0.6 - 0.2) * 0.055) - 0.0025);
        }
        col = mix(col, vec3(0.01, 0.012, 0.02), fillAA(min(trunk, fr)));
    }
    // foreground dune
    float fg = -0.32 + 0.03 * sin(p.x * 4.0 + 2.0);
    col = mix(col, uC1 * 0.05, smoothstep(0.001, -0.001, p.y - fg));
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.15)), 1.0);
}
