// Lava Lamp — soft glowing blobs rising, merging and sinking in warm liquid.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.02;
    float field = 0.0;
    vec2 grad = vec2(0.0);
    for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float h = hash12(vec2(fi, 2.0));
        float speed = 0.04 + 0.04 * h;
        // each blob rises and falls through the lamp
        float y = sin(uTime * speed * TAU + h * 6.28) * 0.36;
        float x = sin(uTime * 0.07 + fi * 1.9) * 0.10 + (h - 0.5) * 0.12;
        float r = 0.05 + 0.05 * hash12(vec2(fi, 5.0));
        vec2 d = p - vec2(x, y);
        float k = r * r / (dot(d, d) + 1e-4);
        field += k;
        grad += -2.0 * d * k * k / (r * r);
    }
    // blobs at the bottom and top of the lamp
    field += 0.02 / (pow(p.y + 0.55, 2.0) + 0.001) * 0.05 + 0.02 / (pow(p.y - 0.55, 2.0) + 0.001) * 0.03;
    float inside = smoothstep(0.95, 1.05, field);
    vec3 n = normalize(vec3(-grad * 0.02, 1.0));
    float light = 0.6 + 0.4 * dot(n, normalize(vec3(-0.3, 0.5, 0.8)));
    vec3 liquid = mix(uC2 * 0.25, uC2 * 0.6, vUv.y);
    vec3 wax = mix(uC1, uC3, smoothstep(1.0, 3.0, field)) * light;
    vec3 col = mix(liquid, wax, inside);
    col += uC1 * smoothstep(0.4, 1.0, field) * (1.0 - inside) * 0.35;     // glow around the wax
    col += vec3(1.0) * pow(max(n.z, 0.0), 30.0) * inside * 0.0;
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
