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
  float vState = vParams3.x;
  vec2 vUv = vParams1.xy;
  vec2 vSeed = vParams1.zw;
  vec2 vel = vParams2.xy / 15.0;
  // float vEnemy = 1.0;//
  float vEnemy = 1.0 - vParams2.z;
  float vSelected = vParams2.w;
  float vIdle = abs(vState - 0.0) < 0.01 ? 1.0 : 0.0;
  float vDivide = abs(vState - 1.0) < 0.01 ? 1.0 : 0.0;
  float vAttack = abs(vState - 2.0) < 0.01 ? 1.0 : 0.0;
  float vDead = abs(vState - 3.0) < 0.01 ? 1.0 : 0.0;

  if (vDead > 0.0) {
    discard;
  }
    
  //   gl_FragColor = vec4(1., 0., 0., 1.);
  //   return;
  // if(vDivide > 0.0) {
  //   gl_FragColor = vec4(1.0, vState, 0., 1.);
  //   return;
  // } 
  

  float speed = max(0.0001, length(vel));
  vec2 dir = vel / speed;
  float s01 = saturate(speed);
  float spread = mix(SPREAD_MIN, SPREAD_MAX, s01);
  float slide = mix(SLIDE_MIN, SLIDE_MAX, s01);
  // gl_FragColor = vec4(speed, speed, speed, 1.);
  // return;
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



  float r = noise(vUv * SIZE + time * dir * slide) * (1.0 - vDead);// + vIndex.x * SIZE + time * SLIDE);
  // float d = saturate(length(vUv * 2.0 - 1.0) * 1.85);
  // bg = length(vUv * 2.0 - 1.0);
  // bg = min(bg, length(vUv * 2.0 - 1.0 + vec2(1.0, 1.0) * fract(time)));
  // bg = sin(length(vUv * 2.0 - 1.0 + (vec2(1.0, 1.0) * (fract(time) * 2.0 -
  // 1.0))));

  float bg = 0.;
  vec2 p = vUv * 2.0 - 1.0;
  vec2 v = vel;//normalize(vec2(1.0, 1.0)) * sin(time * PI);
  float vp = length(v);
  // bg = bg;// * abs(dot(p, v));


  // ██████╗  ██████╗ ██████╗ ██╗   ██╗
  // ██╔══██╗██╔═══██╗██╔══██╗╚██╗ ██╔╝
  // ██████╔╝██║   ██║██║  ██║ ╚████╔╝ 
  // ██╔══██╗██║   ██║██║  ██║  ╚██╔╝  
  // ██████╔╝╚██████╔╝██████╔╝   ██║   
  // ╚═════╝  ╚═════╝ ╚═════╝    ╚═╝   

  #define SIZE_BODY 0.35
  float elapsed = (time - vParams3.y);
  float dt = fract(elapsed);
  float ft = sin(dt * 8.) * (dt * 2.1);
  float divide = vDivide;//abs(1.0 - status) < 0.01 ? 1.0 : 0.0;//vStatus.x);
  float idle = vIdle;//abs(0.0 - status) < 0.01 ? 1.0 : 0.0;
  float divideBodyShake = ft * 0.2 * divide;

  if (abs(vEnemy - 1.0) < 0.001) {
    float box1 = box(rotate(p, PI + time), vec2(.3, .3)) + (r * 2.0 - 1.0) * 0.01;
    float box2 = box(rotate(p, PI * 0.25 + time), vec2(.3, .3)) + (r * 2.0 - 1.0) * 0.01;
    bg = smoothDistance(box1, box2, .1);
  } else {
    float div1 = sphere(p + -vSeed * ft * 0.3, SIZE_BODY * (1. - ft * 0.5));
    float div2 = sphere(p + vSeed * ft * 0.3, SIZE_BODY * (1. - ft * 0.5));
    // float box1 = box(p, vec2(.35, .35));
    // float s1 = smoothDistance(box1, box2, 0.1);//, .1);//sphere(p, SIZE_BODY + divideBodyShake);
    float s1 = sphere(p, SIZE_BODY + divideBodyShake);
    float s2 = sphere(p + v * 0.7, (1. - vp) * SIZE_BODY);

    // bg = mix(smoothDistance(s1, s2, ., smoothDistance(div1, div2, 0.7), vDivide);//, smoothDistance(s1, s2, .65), saturate(ft));
    bg = mix(smoothDistance(s1, s2, .65), smoothDistance(div1, div2, 0.7), vDivide);//, smoothDistance(s1, s2, .65), saturate(ft));
  
  }

  bg += r * mix(1.0, spread, idle) * mix(1.0, ft * divideBodyShake, divide);
  bg = S(0.15, -0.25, bg);

  float mask = S(0.15, 0.25, bg);


  // ███████╗ █████╗  ██████╗███████╗
  // ██╔════╝██╔══██╗██╔════╝██╔════╝
  // █████╗  ███████║██║     █████╗  
  // ██╔══╝  ██╔══██║██║     ██╔══╝  
  // ██║     ██║  ██║╚██████╗███████╗
  // ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝
                                  
  #define EYE_SPREAD 0.15
  #define EYE_SIZE 0.05
  #define EYE_VELOCITY_COEF 0.25
  #define SHAKE_POWER 0.075
  if (abs(vEnemy - 1.0) < 0.001) {

  } else if (vDead <= 0.0) {
    vec2 face_offset = -vel * EYE_VELOCITY_COEF;
    float eye1 = sphere(p - vec2(EYE_SPREAD, 0.0) + face_offset, EYE_SIZE) + r * SHAKE_POWER;
    float eye2 = sphere(p + vec2(EYE_SPREAD, 0.0) + face_offset, EYE_SIZE) + r * SHAKE_POWER;
    // float month = SUB(sphere(p + vec2(0.0, 0.15), 0.2), box(p + vec2(0.0, 0.15) - vel * EYE_VELOCITY_COEF, vec2(0.08, 0.02))) + r * SHAKE_POWER;
    float month_shape = sphere(p + vec2(0.0, 0.1) + face_offset, 0.08 * (1. - s01)) + r * SHAKE_POWER;//, box(p + vec2(0.0, 0.15) - vel * EYE_VELOCITY_COEF, vec2(0.08, 0.02))) + r * SHAKE_POWER;
    float month_cut = box(p + vec2(0.0, 0.05) + face_offset, vec2(0.2, 0.05));
    float month = SUB(month_cut, month_shape);
    float eyes = 1.0 - S(0.01, 0.0, ADD(month, ADD(eye1, eye2)));
    
    mask *= eyes;
  }


  // return;
  // bg = s2;

  bg = pow(bg, SHINESS);
  bg *= float(STEPS + 1);
  bg = floor(bg);
  bg /= float(STEPS); // pow(d, 2.5);

  // gl_FragColor = vec4(bg * mask, bg * mask, bg * mask, 1.0);

  vec3 enemyDark = vec3(.03, 0.160, .096);
  vec3 enemyLight = vec3(.65, 0.94, .54);

  vec3 deadDark = vec3(.078, 0.082, .113);
  vec3 deadLight = vec3(.0, .0, .009);

  vec3 dark = mix(vec3(1., 0.388, .501), vec3(.988, .917, .929), vSelected);
  vec3 light = mix(vec3(.988, .917, .929), vec3(1., 0.388, .501), vSelected);

  vec3 deadColor = mix(deadDark, deadLight, bg);
  vec3 col = mix(mix(mix(dark, enemyDark, vEnemy), mix(light, enemyLight, vEnemy), bg), deadColor, vDead);


  if (vDead > 0.0) {
    float eye1b1 = box(rotate(p - vec2(EYE_SPREAD, 0.0), PI * 0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
    float eye1b2 = box(rotate(p - vec2(EYE_SPREAD, 0.0), PI * -0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
    float eye2b1 = box(rotate(p + vec2(EYE_SPREAD, 0.0), PI * 0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
    float eye2b2 = box(rotate(p + vec2(EYE_SPREAD, 0.0), PI * -0.25), vec2(EYE_SIZE, EYE_SIZE * 0.25));
    
    float eye1 = ADD(eye1b1, eye1b2) + r * SHAKE_POWER * 0.3;
    float eye2 = ADD(eye2b1, eye2b2) + r * SHAKE_POWER * 0.3;

    float face = S(0.01, 0.0, ADD(eye1, eye2));
    // gl_FragColor = vec4(face,face,face,1.0);
    // return;
    col.x += face;
    col.y += face;
    col.z += face;

    // mask -= face;
  }

  gl_FragColor = vec4(col, mask);
  // vec3 col2 = mix(vec3(0.0), dark, r1);
  // // gl_FragColor = vec4(fract(bg), 0.0, 0.0, 1.0);
  // // gl_FragColor = vec4(mask, mask, mask, 1.0);
  // gl_FragColor = vec4(max(col * mask, col2), 1.0);
  // return;
  // float bright = bg; // floor((1.0 - bg) * 4.0) / 3.0;
  // float border = line(0.05, 0.67, d);

  // float body = S(0.7, 0.65, d);
}