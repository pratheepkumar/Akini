// Voronoi Glass — irregular cells of coloured glass, slowly shifting, lit from behind.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.02;
    vec2 q = p * uP.x;
    vec2 id = floor(q);
    vec2 f = fract(q);
    float d1 = 8.0;
    float d2 = 8.0;
    vec2 best = vec2(0.0);
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(id + g);
            o = 0.5 + 0.4 * sin(uTime * 0.25 + TAU * o);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < d1) {
                d2 = d1;
                d1 = d;
                best = id + g;
            } else if (d < d2) {
                d2 = d;
            }
        }
    }
    float edge = sqrt(d2) - sqrt(d1);
    float h = hash12(best);
    vec3 glass = h < 0.33 ? uC1 : (h < 0.66 ? uC2 : uC3);
    glass *= 0.55 + 0.6 * hash12(best + 7.0);
    // light behind the glass slowly moves
    vec2 lp = vec2(sin(uTime * 0.1) * 0.15, 0.1 + cos(uTime * 0.08) * 0.25);
    float light = 0.45 + 0.9 * exp(-length(p - lp) * 2.5);
    vec3 col = glass * light * (0.75 + 0.25 * vnoise(q * 9.0 + h * 10.0));
    // dark lead lines between the panes
    float lead = smoothstep(0.06, 0.02, edge);
    col = mix(col, vec3(0.02, 0.018, 0.016), lead);
    col += vec3(1.0, 0.95, 0.85) * smoothstep(0.08, 0.06, edge) * (1.0 - lead) * 0.08;
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
