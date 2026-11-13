// Laser Show — fans of coloured beams sweeping through stage haze.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.02;
    vec3 col = vec3(0.004, 0.003, 0.01);
    float haze = 0.45 + 0.55 * fbm4(p * vec2(3.0, 2.0) + vec2(uTime * 0.05, -uTime * 0.03));

    for (int e = 0; e < 3; e++) {
        float fe = float(e);
        vec2 src = vec2((fe - 1.0) * 0.18, -0.5);
        vec2 d = p - src;
        float ang = atan(d.x, d.y);                 // 0 = straight up
        float dist = length(d);
        float sweep = sin(uTime * (0.3 + fe * 0.11) + fe * 2.0) * 0.6;
        float fanW = 0.35 + 0.15 * sin(uTime * 0.21 + fe);
        vec3 c = fe < 0.5 ? uC1 : (fe < 1.5 ? uC2 : uC3);
        for (int k = 0; k < 6; k++) {
            float fk = float(k);
            float beamA = sweep + (fk / 5.0 - 0.5) * fanW;
            float off = abs(ang - beamA) * dist;
            float beam = exp(-off * off * 60000.0) + exp(-off * 260.0) * 0.12;
            col += c * beam * haze * exp(-dist * 1.2) * 0.9;
        }
        // emitter glow
        col += c * 0.0006 / (dot(d, d) + 0.0006) * 0.8;
    }
    // stage floor
    col *= smoothstep(-0.52, -0.49, p.y);
    col += vec3(0.02, 0.015, 0.03) * smoothstep(-0.5, -0.56, p.y);
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
