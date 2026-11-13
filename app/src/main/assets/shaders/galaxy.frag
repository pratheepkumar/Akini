// Galaxy — one shader, several designs.
// uP.x = number of arms, uP.y = viewing tilt (0 face-on, ~1.2 edge-on),
// uP.z = bar strength (>= 2.0 draws two merging galaxies), uP.w = arm tightness.
// uC1 = core colour, uC2 = arm colour, uC3 = star-forming knots.

vec3 galaxy(vec2 p, float size, float arms, float tilt, float bar, float tight, float spin, float seed) {
    vec2 q = rot2(0.5 + seed) * p / size;
    q.y /= max(cos(tilt), 0.2);
    float r = length(q);
    float a = atan(q.y, q.x) + spin;

    // a bar stretches the centre; arms start from its ends
    vec2 qb = rot2(spin) * q;
    float barD = length(qb * vec2(1.0, 1.0 + 5.0 * bar));
    float rr = mix(r, max(r, 0.18), bar);

    float phase = arms * a - log(rr + 0.05) * tight * arms;
    float armWave = 0.5 + 0.5 * cos(phase);
    float arm = pow(armWave, 4.0);
    float dustWave = 0.5 + 0.5 * cos(phase + 0.9);
    float disk = exp(-r * 3.0);
    vec2 n = rot2(spin * 0.5) * q * 3.0 + seed * 9.0;
    float clump = fbm4(n * 2.0);
    float knots = pow(smoothstep(0.58, 0.85, fbm4(n * 6.0 + 4.0)), 2.0);

    vec3 col = uC2 * disk * (0.10 + 1.5 * arm * (0.45 + 1.1 * clump));
    float dust = pow(dustWave, 8.0) * smoothstep(0.06, 0.3, r) * smoothstep(1.2, 0.3, r);
    col *= clamp(1.0 - dust * 0.75, 0.0, 1.0);
    col += uC3 * knots * arm * disk * 1.4;
    float bulge = exp(-r * r * 22.0) + 0.5 * exp(-barD * barD * 18.0) * step(0.01, bar);
    col += uC1 * bulge * 0.9;
    col += vec3(1.0, 0.97, 0.9) * exp(-r * r * 300.0) * 0.8;
    return max(col, 0.0);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.02;
    vec3 col = vec3(0.002, 0.003, 0.01);
    col += starLayer(p, 110.0, 0.92, 1.0) * 0.5;
    col += starLayer(p, 50.0, 0.95, 4.0) * 0.8;
    col += starLayer(p, 22.0, 0.98, 8.0) * 1.4;
    // faint distant galaxies
    vec2 dg = p * 8.0;
    vec2 did = floor(dg);
    if (hash12(did + 3.0) > 0.93) {
        vec2 f = fract(dg) - 0.5 - (hash22(did) - 0.5) * 0.5;
        f = rot2(hash12(did) * 6.0) * f;
        col += mix(uC1, uC2, 0.5) * exp(-dot(f * vec2(1.0, 3.0), f * vec2(1.0, 3.0)) * 400.0) * 0.5;
    }

    float spin = -uTime * 0.02;
    if (uP.z >= 2.0) {
        // two galaxies in a slow merger, joined by tidal tails
        vec2 c1 = vec2(-0.06, 0.09);
        vec2 c2 = vec2(0.08, -0.08);
        col += galaxy(p - c1, 0.17, 2.0, 0.6, 0.0, 0.9, spin, 0.0);
        col += galaxy(p - c2, 0.12, 2.0, 0.9, 0.0, 1.1, spin * 1.3 + 2.0, 1.7);
        vec2 t = p - mix(c1, c2, 0.5);
        float tail = exp(-pow(length(t * vec2(1.0, 0.6)) - 0.16, 2.0) * 1500.0) * smoothstep(-0.05, 0.25, t.x + t.y);
        col += uC2 * tail * pow(fbm4(p * 14.0), 2.0) * 0.9;
    } else {
        col += galaxy(p - vec2(0.0, 0.02), 0.45, uP.x, uP.y, uP.z, uP.w, spin, 0.0);
    }
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col)), 1.0);
}
