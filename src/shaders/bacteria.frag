precision highp float;

uniform sampler2D map;
varying vec2 vUv;
varying float vScale;

float N21(vec2 p) {
  return fract(sin(p.x * 100.0 + p.y * 6574.0) * 5324.0);
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
  vec2 g = floor(vUv * 3.0);
  float r = N21(g);
  gl_FragColor = vec4(r,r,r, 1.0);
  // vec4 diffuseColor = texture2D(map, vUv);
  // gl_FragColor = vec4(diffuseColor.xyz * HSLtoRGB(vec3(vScale / 5.0, 1.0, 0.5)),
  //                     diffuseColor.w);

  // if (diffuseColor.w < 0.5)
  //   discard;
}