// Supernova — a glowing remnant of filaments, with a shock wave rippling outwards.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.015;
    vec2 q = p - vec2(0.0, 0.03);
    float r = length(q);
    float a = atan(q.y, q.x);
    vec3 col = vec3(0.002, 0.003, 0.01);
    col += starLayer(p, 90.0, 0.93, 2.0) * 0.5 + starLayer(p, 40.0, 0.965, 5.0) * 0.8;

    // filamentary shell: noise stretched along the radius
    vec2 dir = q / max(r, 1e-4);
    float t = uTime * 0.02;
    float fil = fbm(dir * 3.0 + vec2(r * 9.0 - t, t * 0.5));
    float fil2 = fbm(dir * 7.0 + vec2(-r * 14.0 + t, 3.0));
    float shellR = 0.24 + 0.03 * (fbm4(dir * 2.5 + 1.0) - 0.5);
    float shell = exp(-pow((r - shellR) * 9.0, 2.0));
    float inner = exp(-r * 7.0);
    float filaments = pow(smoothstep(0.45, 0.85, fil), 2.0) * (shell * 1.6 + inner * 0.9);
    float wisps = pow(smoothstep(0.5, 0.9, fil2), 3.0) * smoothstep(shellR + 0.1, 0.05, r);

    col += uC1 * filaments * 1.4;                                    // outer filaments
    col += uC2 * wisps * 1.2;                                        // inner glow
    col += uC3 * inner * (0.35 + 0.65 * fil2) * 0.8;
    col += mix(uC2, uC1, 0.5) * exp(-pow((r - shellR) * 4.0, 2.0)) * 0.08;

    // expanding shock ring every 14 seconds
    float cycle = fract(uTime / 14.0);
    float sr = cycle * 0.55;
    float shock = exp(-pow((r - sr) * 60.0, 2.0)) * (1.0 - cycle) * (0.6 + 0.4 * fbm4(dir * 6.0 + 2.0));
    col += mix(uC3, vec3(1.0), 0.4) * shock * 1.2;

    // the pulsing neutron star at the centre
    float beat = 0.7 + 0.3 * pow(0.5 + 0.5 * sin(uTime * 6.0), 6.0);
    col += vec3(0.85, 0.92, 1.0) * (0.0003 / (r * r + 0.0003)) * beat * 1.4;

    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
