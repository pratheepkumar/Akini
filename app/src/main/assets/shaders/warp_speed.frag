// Warp Speed — stars stretching into streaks as you jump to lightspeed.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 c = vec2(0.0, 0.03) - uTilt * 0.04;
    vec2 q = p - c;
    float r = length(q);
    float a = atan(q.y, q.x);
    vec3 col = vec3(0.003, 0.004, 0.015);
    col += mix(uC1, uC2, 0.5) * 0.06 * exp(-r * 3.0);

    // streaks: each angular slot carries a star racing outward
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float slots = 140.0 + fi * 90.0;
        float u = (a / TAU + 0.5) * slots;
        float id = floor(u);
        float fu = fract(u) - 0.5;
        float h = hash12(vec2(id, fi));
        float speed = 0.35 + 0.65 * h;
        float t = fract(uTime * speed * 0.35 + h * 13.0);
        float head = pow(t, 2.2) * 0.9;              // accelerates as it nears the edge
        float len = 0.02 + head * 0.35;
        float on = step(0.45, hash12(vec2(id, fi + 5.0)));
        float width = smoothstep(0.35, 0.0, abs(fu)) ;
        float seg = smoothstep(head - len, head, r) * smoothstep(head + 0.004, head, r);
        vec3 sc = mix(uC1, uC2, hash12(vec2(id, 9.0 + fi)));
        sc = mix(sc, vec3(1.0), 0.35);
        col += sc * seg * width * on * (0.4 + 1.2 * t) * (1.0 - fi * 0.25);
    }
    // bright core where the streaks are born
    col += uC3 * 0.0015 / (r * r + 0.0015) * 0.6;
    col += uC1 * exp(-r * 6.0) * 0.15;
    // subtle blue shift ring
    col += uC2 * exp(-pow((r - 0.45) * 6.0, 2.0)) * 0.05;

    col *= 1.0 - 0.3 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
