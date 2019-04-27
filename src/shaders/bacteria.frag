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

void main() {
  float r = smoothstep(0.65, 0.85, SmoothNoise2((vUv + vec2(0, time * 2.0)) / 2.0));
  // float r = SmoothNoise2(vUv / 2.0);
  gl_FragColor = vec4(r, r, r, 1.0);
  // vec4 diffuseColor = texture2D(map, vUv);
  // gl_FragColor = vec4(diffuseColor.xyz * HSLtoRGB(vec3(vScale / 5.0, 1.0,
  // 0.5)),
  //                     diffuseColor.w);

  // if (diffuseColor.w < 0.5)
  //   discard;
}