// Synthwave Sunset — a striped retro sun sinking behind wireframe mountains.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.02;
    float horizon = -0.08;
    float sy = p.y - horizon;
    vec3 col;
    if (sy > 0.0) {
        col = mix(uC2 * 0.35, vec3(0.03, 0.0, 0.08), smoothstep(0.0, 0.55, sy));
        col += starLayer(p, 70.0, 0.95, 3.0) * smoothstep(0.2, 0.45, sy) * 0.8;
        // the sun with horizontal cut-outs that scroll downward
        vec2 sp = p - vec2(0.0, horizon + 0.16);
        float sr = 0.17;
        float sun = fillAA(length(sp) - sr);
        float stripeY = sp.y + sr;
        float gaps = step(fract(stripeY * 28.0 - uTime * 0.25), mix(0.0, 0.55, smoothstep(0.17, 0.0, stripeY)));
        vec3 sunCol = mix(uC2, uC1, smoothstep(-sr, sr, sp.y));
        col = mix(col, sunCol * 1.6, sun * (1.0 - gaps));
        col += uC2 * 0.012 / (abs(length(sp) - sr) + 0.02) * 0.6;
        // wireframe mountains
        float x = p.x;
        float mh = 0.06 + 0.07 * abs(sin(x * 6.0 + 1.0)) * smoothstep(0.02, 0.25, abs(x)) + 0.02 * fbm4(vec2(x * 10.0, 1.0));
        if (sy < mh) {
            col = vec3(0.02, 0.0, 0.05);
            float gx = abs(fract(x * 30.0) - 0.5);
            float gy = abs(fract((sy / mh) * 6.0) - 0.5);
            float wire = max(smoothstep(0.08, 0.0, gx), smoothstep(0.08, 0.0, gy) * 0.7);
            col += uC3 * wire * 0.6 * (0.4 + 0.6 * sy / mh);
            col += uC3 * smoothstep(0.004, 0.0, abs(sy - mh)) * 1.2;
        }
    } else {
        // perspective grid floor
        float d = -sy;
        float Z = 0.4 / d;
        float X = p.x * Z;
        vec2 g = vec2(X * 3.0, Z * 3.0 + uTime * 2.0);
        vec2 gf = 0.5 - abs(fract(g) - 0.5);
        float pz = 3.0 * Z * Z / 0.4 / uRes.y;
        float pxw = 3.0 * (Z + abs(p.x) * Z * Z / 0.4) / uRes.y;
        float lines = max((1.0 - smoothstep(0.03, 0.03 + pxw * 1.5, gf.x)) * clamp(0.3 / pxw, 0.0, 1.0),
                          (1.0 - smoothstep(0.03, 0.03 + pz * 1.5, gf.y)) * clamp(0.3 / pz, 0.0, 1.0));
        col = vec3(0.02, 0.0, 0.05);
        col += uC3 * lines * (0.4 + 1.4 * exp(-Z * 0.1));
        // sun reflection on the floor
        col += uC2 * exp(-abs(p.x) * 9.0) * exp(-d * 6.0) * 0.4;
    }
    col += uC2 * exp(-abs(sy) * 90.0) * 0.6;
    col *= 0.93 + 0.07 * sin(gl_FragCoord.y * 1.4);
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
