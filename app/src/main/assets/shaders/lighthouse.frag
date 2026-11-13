// Lighthouse — a beam sweeping through sea mist on a stormy night.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC1 * 0.5, uC1 * 0.12, smoothstep(-0.1, 0.5, p.y));
    // heavy clouds racing past
    float cl = fbm(vec2(p.x * 2.0 - uTime * 0.03, p.y * 3.0));
    col = mix(col, uC2 * 0.35, smoothstep(0.4, 0.8, cl) * 0.8);
    col += starLayer(p, 60.0, 0.97, 4.0) * (1.0 - smoothstep(0.35, 0.6, cl)) * 0.4;

    // the tower
    vec2 base = vec2(0.10, -0.12);
    vec2 tp = p - base;
    float h = 0.26;
    float hw = mix(0.028, 0.016, clamp(tp.y / h, 0.0, 1.0));
    float tower = step(abs(tp.x), hw) * step(0.0, tp.y) * step(tp.y, h);
    vec2 lamp = base + vec2(0.0, h + 0.016);
    float gallery = step(abs(tp.x), 0.024) * step(abs(tp.y - h), 0.003);
    float lantern = step(abs(tp.x), 0.012) * step(h, tp.y) * step(tp.y, h + 0.028);
    float roof = fillAA(sdTriIso(p - (lamp + vec2(0.0, 0.03)), vec2(0.016, 0.014)));
    // painted bands on the tower
    float band = step(0.5, fract(tp.y * 16.0));
    vec3 towerCol = mix(vec3(0.05, 0.05, 0.06), vec3(0.16, 0.05, 0.05), band) * (0.6 + 0.4 * smoothstep(-hw, hw, tp.x));

    // rotating beam (two opposite beams); brighter as it swings toward us
    float spin = uTime * 0.6;
    vec2 d = p - lamp;
    float ang = atan(d.y, d.x);
    float dist = length(d);
    float facing = 0.5 + 0.5 * cos(spin);
    float dir = sin(spin) > 0.0 ? 0.0 : PI;
    float beamA = abs(mod(ang - dir + PI, TAU) - PI);
    float width = 0.05 + 0.25 * facing;
    float haze = 0.5 + 0.5 * fbm4(p * 6.0 + vec2(uTime * 0.1, 0.0));
    float beam = smoothstep(width, 0.0, beamA) * exp(-dist * 1.4) * haze;
    col += uC3 * beam * (0.45 + 0.8 * facing);
    col += uC3 * 0.0006 / (dist * dist + 0.0004) * (0.4 + 1.2 * facing);

    col = mix(col, towerCol, tower);
    col = mix(col, vec3(0.04), clamp(gallery + roof, 0.0, 1.0));
    col = mix(col, uC3 * (1.0 + facing), lantern);

    // rocky headland
    float rock = -0.12 + 0.03 * fbm4(vec2(p.x * 10.0, 1.0)) - smoothstep(0.0, 0.25, -p.x) * 0.1;
    col = mix(col, vec3(0.015, 0.016, 0.02), smoothstep(0.001, -0.001, p.y - rock));
    // sea with crashing waves
    float sea = -0.2;
    if (p.y < sea) {
        float wave = fbm4(vec2(p.x * 6.0 + uTime * 0.2, (p.y - sea) * 18.0 - uTime * 0.3));
        col = mix(uC1 * 0.18, uC2 * 0.3, wave);
        col += uC3 * smoothstep(0.65, 0.8, wave) * 0.15;
        col += uC3 * exp(-abs(p.x - lamp.x) * 8.0) * facing * 0.12 * smoothstep(-0.6, -0.2, p.y);
        float foam = smoothstep(0.7, 0.85, fbm4(vec2(p.x * 20.0 - uTime * 0.4, p.y * 60.0)));
        col = mix(col, vec3(0.7, 0.72, 0.75), foam * smoothstep(sea - 0.05, sea, p.y) * 0.7);
    }
    col = filmLook(col, 0.35);
    gl_FragColor = vec4(finish(tonemap(col * 1.3)), 1.0);
}
