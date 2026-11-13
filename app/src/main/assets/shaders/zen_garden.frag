// Zen Garden — raked sand rippling around stones, soft light drifting across.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.01;
    // three stones
    vec2 s1 = vec2(-0.08, 0.16);
    vec2 s2 = vec2(0.10, -0.06);
    vec2 s3 = vec2(-0.05, -0.27);
    float d1 = length((p - s1) * vec2(1.0, 1.3)) - 0.045;
    float d2 = length((p - s2) * vec2(1.0, 1.25)) - 0.065;
    float d3 = length((p - s3) * vec2(1.0, 1.4)) - 0.035;
    float ds = min(d1, min(d2, d3)) + 0.008 * (fbm4(p * 40.0) - 0.5);
    // rake lines: straight furrows bending into rings around the stones
    float ring = ds;
    float straight = p.y;
    float k = smoothstep(0.12, 0.03, ds);
    float field = mix(straight, ring, k);
    float furrow = sin(field * 220.0);
    float height = furrow * 0.5 + 0.5;
    // light from the upper left shading the furrows
    float shade = 0.82 + 0.18 * cos(field * 220.0 + 0.8);
    vec3 sand = mix(uC1 * 0.85, uC1, height) * shade;
    sand *= 0.95 + 0.05 * vnoise(p * 400.0);
    // drifting cloud shadows
    sand *= 0.85 + 0.15 * smoothstep(0.3, 0.7, fbm4(p * 2.0 + vec2(uTime * 0.02, uTime * 0.01)));
    vec3 col = sand;
    // moss collars around the stones
    float moss = smoothstep(0.02, 0.0, ds) * (0.6 + 0.4 * fbm4(p * 60.0));
    col = mix(col, uC2 * (0.6 + 0.4 * fbm4(p * 90.0)), moss);
    // the stones, lit from the upper left
    float m = fillAA(ds);
    vec2 sc = p - (d1 < d2 ? (d1 < d3 ? s1 : s3) : (d2 < d3 ? s2 : s3));
    float lit = 0.5 + 0.5 * dot(normalize(sc + 1e-4), normalize(vec2(-0.6, 0.8)));
    vec3 stone = uC3 * (0.55 + 0.45 * lit) * (0.8 + 0.2 * fbm4(p * 80.0));
    col = mix(col * (1.0 - 0.3 * smoothstep(0.03, 0.0, ds + 0.0)), stone, m);
    // a falling petal drifting across
    vec2 pp = p - vec2(fract(uTime * 0.02) * 0.6 - 0.3, 0.3 - fract(uTime * 0.02) * 0.6 + 0.02 * sin(uTime));
    pp = rot2(uTime * 0.7) * pp;
    float petal = fillAA((length(pp * vec2(1.0, 2.0)) - 0.008));
    col = mix(col, vec3(0.98, 0.75, 0.8), petal);
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(col), 1.0);
}
