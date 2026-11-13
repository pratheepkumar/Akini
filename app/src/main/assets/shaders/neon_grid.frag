// Neon Grid — a glowing data plane racing toward a cyber-city skyline.

float skyline(float x, float scale, float seed) {
    float id = floor(x * scale);
    float h = hash12(vec2(id, seed));
    float h2 = hash12(vec2(id * 0.37, seed + 4.0));
    return 0.02 + h * h * 0.11 + step(0.85, h2) * 0.05;
}

vec3 cityLayer(vec2 p, float sy, float scale, float seed, float bright) {
    float x = p.x + seed * 0.1;
    float top = skyline(x, scale, seed);
    if (sy > top) return vec3(-1.0);
    // windows
    vec2 cell = floor(vec2(x * scale * 7.0, sy * scale * 9.0));
    float on = step(0.78, hash12(cell + seed * 7.0));
    float flick = step(0.5, sin(uTime * 0.3 + hash12(cell) * 60.0) * 0.5 + 0.5 + 0.45);
    vec2 wf = fract(vec2(x * scale * 7.0, sy * scale * 9.0));
    float win = step(0.25, wf.x) * step(wf.x, 0.75) * step(0.3, wf.y) * step(wf.y, 0.7);
    vec3 wc = mix(vec3(0.2, 0.8, 1.0), vec3(1.0, 0.35, 0.8), step(0.8, hash12(cell + 3.0)));
    vec3 body = vec3(0.008, 0.01, 0.025) * (1.0 + 2.0 * sy);
    // antenna beacons
    float beacon = 0.0;
    float bx = fract(x * scale) - 0.5;
    if (hash12(vec2(floor(x * scale), seed + 9.0)) > 0.8) {
        float bd = length(vec2(bx / scale, sy - top));
        beacon = 0.0006 / (bd * bd * 4000.0 + 0.0006) * (0.5 + 0.5 * sin(uTime * 3.0 + seed));
    }
    return body + wc * on * flick * win * bright + vec3(1.0, 0.2, 0.2) * beacon;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.03;
    float horizon = 0.06 + uTilt.y * 0.015;
    float sy = p.y - horizon;
    vec3 col;

    if (sy > 0.0) {
        // Sky with aurora-like haze.
        col = mix(vec3(0.03, 0.0, 0.07), vec3(0.0, 0.0, 0.012), smoothstep(0.0, 0.45, sy));
        col += vec3(0.08, 0.45, 1.0) * exp(-sy * 16.0) * 0.9;
        col += vec3(0.85, 0.1, 0.6) * exp(-sy * 5.0) * 0.22;
        float haze = fbm4(vec2(p.x * 3.0 + uTime * 0.01, sy * 6.0));
        col += vec3(0.05, 0.12, 0.3) * haze * smoothstep(0.4, 0.05, sy) * 0.6;
        // stars
        vec2 sg = p * 90.0;
        float st = step(0.985, hash12(floor(sg))) * smoothstep(0.35, 0.0, length(fract(sg) - 0.5));
        col += vec3(0.8, 0.9, 1.0) * st * smoothstep(0.05, 0.3, sy) * 0.8;
        // two layers of skyline (far, near)
        vec3 far = cityLayer(p * 0.7, sy * 0.7, 26.0, 1.0, 0.45);
        if (far.x >= 0.0) col = mix(col, far + vec3(0.02, 0.06, 0.15) * 0.5, 0.92);
        vec3 near = cityLayer(p, sy, 14.0, 5.0, 1.0);
        if (near.x >= 0.0) col = near;
    } else {
        // Floor: perspective grid seen from a low camera.
        float d = -sy;
        float camH = 0.45;
        float Z = camH / d;                     // world depth
        float X = p.x * Z;                      // world sideways position
        float spacing = 4.0;                    // grid cells per world unit
        vec2 g = vec2(X, Z + uTime * 1.2) * spacing;
        vec2 gf = 0.5 - abs(fract(g) - 0.5);    // distance to nearest line, 0..0.5
        // size of one screen pixel in grid units, used to anti-alias the lines
        float pxX = spacing * (Z + abs(p.x) * Z * Z / camH) / uRes.y;
        float pxZ = spacing * Z * Z / camH / uRes.y;
        float w = 0.018;
        float lx = (1.0 - smoothstep(w, w + pxX * 1.5, gf.x)) * clamp(0.35 / pxX, 0.0, 1.0);
        float lz = (1.0 - smoothstep(w, w + pxZ * 1.5, gf.y)) * clamp(0.35 / pxZ, 0.0, 1.0);
        float lines = max(lx, lz);
        float fog = exp(-Z * 0.09);
        vec3 gridCol = mix(vec3(0.15, 0.85, 1.0), vec3(1.0, 0.2, 0.75), smoothstep(4.0, 30.0, Z));
        col = vec3(0.004, 0.004, 0.015);
        col += gridCol * lines * mix(0.35, 1.5, fog);
        col += gridCol * 0.05 * fog;
        // light pulses travelling along a few lanes
        for (int i = 0; i < 4; i++) {
            float fi = float(i);
            float laneX = (floor((hash12(vec2(fi, 3.0)) - 0.5) * 6.0) + 0.5) / spacing;
            float pos = fract(uTime * (0.10 + 0.04 * fi) + fi * 0.31);
            float pzW = mix(40.0, 0.6, pos);
            float dx = abs(X - laneX) / (0.02 + pxX / spacing * 1.5);
            float behind = max(Z - pzW, 0.0);
            float trail = exp(-dx * dx) * exp(-behind * 0.25) * step(pzW, Z);
            float headD = abs(Z - pzW) / (0.15 + pzW * 0.03);
            vec3 pc = mix(vec3(1.0, 0.5, 0.2), vec3(0.3, 1.0, 0.9), fi / 3.0);
            col += pc * (trail * 0.7 + exp(-headD * headD) * exp(-dx * dx) * 2.5) * exp(-pzW * 0.04);
        }
        // reflection of the horizon glow
        col += vec3(0.08, 0.45, 1.0) * exp(-(-sy) * 22.0) * 0.6;
    }

    // horizon line
    col += vec3(0.5, 0.85, 1.0) * exp(-abs(sy) * 400.0) * 1.2;
    // scanlines
    col *= 0.92 + 0.08 * sin(gl_FragCoord.y * 1.6);
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col)), 1.0);
}
