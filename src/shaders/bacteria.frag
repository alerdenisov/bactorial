precision highp float;

uniform sampler2D map;
uniform float time;

varying vec2 vUv;
varying float vScale;

float N21(vec2 p) { return fract(sin(p.x * 100. + p.y * 6574.) * 5647.); }

float SmoothNoise(vec2 uv) {
  vec2 lv = fract(uv);
  vec2 id = floor(uv);

  lv = lv * lv * (3. - 2. * lv);

  float bl = N21(id);
  float br = N21(id + vec2(1, 0));
  float b = mix(bl, br, lv.x);

  float tl = N21(id + vec2(0, 1));
  float tr = N21(id + vec2(1, 1));
  float t = mix(tl, tr, lv.x);

  return mix(b, t, lv.y);
}

float SmoothNoise2(vec2 uv) {
  float c = SmoothNoise(uv * 4.);

  // don't make octaves exactly twice as small
  // this way the pattern will look more random and repeat less
  c += SmoothNoise(uv * 8.2) * .5;
  c += SmoothNoise(uv * 16.7) * .25;
  c += SmoothNoise(uv * 32.4) * .125;
  c += SmoothNoise(uv * 64.5) * .0625;

  c /= 2.;

  return c;
}

// HSL to RGB Convertion helpers
vec3 HUEtoRGB(float H) {
  H = mod(H, 1.0);
  float R = abs(H * 6.0 - 3.0) - 1.0;
  float G = 2.0 - abs(H * 6.0 - 2.0);
  float B = 2.0 - abs(H * 6.0 - 4.0);
  return clamp(vec3(R, G, B), 0.0, 1.0);
}

vec3 HSLtoRGB(vec3 HSL) {
  vec3 RGB = HUEtoRGB(HSL.x);
  float C = (1.0 - abs(2.0 * HSL.z - 1.0)) * HSL.y;
  return (RGB - 0.5) * C + HSL.z;
}

float line(float thickness, float center, float number) {
  float a = smoothstep(center - thickness, center, number);
  float b = smoothstep(center + thickness, center, number);

  return min(a,b);
}

#define S(a,b,c) smoothstep(a, b, c)
#define SLIDE .3
#define SPREAD .54
#define SIZE 3.
#define STEPS 4
#define SHINESS 3.2

void main() {
  // float r = smoothstep(0.65, 0.85, SmoothNoise2((vUv + vec2(0, time * 2.0)) / 2.0));
  float r = min(SmoothNoise2(vUv * SIZE + time * SLIDE), SmoothNoise2(vUv * SIZE + time * SLIDE * 2.31));
  float d = length(vUv * 2.0 - 1.0) * 1.15 + r * SPREAD;
  float bg = floor((1. - pow(d, SHINESS)) * float(STEPS + 1)) / float(STEPS);//pow(d, 2.5);
  gl_FragColor = vec4(bg, bg, bg, 1.0);
  return;
  float bright = bg;//floor((1.0 - bg) * 4.0) / 3.0;
  float border = line(0.05, 0.67, d);

  float body = S(0.7, 0.65, d);
  
  gl_FragColor = vec4(body * bright, body * bright, body * bright, 1.0);
  // vec4 diffuseColor = texture2D(map, vUv);
  // gl_FragColor = vec4(diffuseColor.xyz * HSLtoRGB(vec3(vScale / 5.0, 1.0,
  // 0.5)),
  //                     diffuseColor.w);

  // if (diffuseColor.w < 0.5)
  //   discard;
}