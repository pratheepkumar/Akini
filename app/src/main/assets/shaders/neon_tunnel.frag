// Neon Tunnel — glowing rounded frames rushing toward you down an endless corridor.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 c = vec2(0.0, 0.03) - uTilt * 0.04;
    vec2 q = p - c;
    vec3 col = vec3(0.004, 0.003, 0.012);

    // each frame sits at a depth z; it moves toward the camera over time
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float u = fi / 12.0 - uTime * 0.06;
        float z = fract(u) * 12.0 + 0.4;                            // 0.4 .. 12.4
        float s = 0.6 / z;                                          // screen scale
        vec2 size = vec2(0.42, 0.78) * s;
        float rr = 0.12 * s;
        float d = abs(sdRoundBox(q, size, rr));
        float idx = fi - floor(u) * 12.0;                           // stable id per frame
        vec3 fc = mix(uC1, uC2, step(0.5, fract(idx * 0.5)));
        fc = mix(fc, uC3, step(0.92, hash12(vec2(idx, 3.0))));
        float fade = smoothstep(12.4, 7.0, z) * smoothstep(0.4, 1.0, z);
        float lw = 0.0025 * s / 0.6 * 2.0 + 0.0008;
        col += fc * (smoothstep(lw, 0.0, d) * 1.6 + exp(-d * 90.0 / max(s, 0.05)) * 0.18) * fade;
    }
    // floor reflection streaks
    float gy = q.y;
    float refl = exp(-abs(q.x) * 6.0) * smoothstep(-0.05, -0.5, gy) * 0.05;
    col += mix(uC1, uC2, 0.5) * refl;
    // vanishing-point glow
    col += mix(uC1, uC2, 0.5 + 0.5 * sin(uTime * 0.5)) * 0.0015 / (dot(q, q) + 0.002);

    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
