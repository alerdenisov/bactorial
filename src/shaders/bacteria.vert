
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

attribute vec3 position;
attribute vec2 uv;
attribute vec2 translate;
attribute vec2 velocity;
attribute vec2 seed;
attribute float radius;

varying vec2 vUv;
varying float vScale;
varying vec2 vIndex;
varying vec2 vVelocity;

void main() {

  vec4 mvPosition = modelViewMatrix * vec4(translate.xy, 0.0, 1.0);
//   vec3 trTime =
    //   vec3(translate.x + time, translate.y + time, 0.0 + time);
//   float scale = sin(trTime.x * 2.1) + sin(trTime.y * 3.2) + sin(trTime.z * 4.3);
//   vScale = scale;
//   scale = scale * 10.0 + 10.0;
  vec2 vel = velocity / 20000.0;
  float speed = max(0.0001, length(vel));

  // float coef = min(2.0, max(0.0, pow(-dot(normalize(velocity), normalize(position.xy)), 5.))) * speed;

  // mvPosition.xyz += position * (40. + 80. * coef);// * 1.0;
  mvPosition.xyz += position * radius;// + 80. * coef);// * 1.0;
  vUv = uv;

  vIndex = seed;
  vVelocity = velocity;
  gl_Position = projectionMatrix * mvPosition;
}