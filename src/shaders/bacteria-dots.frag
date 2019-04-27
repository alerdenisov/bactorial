precision highp float;

uniform sampler2D map;
uniform float time;

varying vec2 vUv;
varying vec2 vIndex;

#define S(a, b, c) smoothstep(a, b, c)
#define saturate(a) clamp(a, 0.0, 1.0)
#define SLIDE 55.5
#define SLIDE2 .45
#define SPREAD 2.5
#define SIZE 32.
#define STEPS 3
#define SHINESS 2.2

#define N1(a) (noise(a) * 0.5 + 0.5)
#define L(c, t, a) min(S(c - t - 0.01, c - t, a), S(c + t + 0.01, c + t, a))
// float N21(vec2 p) { return fract(sin(p.x * 100. + p.y * 6574.) * 5647.); }

vec2 hash(vec2 x) // replace this by something better
{
  // return x;
  const vec2 k = vec2(0.3183099, 0.3678794);
  x = x * k + k.yx;
  return -1.0 + 2.0 * fract(16.0 * k * fract(x.x * x.y * (x.x + x.y)));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                 dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                 dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
             u.y);
}

float smoothDistance(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// float sdRoundCone(vec3 p, float r1, float r2, float h)
// {
//     vec2 q = vec2( length(p.xz), p.y );

//     float b = (r1-r2)/h;
//     float a = sqrt(1.0-b*b);
//     float k = dot(q,vec2(-b,a));

//     if( k < 0.0 ) return length(q) - r1;
//     if( k > a*h ) return length(q-vec2(0.0,h)) - r2;

//     return dot(q, vec2(a,b) ) - r1;
// }

float sphere(vec2 p, float r) {
  return length(p) - r;
}

void main() {
  // // gl_FragColor = vec4(vIndex, vIndex, vIndex, 1.0);
  // // return;
  // float r1 = noise(fract(vUv + time * SLIDE));
  // // float r = min(SmoothNoise2(vUv * SIZE + time * SLIDE), SmoothNoise2(vUv
  // *
  // // SIZE + time * SLIDE * 2.31));
  // float r1 = S(0.7, 0.8, noise(vUv.xy * 2.));
  // // float r1 = SmoothNoise2(vUv.xy * 5.0 + time * SLIDE2);//,
  // // SmoothNoise2(vUv.xy * 15. + time * SLIDE)));
  // // float r1 = SmoothNoise2(vUv.xy * 3. + time * SLIDE);
  // gl_FragColor = vec4(
  //   r1,
  //   0.,
  //   0.,
  //   1.
  // );
  // return;

  float r1 = S(0.6, .8, N1(fract(vUv + time * .1) * SIZE));// * SIZE + vIndex.x * SIZE  + time * -normalize(vec2(vIndex.x, vIndex.y)) * SLIDE) * 0.5 + 0.5);
  float sint = 0.5;//sin(time * 15.) * 0.5 + 0.5;
  float r2 = S(0.35, 0.3, N1(fract(vUv + time * 1.1) * SIZE * 0.5));// * 8. + time * normalize(vec2(vIndex.x, vIndex.y)) * SLIDE) * 0.5 + 0.5);
  float r = S(0.0, 0.1, r1 * r2);
  float b = r;
  float m = S(0.0, .95, 1.0 - length(vUv * 2.0 - 1.0) * 1.5);
  // gl_FragColor = vec4(b,b,b, 1.0);
  // return;
  vec3 dark = vec3(1., .388, .490);
  vec3 col = r * dark;//mix(vec3(0.), dark, r);
  gl_FragColor = vec4(col, 1.0);
  // float d = saturate(length(vUv * 2.0 - 1.0) * 1.85 + r * SPREAD);
  // float bg = 1. - pow(d, SHINESS);
  // bg = length(vUv * 2.0 - 1.0);
  // // bg = min(bg, length(vUv * 2.0 - 1.0 + vec2(1.0, 1.0) * fract(time)));
  // // bg = sin(length(vUv * 2.0 - 1.0 + (vec2(1.0, 1.0) * (fract(time) * 2.0 -
  // // 1.0))));

  // vec2 p = vUv * 2.0 - 1.0;
  // vec2 v = normalize(vec2(1.0, 1.0)) * fract(time);
  // float vp = length(v);
  // // bg = bg;// * abs(dot(p, v));

  // bg = smoothDistance(s1, s2, .65);
  // bg += r * SPREAD;
  // bg = S(0.15, -0.25, bg);
  
  // float mask = S(0.15, 0.25, bg);
  // // bg = s2;

  // bg *= float(STEPS + 1);
  // bg = floor(bg);
  // bg /= float(STEPS); // pow(d, 2.5);

  // // gl_FragColor = vec4(bg * mask, bg * mask, bg * mask, 1.0);


  // vec3 dark = vec3(1., .388, .490);
  // vec3 light = vec3(.988, .917, .929);
  // vec3 col = mix(dark, light, bg);
  // gl_FragColor = vec4(col * mask, 1.0);
  // vec3 col2 = mix(vec3(0.0), dark, r1);
  // // gl_FragColor = vec4(fract(bg), 0.0, 0.0, 1.0);
  // // gl_FragColor = vec4(mask, mask, mask, 1.0);
  // gl_FragColor = vec4(max(col * mask, col2), 1.0);
  // return;
  // float bright = bg; // floor((1.0 - bg) * 4.0) / 3.0;
  // float border = line(0.05, 0.67, d);

  // float body = S(0.7, 0.65, d);
}