// Hex Shield — a curved energy barrier of hexagons, rippling when struck.

vec4 hexCell(vec2 p) {
    vec2 s = vec2(1.0, 1.7320508);
    vec2 a = mod(p, s) - s * 0.5;
    vec2 b = mod(p - s * 0.5, s) - s * 0.5;
    vec2 g = dot(a, a) < dot(b, b) ? a : b;
    vec2 id = p - g;
    vec2 ag = abs(g);
    float edge = 0.5 - max(dot(ag, s * 0.5), ag.x);
    return vec4(g, edge, hash12(floor(id * 10.0 + 0.5)));
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 c = vec2(0.0, 0.0) + uTilt * 0.02;
    vec2 q = p - c;
    float r = length(q);
    // bulge the grid as if on a sphere
    float R = 0.62;
    float z = sqrt(max(R * R - r * r, 0.0));
    vec2 sq = q / (z + 0.25) * 0.55;
    vec4 h = hexCell(sq * 16.0);

    vec3 col = vec3(0.002, 0.006, 0.014);
    col += mix(uC1, uC2, 0.5) * 0.03 * smoothstep(0.7, 0.0, r);

    // impacts: three expanding ripples at different spots
    float hit = 0.0;
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float period = 5.0 + fi * 1.7;
        float k = floor((uTime + fi * 2.1) / period);
        float t = fract((uTime + fi * 2.1) / period) * period;
        vec2 hp = (hash22(vec2(k, fi)) - 0.5) * vec2(0.4, 0.8);
        float d = length(q - hp);
        hit += exp(-pow((d - t * 0.25) * 18.0, 2.0)) * exp(-t * 0.8) * 2.0;
        hit += exp(-d * 20.0) * exp(-t * 3.0) * 3.0;
    }

    float edge = smoothstep(0.06, 0.0, h.z);
    float shimmer = 0.5 + 0.5 * sin(uTime * 1.5 + h.w * 30.0);
    float fillv = pow(shimmer, 6.0) * 0.25;
    float face = smoothstep(R, R * 0.2, r);
    vec3 lines = mix(uC1, uC2, h.w);
    col += lines * edge * (0.25 + hit * 0.8) * face;
    col += lines * fillv * face * smoothstep(0.0, 0.2, h.z);
    col += uC3 * hit * smoothstep(0.1, 0.0, h.z) * 0.6 * face;
    // rim of the shield
    col += uC1 * exp(-pow((r - R * 0.92) * 30.0, 2.0)) * 0.6;
    col += uC1 * smoothstep(R * 0.95, R * 0.4, r) * pow(r / R, 4.0) * 0.4;
    // the object being protected: a faint core
    col += uC2 * 0.002 / (r * r + 0.004);

    col *= 1.0 - 0.45 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col * 1.2)), 1.0);
}
