// Holy Cross — a crossD on a hilltop at dawn, sunbeams breaking through the clouds.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p.x += uTilt.x * 0.01;
    vec2 sun = vec2(0.0, 0.06);
    vec2 d = p - sun;
    float r = length(d);
    vec3 col = mix(uC2, uC1, smoothstep(-0.2, 0.5, p.y));
    col += uC3 * 0.02 / (r + 0.03);
    // clouds
    float cl = fbm(vec2(p.x * 2.2 + uTime * 0.008, p.y * 4.5));
    float cloud = smoothstep(0.45, 0.75, cl) * smoothstep(-0.05, 0.1, p.y);
    vec3 cloudCol = mix(uC1 * 0.6, uC3, smoothstep(0.4, 0.0, r) * 0.8);
    // silver lining
    cloudCol += uC3 * smoothstep(0.45, 0.5, cl) * (1.0 - smoothstep(0.5, 0.6, cl)) * 0.6;
    col = mix(col, cloudCol, cloud * 0.85);
    // crepuscular rays streaming from the sun
    float a = atan(d.y, d.x);
    float rays = pow(0.5 + 0.5 * sin(a * 18.0 + fbm4(vec2(a * 3.0, uTime * 0.05)) * 4.0), 3.0);
    col += uC3 * rays * exp(-r * 2.2) * (0.35 + 0.65 * (1.0 - cloud)) * 0.35;
    col += uC3 * fillAA(r - 0.035) * 0.6;
    // the hill
    float hill = -0.2 + 0.08 * exp(-p.x * p.x * 12.0) + 0.01 * fbm4(vec2(p.x * 15.0, 1.0));
    float ground = smoothstep(0.001, -0.001, p.y - hill);
    col = mix(col, mix(uC1 * 0.12, uC1 * 0.05, smoothstep(hill, hill - 0.3, p.y)), ground);
    // grass blades along the ridge
    float grass = smoothstep(0.004, 0.0, p.y - hill - 0.008 * abs(sin(p.x * 260.0)) * step(0.5, hash12(vec2(floor(p.x * 130.0), 1.0))));
    col = mix(col, uC1 * 0.08, grass * (1.0 - ground));
    // the crossD, with a warm rim where the sun catches it
    vec2 c = p - vec2(0.0, hill + 0.0);
    float top = -0.12 + 0.088;
    vec2 cp = p - vec2(0.0, -0.032);
    float crossD = min(sdBox(cp - vec2(0.0, 0.07), vec2(0.009, 0.115)), sdBox(cp - vec2(0.0, 0.12), vec2(0.055, 0.008)));
    col = mix(col, vec3(0.03, 0.025, 0.02), fillAA(crossD));
    col += uC3 * exp(-abs(crossD) * 180.0) * step(0.0, crossD) * 0.5;
    // a soft halo
    col += uC3 * exp(-length(cp - vec2(0.0, 0.12)) * 6.0) * 0.12 * (0.85 + 0.15 * sin(uTime * 0.6));
    // birds gliding
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 b = p - vec2(fract(uTime * 0.01 + fi * 0.33) * 0.8 - 0.4, 0.25 + fi * 0.035);
        float flap = sin(uTime * 4.0 + fi) * 0.004;
        float bird = min(sdSegment(b, vec2(-0.01, flap), vec2(0.0, 0.0)), sdSegment(b, vec2(0.0, 0.0), vec2(0.01, flap))) - 0.0012;
        col = mix(col, uC1 * 0.2, fillAA(bird));
    }
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
