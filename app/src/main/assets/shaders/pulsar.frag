// Pulsar — a spinning neutron star sweeping twin beams through glowing field lines.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    p += uTilt * 0.015;
    vec3 col = vec3(0.002, 0.003, 0.012);
    col += starLayer(p, 90.0, 0.93, 3.0) * 0.5 + starLayer(p, 40.0, 0.965, 6.0) * 0.8;

    vec2 q = p - vec2(0.0, 0.02);
    float r = length(q);
    float spin = uTime * 0.9;
    // the magnetic axis precesses around the rotation axis
    float axisA = 1.5708 + 0.45 * sin(spin);
    vec2 axis = vec2(cos(axisA), sin(axisA));
    vec2 side = vec2(-axis.y, axis.x);
    float along = dot(q, axis);
    float across = dot(q, side);

    // dipole field lines: r = k * sin^2(theta)
    float theta = acos(clamp(along / max(r, 1e-4), -1.0, 1.0));
    float s2 = sin(theta) * sin(theta);
    float k = r / max(s2, 0.02);
    float lines = 0.0;
    for (int i = 0; i < 5; i++) {
        float kk = 0.06 + float(i) * 0.05;
        float d = abs(k - kk) * s2;
        lines += exp(-d * 380.0) * (0.6 - float(i) * 0.08);
    }
    float flow = 0.6 + 0.4 * sin(r * 120.0 - uTime * 4.0);
    col += uC2 * lines * flow * smoothstep(0.32, 0.05, r) * 0.7;

    // twin beams, flaring as they face us
    float face = 0.5 + 0.5 * cos(spin * 2.0);
    float width = 0.012 + abs(along) * 0.12;
    float beam = exp(-pow(across / width, 2.0)) * smoothstep(0.0, 0.03, abs(along)) * exp(-abs(along) * 2.2);
    col += uC1 * beam * (0.6 + 1.4 * face) * (0.8 + 0.2 * fbm4(vec2(along * 20.0 - uTime * 3.0, across * 30.0)));

    // the star itself and its glare
    col += vec3(0.85, 0.93, 1.0) * smoothstep(0.012, 0.006, r) * 2.0;
    col += uC3 * (0.0008 / (r * r + 0.0008)) * (0.5 + 0.8 * face);
    // diffraction cross
    col += uC3 * (exp(-abs(q.y) * 900.0) + exp(-abs(q.x) * 900.0)) * exp(-r * 12.0) * (0.3 + 0.5 * face);

    col *= 1.0 - 0.4 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col)), 1.0);
}
