// Fractal Bloom — a Julia set slowly unfurling like a flower.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p -= uTilt * 0.02;
    vec2 z = rot2(uTime * 0.01) * p * 2.0;
    float t = uTime * 0.05;
    vec2 c = vec2(-0.8 + 0.03 * cos(t), 0.156 + 0.03 * sin(t * 1.3));
    float n = 0.0;
    float trap = 10.0;
    for (int i = 0; i < 64; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        trap = min(trap, abs(length(z) - 0.5));
        if (dot(z, z) > 16.0) break;
        n += 1.0;
    }
    // smooth iteration count
    float sn = n - log2(log2(max(dot(z, z), 1.0001))) + 4.0;
    float v = sn / 64.0;
    vec3 col = palette(v * 2.0 + uTime * 0.01, vec3(0.5), vec3(0.5), vec3(1.0), uC1);
    col *= smoothstep(0.05, 0.45, v) * (1.0 - 0.85 * smoothstep(0.75, 1.0, v));
    col += uC2 * exp(-trap * 30.0) * 0.5 * smoothstep(0.2, 0.6, v);
    if (n > 63.0) col = uC3 * 0.15 + uC2 * exp(-trap * 40.0) * 0.25;
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
