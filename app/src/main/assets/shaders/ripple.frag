// Ripple — raindrops landing on a still pool, light dancing on the bottom.

float height(vec2 p) {
    float h = 0.0;
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float period = 3.5 + fi * 0.7;
        float k = floor((uTime + fi * 1.3) / period);
        float t = mod(uTime + fi * 1.3, period);
        vec2 c = (hash22(vec2(k, fi)) - 0.5) * vec2(0.5, 1.0);
        float d = length(p - c);
        float wave = sin(d * 90.0 - t * 9.0) * exp(-abs(d - t * 0.1) * 30.0) * exp(-t * 0.6);
        h += wave;
    }
    // the last touch adds its own ripple
    if (uTouch.w > 0.5) {
        vec2 tp = (uTouch.xy - 0.5) * vec2(uRes.x / uRes.y, 1.0);
        float d = length(p - tp);
        h += sin(d * 90.0 - uTouch.z * 9.0) * exp(-abs(d - uTouch.z * 0.1) * 30.0) * exp(-uTouch.z * 0.6);
    }
    return h;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float e = 0.002;
    float h = height(p);
    vec2 grad = vec2(height(p + vec2(e, 0.0)) - h, height(p + vec2(0.0, e)) - h) / e;
    vec3 n = normalize(vec3(-grad * 0.004, 1.0));

    // pool floor seen through the water, bent by the ripples
    vec2 fp = p + n.xy * 0.05;
    float tiles = smoothstep(0.02, 0.0, abs(fract(fp.x * 9.0) - 0.5) - 0.47) + smoothstep(0.02, 0.0, abs(fract(fp.y * 9.0) - 0.5) - 0.47);
    vec3 floorCol = mix(uC1, uC1 * 0.75, clamp(tiles, 0.0, 1.0));
    // caustic light
    vec2 cp = fp * 6.0 + vec2(uTime * 0.08, uTime * 0.05);
    float caus = pow(1.0 - abs(sin(fbm4(cp) * 9.0)), 6.0) * 0.6 + pow(1.0 - abs(sin(fbm4(cp * 1.7 + 3.0) * 8.0)), 8.0) * 0.4;
    vec3 col = floorCol * (0.7 + 0.45 * caus);
    // surface reflection of the sky and a soft sun highlight
    float fres = (1.0 - n.z) * 6.0;
    col = mix(col, uC2, clamp(fres, 0.0, 0.6));
    vec3 l = normalize(vec3(0.4, 0.6, 1.0));
    col += vec3(1.0) * pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 40.0) * 0.5;
    col *= 1.0 - 0.3 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
