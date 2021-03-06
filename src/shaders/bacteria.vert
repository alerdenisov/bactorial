
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
attribute vec4 state;

varying vec4 vParams1;
varying vec4 vParams2;
varying vec4 vParams3;
// varying float vScale;
// varying vec2 vIndex;
// varying vec2 vVelocity;
// varying float vEnemy;
// varying float vSelected;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(translate.xy, 0.0, 1.0);
//   vec3 trTime =
    //   vec3(translate.x + time, translate.y + time, 0.0 + time);
//   float scale = sin(trTime.x * 2.1) + sin(trTime.y * 3.2) + sin(trTime.z * 4.3);
//   vScale = scale;
//   scale = scale * 10.0 + 10.0;
  // vec2 vel = velocity / 20000.0;
  // float speed = max(0.0001, length(vel));

  // float coef = min(2.0, max(0.0, pow(-dot(normalize(velocity), normalize(position.xy)), 5.))) * speed;

  // mvPosition.xyz += position * (40. + 80. * coef);// * 1.0;
  mvPosition.xyz += position * 2.2 * radius;// + 80. * coef);// * 1.0;

  vParams1 = vec4(uv, seed);
  vParams2 = vec4(velocity, state.x, state.y);
  vParams3 = vec4(state.z, state.w, 0., 0.);
  // vIndex = seed;
  // vVelocity = velocity;

  // vEnemy = state.x;
  // vState = state;

  gl_Position = projectionMatrix * mvPosition;
}