// Contours — a living topographic map with glowing elevation lines.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.03;
    float t = uTime * 0.02;
    vec2 q = p * 2.0;
    float h = fbm(q + vec2(t, -t * 0.5) + 0.5 * vec2(fbm4(q * 0.7 + t), fbm4(q * 0.7 - t)));
    float levels = 28.0;
    float band = h * levels;
    float line = abs(fract(band) - 0.5);
    float px = 1.2 / uRes.y * levels * 3.0;
    float stroke = smoothstep(px, 0.0, line - 0.02);
    float major = smoothstep(px * 1.5, 0.0, abs(fract(band / 5.0) - 0.5) * 5.0 - 0.05);
    vec3 base = mix(uC1, uC2, smoothstep(0.3, 0.8, h));
    vec3 col = base * 0.18;
    col += mix(uC2, uC3, h) * (stroke * 0.45 + major * 0.9);
    // a scan sweep, like a radar mapping the terrain
    float sweep = exp(-pow(fract(vUv.y * 0.5 - uTime * 0.05) - 0.5, 2.0) * 300.0);
    col += uC3 * (stroke + major) * sweep * 0.6;
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
