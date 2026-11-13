// Wormhole — falling down a tunnel of light toward another galaxy.

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 c = vec2(0.0, 0.04) - uTilt * 0.03;
    vec2 q = p - c;
    float r = length(q);
    float a = atan(q.y, q.x);
    float t = uTime;

    // tunnel walls: depth = 1/r, twisting as you travel
    float depth = 0.12 / max(r, 0.002) + t * 0.6;
    float tw = a / TAU + depth * 0.05;
    vec2 tuv = vec2(tw * 8.0, depth);
    // integer number of repeats around the circle keeps the seam invisible
    float rings = fbm4(vec2(cos(a) * 3.0 + depth * 0.7, sin(a) * 3.0 + depth * 0.5));
    float streaks = pow(0.5 + 0.5 * sin(a * 12.0 + depth * 2.0 + rings * 4.0), 6.0);
    float wall = smoothstep(0.03, 0.4, r);
    vec3 col = mix(uC1, uC2, 0.5 + 0.5 * sin(depth * 0.4 + a * 2.0)) * (rings * 0.9 + streaks * 0.8) * wall;
    col *= 0.25 + 1.6 * smoothstep(0.6, 0.05, r);

    // stars rushing past the walls
    vec2 sg = vec2(a * 6.0 / TAU * 6.0, depth * 3.0);
    vec2 id = floor(sg);
    vec2 f = fract(sg) - 0.5;
    float s = step(0.86, hash12(vec2(mod(id.x, 36.0), id.y))) * smoothstep(0.25, 0.0, length(f * vec2(1.0, 0.25)));
    col += vec3(0.85, 0.92, 1.0) * s * wall * smoothstep(0.02, 0.2, r) * 1.2;

    // the far mouth: a bright galaxy waiting at the end
    float mouth = smoothstep(0.045, 0.0, r);
    vec2 g = rot2(t * 0.1) * q / 0.04;
    float ga = atan(g.y, g.x);
    float gr = length(g);
    float arms = pow(0.5 + 0.5 * cos(2.0 * ga - log(gr + 0.05) * 3.0), 3.0) * exp(-gr * 1.8);
    col += (uC3 * arms * 2.0 + vec3(1.0, 0.95, 0.85) * exp(-gr * gr * 6.0) * 2.0) * mouth;
    // bright Einstein ring around the mouth
    col += uC3 * exp(-pow((r - 0.05) * 140.0, 2.0)) * 1.2;
    col += mix(uC1, uC3, 0.5) * 0.004 / (r + 0.01);

    col *= 1.0 - 0.35 * dot(vUv - 0.5, vUv - 0.5);
    gl_FragColor = vec4(finish(tonemap(col)), 1.0);
}
