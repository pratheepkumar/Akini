// Vinyl Record — a spinning record on a turntable, light gliding across the grooves.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.01;
    // walnut plinth
    float grain = fbm(vec2(p.x * 3.0, p.y * 40.0 + fbm4(p * 4.0) * 3.0));
    vec3 col = mix(uC1 * 0.5, uC1, grain);
    col *= 0.85 + 0.15 * sin(p.y * 300.0 + grain * 20.0);

    vec2 c = vec2(0.0, 0.05);
    vec2 q = p - c;
    float r = length(q);
    float R = 0.21;
    // platter shadow
    col *= 1.0 - 0.6 * smoothstep(R + 0.03, R, length(q + vec2(0.01, -0.012)));
    if (r < R) {
        float ang = atan(q.y, q.x);
        // grooves and the fixed sheen of the light on them
        float grooves = 0.5 + 0.5 * sin(r * 1500.0);
        float sheen = pow(abs(cos(ang - 0.8)), 30.0) * smoothstep(0.07, 0.12, r);
        vec3 vinyl = vec3(0.025, 0.022, 0.025) * (0.85 + 0.15 * grooves);
        vinyl += vec3(0.5, 0.48, 0.45) * sheen * (0.35 + 0.2 * grooves);
        // track gaps
        float gap = smoothstep(0.002, 0.0, abs(fract(r * 18.0) - 0.5) - 0.48) * step(0.08, r);
        vinyl *= 1.0 - gap * 0.6;
        col = vinyl;
        // spinning label
        float spin = uTime * 3.49;    // 33 1/3 rpm
        vec2 lq = rot2(-spin) * q;
        if (r < 0.068) {
            float la = atan(lq.y, lq.x);
            vec3 label = mix(uC2, uC3, step(0.0, lq.y) * 0.25);
            float ring = smoothstep(0.002, 0.0, abs(r - 0.055)) + smoothstep(0.002, 0.0, abs(r - 0.025));
            float text = step(0.4, fract(la / TAU * 26.0)) * step(abs(r - 0.044), 0.004) * step(0.0, lq.y);
            float logo = step(abs(lq.x), 0.02) * step(abs(lq.y + 0.03), 0.004);
            label = mix(label, vec3(0.95, 0.9, 0.8), clamp(ring + text * 0.8 + logo, 0.0, 1.0) * 0.7);
            col = label;
        }
        col = mix(col, vec3(0.75), smoothstep(0.006, 0.004, r));   // spindle
        // edge highlight
        col += vec3(0.3) * smoothstep(0.003, 0.0, abs(r - R + 0.002));
    }
    // tonearm resting on the record
    vec2 pivot = c + vec2(0.17, 0.27);
    vec2 head = c + vec2(0.06, -0.12);
    float arm = sdSegment(p, pivot, head) - 0.006;
    arm = min(arm, sdCircle(p - pivot, 0.03));
    arm = min(arm, sdRoundBox(rot2(0.5) * (p - head), vec2(0.02, 0.012), 0.004));
    col = mix(col * (1.0 - 0.5 * fillAA(arm - 0.012)), vec3(0.62, 0.6, 0.58) * (0.7 + 0.3 * smoothstep(-0.01, 0.01, p.x - p.y)), fillAA(arm));
    col = filmLook(col, 0.3);
    gl_FragColor = vec4(finish(clamp(col, 0.0, 1.0)), 1.0);
}
