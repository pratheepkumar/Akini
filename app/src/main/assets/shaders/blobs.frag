// Gradient Blobs — soft colour fields drifting and blending, with fine film grain.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.03;
    float t = uTime * 0.08;
    vec3 acc = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 c = vec2(sin(t * (0.7 + fi * 0.13) + fi * 2.1) * 0.22, cos(t * (0.5 + fi * 0.17) + fi * 1.3) * 0.38);
        vec3 col = fi < 1.5 ? (fi < 0.5 ? uC1 : uC2) : (fi < 2.5 ? uC3 : (fi < 3.5 ? mix(uC1, uC3, 0.5) : mix(uC2, vec3(1.0), 0.3)));
        float d = length(p - c);
        float w = exp(-d * d * 9.0);
        acc += col * w;
        wsum += w;
    }
    vec3 col = acc / max(wsum, 1e-3);
    // gentle brightness variation keeps it from looking flat
    col *= 0.8 + 0.3 * smoothstep(0.0, 1.2, wsum);
    col += (hash12(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.03;
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
