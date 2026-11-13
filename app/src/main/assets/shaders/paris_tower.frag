// Paris 1889 — the iron lattice tower against drifting clouds, like a faded postcard.

float towerHalfWidth(float t) {
    // t = 0 at the base, 1 at the tip
    return 0.010 + 0.155 * pow(1.0 - t, 2.6);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec3 col = mix(uC2, uC1, smoothstep(-0.3, 0.5, p.y));
    float cl = fbm(vec2(p.x * 2.0 + uTime * 0.012, p.y * 4.0));
    col = mix(col, mix(uC3, vec3(1.0), 0.4), smoothstep(0.45, 0.75, cl) * 0.55);
    col = mix(col, uC1 * 0.75, smoothstep(0.6, 0.85, fbm4(vec2(p.x * 3.0 - uTime * 0.008, p.y * 6.0 + 5.0))) * 0.3);

    float base = -0.32;
    float top = 0.36;
    float t = (p.y - base) / (top - base);
    float tower = 0.0;
    if (t > 0.0 && t < 1.0) {
        float hw = towerHalfWidth(t);
        float inside = smoothstep(0.0015, -0.0015, abs(p.x) - hw);
        // the great arch between the legs
        vec2 ap = vec2(p.x / 0.095, (p.y - base) / 0.085);
        float arch = step(length(ap), 1.0) * step(0.0, ap.y);
        inside *= 1.0 - arch;
        // open lattice: the legs are made of criss-crossed girders
        float lx = abs(fract((p.x + p.y * 0.6) * 150.0) - 0.5);
        float ly = abs(fract((p.x - p.y * 0.6) * 150.0) - 0.5);
        float lattice = max(smoothstep(0.22, 0.42, lx), smoothstep(0.22, 0.42, ly));
        float edgeBeam = smoothstep(0.004, 0.0, abs(abs(p.x) - hw) - 0.002);
        float solid = max(lattice * step(0.08, t) * step(t, 0.75), edgeBeam);
        solid = max(solid, step(0.75, t));
        tower = inside * clamp(solid + 0.25, 0.0, 1.0);
        // viewing platforms
        float plat = step(abs(t - 0.24), 0.012) * step(abs(p.x), towerHalfWidth(0.24) + 0.012);
        plat += step(abs(t - 0.52), 0.008) * step(abs(p.x), towerHalfWidth(0.52) + 0.008);
        tower = max(tower, clamp(plat, 0.0, 1.0));
    }
    // antenna
    tower = max(tower, step(abs(p.x), 0.0015) * step(top, p.y) * step(p.y, top + 0.04));
    col = mix(col, vec3(0.07, 0.055, 0.045), tower);

    // rooftops of the city along the bottom
    float roofs = -0.36 + 0.02 * step(0.5, fract(p.x * 12.0)) + 0.012 * sin(p.x * 50.0) + 0.01 * step(0.85, hash12(vec2(floor(p.x * 40.0), 1.0)));
    col = mix(col, vec3(0.1, 0.08, 0.065), smoothstep(0.001, -0.001, p.y - roofs));
    // pigeons
    for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec2 b = p - vec2(fract(uTime * 0.015 + fi * 0.27) * 0.8 - 0.4, 0.05 + fi * 0.06 + 0.02 * sin(uTime * 0.3 + fi));
        float flap = sin(uTime * 7.0 + fi * 2.0) * 0.004;
        float bird = min(sdSegment(b, vec2(-0.009, flap), vec2(0.0, 0.0)), sdSegment(b, vec2(0.0, 0.0), vec2(0.009, flap))) - 0.0011;
        col = mix(col, vec3(0.1, 0.08, 0.06), fillAA(bird));
    }
    col = filmLook(col, 0.75);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
