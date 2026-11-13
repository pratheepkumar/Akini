// Cyber Rain — a neon-lit street at night, rain falling, signs mirrored in the wet road.
// World units: street walls at x = ±1, camera 0.6 above the road, looking down the street.

const float F = 0.30;      // focal length
const float CAM_H = 0.6;

vec3 wallColor(float Z, float Y, float side) {
    vec3 col = vec3(0.012, 0.010, 0.022);
    // lit windows on the upper floors
    vec2 w = vec2(Z * 1.6, Y * 2.2);
    vec2 wid = floor(w);
    float win = step(0.7, hash12(wid + side * 31.0)) * step(0.25, fract(w.x)) * step(0.3, fract(w.y)) * step(1.6, Y);
    col += mix(vec3(1.0, 0.62, 0.3), vec3(0.4, 0.6, 1.0), hash12(wid + 3.0)) * win * 0.16;
    // neon signs: one panel per 2.5 units of street, at varying heights
    float seg = floor(Z / 2.5);
    float r1 = hash12(vec2(seg, side));
    float r2 = hash12(vec2(seg, side + 7.0));
    float r3 = hash12(vec2(seg, side + 13.0));
    float z0 = seg * 2.5 + 0.4 + r1 * 0.8;
    float zl = 0.6 + r2 * 1.0;
    float y0 = 0.9 + r3 * 2.2;
    float yh = 0.35 + r1 * 0.9;
    vec2 local = vec2((Z - z0) / zl, (Y - y0) / yh);
    vec2 dd = abs(local - 0.5) - 0.5;
    float box = max(dd.x, dd.y);
    vec3 c = mix(uC1, uC2, step(0.5, r2));
    c = mix(c, uC3, step(0.8, r3));
    float flick = mix(1.0, step(0.1, fract(sin(seg * 13.1 + floor(uTime * 9.0) * 0.37) * 43758.5)), step(0.8, r1));
    float tube = exp(-abs(box) * 60.0);                     // neon outline
    float panel = step(box, 0.0) * (0.25 + 0.2 * step(0.5, fract(local.y * 3.0 + local.x * 0.0)));
    float spill = exp(-max(box, 0.0) * 6.0) * 0.18;         // glow on the wall around it
    col += c * (tube * 2.2 + panel * 1.3 + spill) * flick;
    return col;
}

vec3 street(vec2 p) {
    // sky glow between the buildings
    vec3 col = mix(mix(uC1, uC2, 0.5) * 0.07, vec3(0.006, 0.003, 0.014), smoothstep(0.0, 0.3, p.y));
    float ax = abs(p.x);
    float side = sign(p.x);
    float Zwall = F / max(ax, 1e-4);
    float Ywall = CAM_H + p.y * Zwall / F;
    if (Ywall > 0.0 && Ywall < 9.0 && Zwall < 60.0) {
        float fog = exp(-Zwall * 0.06);
        col = mix(col, wallColor(Zwall, Ywall, side), fog);
        col += mix(uC1, uC2, 0.5) * (1.0 - fog) * 0.03;
    }
    return col;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.02;
    vec3 col;
    float horizon = 0.02;
    vec2 sp = vec2(p.x, p.y - horizon);
    // where the walls meet the road
    float roadEdge = -CAM_H * abs(sp.x) / 1.0;
    if (sp.y > roadEdge) {
        col = street(sp);
    } else {
        // wet road: blurred, rippled reflection of the street
        float Zr = CAM_H * F / max(-sp.y, 1e-4);
        vec2 rp = vec2(sp.x + 0.003 * sin(Zr * 6.0 + uTime * 2.0) * fbm4(sp * 40.0), -sp.y - 2.0 * CAM_H * abs(sp.x) * 0.0);
        rp.y = 2.0 * roadEdge - sp.y;
        col = street(rp) * 0.45;
        col *= 0.65 + 0.35 * fbm4(vec2(sp.x * 30.0, Zr * 2.0));
        col += vec3(0.008, 0.008, 0.012);
        // lane markings
        float lane = step(abs(sp.x * Zr / F), 0.04) * step(0.5, fract(Zr * 0.5 - uTime * 0.0));
        col += vec3(0.25) * lane * exp(-Zr * 0.1) * 0.4;
        // raindrop rings
        vec2 sg = vec2(sp.x * Zr / F * 6.0, Zr * 6.0);
        vec2 id = floor(sg);
        float ph = fract(uTime * 1.3 + hash12(id) * 10.0);
        float ring = smoothstep(0.08, 0.0, abs(length((fract(sg) - 0.5) * vec2(1.0, 1.0)) - ph * 0.45)) * (1.0 - ph);
        col += mix(uC1, uC2, hash12(id)) * ring * 0.10 * step(0.6, hash12(id + 5.0)) * exp(-Zr * 0.15);
    }
    // rain streaks in three layers
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 rq = vec2(p.x * (60.0 + fi * 40.0) + p.y * 5.0, p.y * (4.0 + fi * 2.0) + uTime * (6.0 + fi * 3.0));
        vec2 id = floor(rq);
        float on = step(0.88, hash12(id + fi * 13.0));
        float streak = on * smoothstep(0.08, 0.0, abs(fract(rq.x) - 0.5)) * smoothstep(0.0, 0.5, fract(rq.y)) * smoothstep(1.0, 0.6, fract(rq.y));
        col += vec3(0.55, 0.65, 0.85) * streak * (0.08 + fi * 0.05);
    }
    col *= 1.0 - 0.45 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.3)), 1.0);
}
