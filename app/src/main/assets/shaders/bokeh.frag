// Bokeh — out-of-focus city lights drifting softly through the frame.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec3 col = mix(uC1 * 0.08, vec3(0.01, 0.008, 0.015), vUv.y);
    for (int layer = 0; layer < 3; layer++) {
        float fl = float(layer);
        float sc = 4.0 + fl * 3.0;
        vec2 q = (p + uTilt * (0.02 + fl * 0.02)) * sc + vec2(uTime * (0.03 + fl * 0.02), sin(uTime * 0.05 + fl) * 0.3);
        vec2 id = floor(q);
        vec2 f = fract(q) - 0.5;
        float h = hash12(id + fl * 17.0);
        if (h > 0.35) {
            vec2 off = (hash22(id + fl) - 0.5) * 0.5;
            float r = 0.18 + 0.2 * hash12(id + 3.0) - fl * 0.03;
            float d = length(f - off);
            // bokeh disc: flat with a slightly brighter rim
            float disc = smoothstep(r, r - 0.03, d);
            float rim = smoothstep(r - 0.06, r - 0.01, d) * disc;
            vec3 c = h < 0.6 ? uC1 : (h < 0.85 ? uC2 : uC3);
            float tw = 0.7 + 0.3 * sin(uTime * (0.5 + h) + h * 30.0);
            col += c * (disc * 0.22 + rim * 0.18) * tw * (0.6 + fl * 0.25);
        }
    }
    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.4)), 1.0);
}
