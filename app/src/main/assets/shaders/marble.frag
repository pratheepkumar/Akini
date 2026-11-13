// Liquid Marble — polished stone with veins that slowly flow and shimmer.
// uC1 = stone, uC2 = vein, uC3 = vein glow.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.02;
    float t = uTime * 0.015;
    vec2 q = p * 2.2;
    vec2 w = vec2(fbm(q + vec2(t, 0.0)), fbm(q + vec2(3.1, 7.4) - vec2(0.0, t)));
    float f = fbm(q + 2.2 * w);
    // veins: thin ridges where a warped sine crosses zero
    float v = abs(sin((q.x + q.y * 0.6) * 3.0 + f * 9.0));
    float vein = pow(1.0 - v, 22.0);
    float vein2 = pow(1.0 - abs(sin((q.y - q.x * 0.4) * 5.0 + f * 12.0 + 1.3)), 40.0) * 0.6;
    vec3 col = uC1 * (0.75 + 0.35 * f);
    col = mix(col, uC1 * 0.55, smoothstep(0.4, 0.7, fbm(q * 3.0 + 4.0)) * 0.5);
    col = mix(col, uC2, clamp(vein + vein2, 0.0, 1.0));
    // a glint travelling along the veins
    float glint = pow(0.5 + 0.5 * sin(f * 20.0 - uTime * 0.6), 10.0);
    col += uC3 * (vein + vein2) * glint * 0.8;
    // polished surface: a broad soft reflection
    col += vec3(1.0) * pow(max(0.0, 1.0 - length(p - vec2(-0.12, 0.25)) * 1.6), 3.0) * 0.12;
    col *= 1.0 - 0.3 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
