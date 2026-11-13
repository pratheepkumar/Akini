// Colour Splash — clouds of ink blooming and swirling through water.
// uP.x = detail, uP.y = swirl strength. uC1..uC3 = the three inks.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.03;
    float t = uTime * 0.03;
    vec2 q = p * uP.x;
    vec2 w1 = vec2(fbm(q + vec2(0.0, t)), fbm(q + vec2(5.2, 1.3) - t));
    vec2 w2 = vec2(fbm(q + uP.y * w1 + vec2(1.7, 9.2) + t * 0.5), fbm(q + uP.y * w1 + vec2(8.3, 2.8)));
    float f = fbm(q + uP.y * w2);

    vec3 paper = vec3(0.96, 0.95, 0.93);
    vec3 col = paper;
    // three inks, each with soft edges and a darker rim where the pigment collects
    float i1 = smoothstep(0.52, 0.66, f);
    float i2 = smoothstep(0.58, 0.72, length(w2) * 0.75);
    float i3 = smoothstep(0.6, 0.7, fbm(q * 1.3 + w2 * 2.0 + 5.0));
    col = mix(col, uC1, i1 * 0.9);
    col = mix(col, uC2, i2 * 0.85);
    col = mix(col, uC3, i3 * 0.8);
    float rim = exp(-pow((f - 0.47) * 40.0, 2.0)) + exp(-pow((length(w2) * 0.75 - 0.52) * 40.0, 2.0));
    col *= 1.0 - rim * 0.18;
    // fine pigment grain
    col *= 0.94 + 0.06 * vnoise(p * 300.0);
    col = mix(col, col * col, 0.25);
    col *= 1.0 - 0.25 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
