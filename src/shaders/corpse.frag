precision highp float;

uniform sampler2D map;
uniform float time;

// varying vec2 vUv;
// varying vec2 vIndex;
// varying vec2 vVelocity;
varying vec4 vParams1;
varying vec4 vParams2;
varying vec4 vParams3;

#define S(a, b, c) smoothstep(a, b, c)
#define saturate(a) clamp(a, 0.0, 1.0)
#define SLIDE_MIN .4
#define SLIDE_MAX 2.
#define SPREAD_MIN .045
#define SPREAD_MAX .15
#define SIZE 8.
#define STEPS 2
#define NOISE_SIZE 8.
#define SHINESS 3.

#define PI 3.14159265359

#define ADD(a,b) min(a,b)
// #define ADD(a,b,c) ADD(c, ADD(a,b))
// #define ADD(a,b,c,d) ADD(d,ADD(a,b,c))
// #define ADD(a,b,c,d,e) ADD(e,ADD(a,b,c,d))
#define SUB(a,b) max(-a,b)
// #define SUB(a,b,c) max(-c, SUB(a,b))
// #define SUB(a,b,c,d) max(d, SUB(a,b,c))
// #define SUB(a,b,c,d,e) max(e, SUB(a,b,c,e))

// float N21(vec2 p) { return fract(sin(p.x * 100. + p.y * 6574.) * 5647.); }

vec2 hash(vec2 x) // replace this by something better
{
  // return x;
  const vec2 k = vec2(0.3183099, 0.3678794);
  x = x * k + k.yx;
  return -1.0 + 2.0 * fract(16.0 * k * fract(x.x * x.y * (x.x + x.y)));
}

float noise(vec2 p) {
  p += vParams1.zw;
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

vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
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

float box(vec2 p, vec2 b)
{
    vec2 d = abs(p)-b;
    return length(max(d,vec2(0.0))) + min(max(d.x,d.y),0.0);
}

// void main() {
//   gl_FragColor = vec4(1.,0.,0.,1.);
// }

void main() {
  vec2 vUv = vParams1.xy;
  vec2 vSeed = vParams1.zw;

  float r = noise(vUv * SIZE + time);


  float bg = 0.;
  vec2 p = vUv * 2.0 - 1.0;

  // ██████╗  ██████╗ ██████╗ ██╗   ██╗
  // ██╔══██╗██╔═══██╗██╔══██╗╚██╗ ██╔╝
  // ██████╔╝██║   ██║██║  ██║ ╚████╔╝ 
  // ██╔══██╗██║   ██║██║  ██║  ╚██╔╝  
  // ██████╔╝╚██████╔╝██████╔╝   ██║   
  // ╚═════╝  ╚═════╝ ╚═════╝    ╚═╝   

  #define SIZE_BODY 0.35         
  #define EYE_SPREAD 0.15
  #define EYE_SIZE 0.05
  #define EYE_VELOCITY_COEF 0.25
  #define SHAKE_POWER 0.075

  float s1 = sphere(p, SIZE_BODY);
  float s2 = sphere(p + vec2(0.001, 0.001) * 0.7, 0.04);
  bg = smoothDistance(s1, s2, .65);

  bg += r * 0.05;
  bg = S(0.15, -0.25, bg);

  float mask = S(0.15, 0.25, bg);

  bg = pow(bg, SHINESS);
  bg *= float(STEPS + 1);
  bg = floor(bg);
  bg /= float(STEPS); // pow(d, 2.5);

  vec3 deadDark = vec3(.078, 0.082, .113);
  vec3 deadLight = vec3(.0, .0, .009);

  vec3 deadColor = mix(deadDark, deadLight, bg);
  vec3 col = deadColor;

  // gl_FragColor = vec4(col, 1.0);
  // return;

  float eye1b1 = box(rotate(p - vec2(EYE_SPREAD, 0.0), PI * 0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
  float eye1b2 = box(rotate(p - vec2(EYE_SPREAD, 0.0), PI * -0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
  float eye2b1 = box(rotate(p + vec2(EYE_SPREAD, 0.0), PI * 0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
  float eye2b2 = box(rotate(p + vec2(EYE_SPREAD, 0.0), PI * -0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
  
  float eye1 = ADD(eye1b1, eye1b2) + r * SHAKE_POWER * 0.3;
  float eye2 = ADD(eye2b1, eye2b2) + r * SHAKE_POWER * 0.3;

  float face = S(0.01, 0.0, ADD(eye1, eye2));

  mask *= 1.0 - col.x;
  col.x += face;
  col.y += face;
  col.z += face;


  gl_FragColor = vec4(col, mask);
}