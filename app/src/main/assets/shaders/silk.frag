// Silk — folds of glossy fabric rippling in a slow breeze.

float folds(vec2 p) {
    float t = uTime * 0.12;
    float h = 0.0;
    h += sin(p.x * 2.2 + sin(p.y * 1.3 + t) * 1.6 + t * 0.7) * 0.6;
    h += sin(p.y * 2.7 + p.x * 0.9 - t * 0.9 + sin(p.x * 1.7 - t * 0.5)) * 0.35;
    h += sin((p.x + p.y) * 5.0 + t * 1.2) * 0.06;
    return h;
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.03;
    vec2 q = rot2(0.6) * p * 5.0;
    float e = 0.004;
    float h = folds(q);
    vec2 g = vec2(folds(q + vec2(e, 0.0)) - h, folds(q + vec2(0.0, e)) - h) / e;
    vec3 n = normalize(vec3(-g * 0.45, 1.0));
    vec3 l = normalize(vec3(-0.4, 0.6, 0.7));
    float diff = max(dot(n, l), 0.0);
    // anisotropic sheen: bright along the fold direction
    vec3 hv = normalize(l + vec3(0.0, 0.0, 1.0));
    float sheen = pow(max(dot(n, hv), 0.0), 25.0);
    vec3 col = mix(uC1 * 0.12, uC1 * 1.2, diff * diff);
    col += mix(uC2, vec3(1.0), 0.3) * sheen * 0.9;
    col += uC3 * pow(1.0 - n.z, 2.0) * 0.8;
    col *= 0.6 + 0.4 * smoothstep(-1.0, 1.0, h);
    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.1)), 1.0);
}
