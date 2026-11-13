// Milky Way — the galactic band arching over a dark mountain range.

vec3 band(vec2 p) {
    // rotate so the band runs diagonally up the screen
    vec2 q = rot2(-1.05) * (p - vec2(0.02, 0.05));
    q.x += uTime * 0.002;
    float across = q.y + 0.06 * (fbm4(vec2(q.x * 1.5, 1.0)) - 0.5);
    float core = exp(-across * across * 90.0);
    float glow = exp(-across * across * 22.0);
    float clouds = fbm(q * vec2(4.0, 9.0) + 3.0);
    float fine = fbm(q * vec2(14.0, 24.0) - 1.7);
    // dark dust lane running along the middle
    float dust = smoothstep(0.42, 0.75, fbm4(q * vec2(6.0, 16.0) + 7.3)) * exp(-pow(across - 0.008, 2.0) * 300.0);
    float bulge = exp(-pow(q.x - 0.10, 2.0) * 9.0);       // brighter galactic centre
    vec3 warm = mix(uC1, uC2, smoothstep(0.0, 1.0, bulge));
    vec3 col = warm * glow * (0.25 + 0.75 * clouds) * 0.10;
    col += mix(uC1, vec3(1.0, 0.95, 0.88), 0.5) * core * pow(clouds, 2.0) * (0.5 + 1.2 * bulge) * (0.5 + 0.7 * fine) * 0.35;
    col *= 1.0 - dust * 0.85;
    // pink star-forming knots and blue clusters
    col += uC3 * pow(smoothstep(0.62, 0.9, fine), 3.0) * core * 0.35;
    return col;
}

float mountains(float x) {
    float h = 0.0;
    h += 0.10 * sin(x * 3.1 + 1.3);
    h += 0.05 * sin(x * 7.3 + 0.4);
    h += 0.035 * (fbm4(vec2(x * 6.0, 0.5)) - 0.5) * 2.0;
    return -0.30 + h;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 sky = p + uTilt * 0.015;
    vec3 col = mix(vec3(0.004, 0.006, 0.02), vec3(0.015, 0.02, 0.05), smoothstep(0.5, -0.3, sky.y));
    col += band(sky);

    // star density rises inside the band
    vec2 bq = rot2(-1.05) * (sky - vec2(0.02, 0.05));
    float inBand = exp(-bq.y * bq.y * 12.0);
    col += starLayer(sky, 120.0, mix(0.93, 0.70, inBand), 1.0) * 0.55;
    col += starLayer(sky, 60.0, mix(0.95, 0.82, inBand), 5.0) * 0.9;
    col += starLayer(sky, 25.0, 0.975, 9.0) * 1.6;

    // horizon airglow + light pollution
    float mh = mountains(p.x + uTilt.x * 0.03);
    col += vec3(0.25, 0.18, 0.35) * exp(-max(p.y - mh, 0.0) * 9.0) * 0.18;
    col += vec3(0.6, 0.35, 0.2) * exp(-max(p.y - mh, 0.0) * 22.0) * 0.12;

    // mountain silhouette with a faint rim
    float m = smoothstep(0.0015, -0.0015, p.y - mh);
    vec3 ground = vec3(0.004, 0.005, 0.009) + vec3(0.02, 0.025, 0.04) * smoothstep(-0.02, 0.0, p.y - mh);
    col = mix(col, ground, m);
    // a nearer, darker ridge
    float mh2 = -0.40 + 0.06 * sin(p.x * 4.0 + 2.0) + 0.03 * fbm4(vec2(p.x * 9.0, 4.0));
    col = mix(col, vec3(0.002, 0.002, 0.004), smoothstep(0.0015, -0.0015, p.y - mh2));

    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col)), 1.0);
}
