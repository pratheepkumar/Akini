// Op Art — bold stripes bending around invisible lenses, an optical illusion in motion.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.02;
    vec2 q = p;
    // two lenses drifting across the plane bend the stripes
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 c = vec2(sin(uTime * 0.11 + fi * 2.5) * 0.15, cos(uTime * 0.07 + fi * 1.7) * 0.3);
        vec2 d = q - c;
        float r = length(d);
        q += d * 0.9 * exp(-r * r * 30.0);
    }
    float stripes = sin(q.y * 70.0 + sin(q.x * 6.0 + uTime * 0.2) * 2.0);
    float aa = 70.0 * 1.5 / uRes.y * 3.0;
    float bw = smoothstep(-aa, aa, stripes);
    vec3 col = mix(uC1, uC2, bw);
    // a thin accent colour where the lenses are strongest
    float lensMask = 0.0;
    for (int i = 0; i < 2; i++) {
        float fi = float(i);
        vec2 c = vec2(sin(uTime * 0.11 + fi * 2.5) * 0.15, cos(uTime * 0.07 + fi * 1.7) * 0.3);
        lensMask += exp(-dot(p - c, p - c) * 40.0);
    }
    col = mix(col, uC3 * (0.3 + 0.7 * bw), clamp(lensMask, 0.0, 1.0) * 0.55);
    gl_FragColor = vec4(finish(col), 1.0);
}
