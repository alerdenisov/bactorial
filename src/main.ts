import THREE = require('three');
import bacteria_body_frag from './shaders/bacteria-body.frag';
import bacteria_dots_frag from './shaders/bacteria-dots.frag';
import bacteria_vert from './shaders/bacteria.vert';

import logotype_frag from './shaders/logotype.frag';
import logotype_vert from './shaders/logotype.vert';

import './cssRenderer';
import {OrthographicCamera} from 'three';

const Stats = require('stats-js');
const stats = new Stats();
stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const REPULSE_FORCE = 50.0;

function animate() {
  stats.begin();

  // monitored code goes here

  stats.end();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

export type Ptr = number;
export type NativeTypes = 'float' | 'i1' | 'i8' | 'i16' | 'i32' | 'i64' | '*';

export interface IGameBackend {
  getValue(ptr: Ptr, type: '*'): number;
  getValue(ptr: Ptr, type: 'float'): number;
  getValue(ptr: Ptr, type: 'i1'): number;
  getValue(ptr: Ptr, type: 'i8'): number;
  getValue(ptr: Ptr, type: 'i16'): number;
  getValue(ptr: Ptr, type: 'i32'): number;
  getValue(ptr: Ptr, type: 'i64'): number;
  getValue<T>(ptr: Ptr, type: NativeTypes): T;
  getValue<T>(ptr: Ptr, type: NativeTypes, safe: boolean): T;
  _BactorialInitWorld(count: number, size: number, distribution: number): Ptr;
  _BactorialUpdateWorld(dt: number): void;
  _BactorialDivide(): void;
  _BactorialUnselect(): void;
  _BactorialSpawnEnemy(distance: number, size: number, vx: number, vy: number): void;
  _BactorialSelect(xmin: number, ymin: number, xmax: number, ymax: number): number;

  calledRun: boolean;
  }

let backend: IGameBackend = (<any>window).Module;
console.assert(typeof backend === 'object', 'Game backend isn\'t loaded');

class Game {
  private container: HTMLElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private geometry: THREE.InstancedBufferGeometry;
  private material: THREE.RawShaderMaterial;
  private material_dots: THREE.RawShaderMaterial;
  private mesh: THREE.Mesh;
  private clock: THREE.Clock;
  private backendAllocation: Ptr;
  seed: Float32Array;
  positions: Float32Array;
  velocities: Float32Array;
  radiuses: Float32Array;
  targets: Float32Array;
  states: Float32Array;
  inited: boolean;
  labels: any[];
  COUNT: number;
  labelRenderer: any;
  boundingBoxMin: THREE.Vector2;
  boundingBoxMax: THREE.Vector2;
  boundingBox: THREE.Box2;
  materialLogotype: THREE.ShaderMaterial;

  gameStarted: boolean = false;

  onClick(event: MouseEvent) {
    event.preventDefault();

    console.log(backend)

    if (!this.gameStarted) {
      setInterval(() => backend._BactorialSpawnEnemy(3, 5 + Math.pow(Math.random(), 2.2) * 10, 1, 1), 5000);
      this.gameStarted = true;
    }

    const x = (event.clientX / this.container.clientWidth) * 2 - 1;
    const y = (event.clientY / this.container.clientHeight) * 2 - 1;

    const wpos = new THREE.Vector3(x, -y, 1).unproject(this.camera);
    const size = 0;
    backend._BactorialSelect(
        wpos.x - size, wpos.y - size, wpos.x + size, wpos.y + size);
    backend._BactorialDivide();
    setTimeout(() => backend._BactorialUnselect(), 570);
  }

  constructor(private SIDE = 10, private DISTANCE = 30) {
    this.COUNT = SIDE * SIDE;
    if (this.init()) {
      this.animate();
    }
  }

  init() {
    this.boundingBoxMin = new THREE.Vector2(-window.innerWidth * .01, -window.innerHeight * .01);
    this.boundingBoxMax = new THREE.Vector2( window.innerWidth * .01,  window.innerHeight * .01);
    this.boundingBox = new THREE.Box2(this.boundingBoxMin, this.boundingBoxMax);

    this.clock = new THREE.Clock(true);
    this.seed = new Float32Array(this.COUNT * 2);
    this.positions = new Float32Array(this.COUNT * 2);
    this.velocities = new Float32Array(this.COUNT * 2);
    this.radiuses = new Float32Array(this.COUNT);
    this.targets = new Float32Array(this.COUNT * 2);
    this.labels = new Array(this.COUNT);
    this.states = new Float32Array(this.COUNT * 4);

    // this.world = this.setupWorld();
    this.renderer = new THREE.WebGLRenderer();

    this.labelRenderer = new (<any>THREE).CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = 0;
    document.body.appendChild(this.labelRenderer.domElement);

    this.renderer.setClearColor(0x1b1c24, 1.0);

    if (this.renderer.extensions.get('ANGLE_instanced_arrays') === null) {
      document.getElementById('notSupported').style.display = '';
      return false;
    }

    const far = 50;
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.OrthographicCamera(-window.innerWidth * .02, window.innerWidth * .02, window.innerHeight * .02, -window.innerHeight * .02, -1, 1);

    // this.camera = new THREE.PerspectiveCamera(
    //   50,
    //   window.innerWidth / window.innerHeight,
    //   1,
    //   far
    // );

    this.camera.position.set(0, 0, 0);
    this.scene = new THREE.Scene();

    const circleGeometry = new THREE.CircleBufferGeometry(1, 8);
    // const center = new THREE.Sprite(new THREE.SpriteMaterial({
    //   map: new THREE.TextureLoader().load("assets/sprites/circle.png")
    // }));
    // center.scale.set(10,10,10);
    // this.scene.add(center);

    const logoGeometry = new THREE.PlaneBufferGeometry(2286, 1339, 1, 1);
    const logoMaterial = this.materialLogotype = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: new
          THREE.TextureLoader().load("assets/sprites/logotype.png")
        },
        time: { value: 0.0 }
      },
      vertexShader: logotype_vert,
      fragmentShader: logotype_frag,
      depthTest: true,
      depthWrite: true
    });

    logoMaterial.transparent = true;
    logoMaterial.blending = THREE.NormalBlending;

    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.scale.set(1, 1, 1).multiplyScalar(0.0175);
    logo.position.set(-10.06, -2.756, 0);
    this.scene.add(logo);

    // const logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
    // logoMesh.position.set(0,0,0);
    // logoMesh.scale.set(.01, .01, .01);
    // this.scene.add(logoMesh);


    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = circleGeometry.index;
    this.geometry.attributes = circleGeometry.attributes;

    this.material = new THREE.RawShaderMaterial({
      uniforms: {
        map: {
          value: new THREE.TextureLoader().load('assets/sprites/colormap.png')
        },
        time: {value: 0.0}
      },
      vertexShader: bacteria_vert,
      fragmentShader: bacteria_body_frag,
      depthTest: true,
      depthWrite: true
    });
    // this.material.blending = THREE.AdditiveBlending;
    // this.material_dots.blending = THREE.AdditiveBlending;
    this.material.transparent =true;

    this.geometry.addAttribute(
        'translate', new THREE.InstancedBufferAttribute(this.positions, 2));
    this.geometry.addAttribute(
        'radius', new THREE.InstancedBufferAttribute(this.radiuses, 1));
    this.geometry.addAttribute(
        'seed', new THREE.InstancedBufferAttribute(this.seed, 2));
    this.geometry.addAttribute(
        'velocity', new THREE.InstancedBufferAttribute(this.velocities, 2));
    this.geometry.addAttribute(
        'state', new THREE.InstancedBufferAttribute(this.states, 4));

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.scale.set(1, 1, 1);
    this.scene.add(this.mesh);

    // this.mesh = new THREE.Mesh(this.geometry, this.material_dots);
    // this.mesh.scale.set(1, 1, 1);
    // this.scene.add(this.mesh);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    window.addEventListener('mousedown', this.onClick.bind(this));

    const side = this.SIDE;
    for (let x = 0; x < side; x++) {
      for (let y = 0; y < side; y++) {
        const index = y * side + x;
        // if (index === 0) {
        //   this.positions[index * 2 + 0] = 0;
        //   this.positions[index * 2 + 1] = 0;
        //   this.states[index * 4 + 0] = 1.0;
        //   this.states[index * 4 + 1] = 0.0;
        //   this.states[index * 4 + 2] = 0.0;
        //   this.states[index * 4 + 3] = 0.0;
        //   this.radiuses[index] = 2.0;
        //   const v = new THREE.Vector3(Math.random() * 2 - 1,Math.random() * 2 - 1).normalize().multiplyScalar(4.0);
        //   this.velocities[index * 2 + 0] = v.x;
        //   this.velocities[index * 2 + 1] = v.y;
        // } else {
          this.positions[index * 2 + 0] = -1000;
          this.positions[index * 2 + 1] = -1000;  //
          this.radiuses[index] = 0.0;  //  + Math.floor(Math.random() * 5.);
        // }

        this.seed[index * 2 + 0] = Math.random() * 2 - 1;
        this.seed[index * 2 + 1] = Math.random() * 2 - 1;

        // var labelDiv = document.createElement('div');
        // labelDiv.className = 'label';
        // labelDiv.textContent = 'Earth';
        // // labelDiv.style.marginTop = '-1em';
        // this.labels[index] = new (<any>THREE).CSS2DObject(labelDiv);
        // this.scene.add(this.labels[index]);
      }
    }



    this.backendAllocation = backend._BactorialInitWorld(1, 2.2, 3);
    backend._BactorialUpdateWorld(1);
    this.loadState(0);
    this.inited = true;


    this.boundingBoxMin = new THREE.Vector2(-window.innerWidth * .01, -window.innerHeight * .01);
    this.boundingBoxMax = new THREE.Vector2( window.innerWidth * .01,  window.innerHeight * .01);
    this.boundingBox = new THREE.Box2(this.boundingBoxMin, this.boundingBoxMax);

    return true;
  }

  onWindowResize(event: UIEvent) {
    // this.camera.aspect = window.innerWidth / window.innerHeight;
    // this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const dt = this.clock.getDelta();
    this.update(dt);
    this.render(dt);
  }

  delay: number = 2;

  update(dt: number) {
    // this.updateLabels(dt);
    // this.updatePhysics(dt)
    // this.world.update();
    if (this.gameStarted) {
      this.backendUpdate(dt);
    }
    this.updateCamera(dt);
    this.geometry.addAttribute(
        'translate', new THREE.InstancedBufferAttribute(this.positions, 2));
    this.geometry.addAttribute(
        'seed', new THREE.InstancedBufferAttribute(this.seed, 2));
    this.geometry.addAttribute(
        'velocity', new THREE.InstancedBufferAttribute(this.velocities, 2));
    this.geometry.addAttribute(
        'radius', new THREE.InstancedBufferAttribute(this.radiuses, 1));
    this.geometry.addAttribute(
        'state', new THREE.InstancedBufferAttribute(this.states, 4));
  }

  // updateCamera(dt: number) {
  //   const ratio = window.innerWidth / window.innerHeight;
  //   const ortho = (this.camera as OrthographicCamera);

  //   const colonyWidth = this.boundingBoxMax.x - this.boundingBoxMin.x;
  //   const colonyHeight = this.boundingBoxMax.y - this.boundingBoxMin.y;

  //   const size = colonyHeight / ratio > colonyWidth ? colonyHeight : colonyWidth / ratio;
    
  //   ortho.left = this.boundingBox.min.x;
  //   ortho.right = this.boundingBox.max.x;
  //   ortho.bottom = this.boundingBox.min.y;
  //   ortho.top = this.boundingBox.max.y;
  //   ortho.updateProjectionMatrix();

  // }
  updateCamera(dt: number) {
    const ratio = window.innerWidth / window.innerHeight;
    const ortho = (this.camera as OrthographicCamera);

    const maxH = Math.max(Math.abs(this.boundingBox.min.x), Math.abs(this.boundingBox.max.x));
    const maxV = Math.max(Math.abs(this.boundingBox.min.y), Math.abs(this.boundingBox.max.y));
    const diam = Math.max(35., Math.sqrt(maxH * maxH + maxV * maxV) * 1.5);



    ortho.left = THREE.Math.lerp(ortho.left, -diam * ratio, dt * 5.);//this.boundingBox.min.x;
    ortho.right = THREE.Math.lerp(ortho.right, diam * ratio, dt * 5.);//this.boundingBox.max.x;
    ortho.bottom = THREE.Math.lerp(ortho.bottom, -diam, dt * 5.);//this.boundingBox.min.y;
    ortho.top = THREE.Math.lerp(ortho.top, diam, dt * 5.);//this.boundingBox.max.y;
    ortho.updateProjectionMatrix();
    // ortho.updateMatrix();
  }

  updateLabels(dt: number) {
    for (let index = 0; index < this.COUNT; index++) {
      let position = new THREE.Vector2(
          this.positions[index * 2 + 0], this.positions[index * 2 + 1]);
      // this.labels[index].element.innerHTML = `${this.velocities[index * 2 +
      // 0].toFixed(3)}, ${this.velocities[index * 2 +
      // 1].toFixed(3)}`;//.position.set(position.x, position.y, 0);
      this.labels[index].element.innerHTML = (this.states[index * 4 + 2]);
      // this.radiuses[index];//.position.set(position.x, position.y, 0);
      // this.labels[index].element.innerHTML =
      // this.states[index];//.position.set(position.x, position.y, 0);
      this.labels[index].position.set(position.x, position.y + this.radiuses[index] * 0.5, 0);
    }
  }
  updatePhysics(dt: number) {
    for (let index = 0; index < this.COUNT; index++) {
      let position = new THREE.Vector2(
          this.positions[index * 2 + 0], this.positions[index * 2 + 1]);
      let velocity = new THREE.Vector2(
          this.velocities[index * 2 + 0], this.velocities[index * 2 + 1]);

      let radius = this.radiuses[index];

      let target = new THREE.Vector2(
          this.targets[index * 2 + 0], this.targets[index * 2 + 1]);

      // let force = new THREE.Vector2(0, 0);

      let dif = target.clone().sub(position);
      let force = dif.clone().normalize().multiplyScalar(3000);

      if (dif.lengthSq() < 25) {
        this.targets[index * 2 + 0] =
            (Math.random() * 2 - 1) * window.innerWidth * 0.3;
        this.targets[index * 2 + 1] =
            (Math.random() * 2 - 1) * window.innerHeight * 0.3;
        }

      for (let other = 0; other < this.COUNT; other++) {
        if (other === index) {
          continue;
          }

        let otherR = this.radiuses[other];

        let p2 = new THREE.Vector2(
            this.positions[other * 2 + 0], this.positions[other * 2 + 1]);

        let d = p2.clone().sub(position);
        let l = Math.max(0.001, d.length() - (radius + otherR) * 50);

        if (l < 550) {
          force.add(
              d.normalize().negate().divideScalar(l));  // Math.pow(l, 1.2)));
        }

        //   // let difference = p2.clone().sub(position);
        //   // let distance = difference.length();

        //   // let sign =
        //   //     new THREE.Vector2(Math.sign(difference.x),
        //   //     Math.sign(difference.y));
        //   // let theta = Math.atan2(difference.y, difference.x);

        //   // if (difference.x == 0) {
        //   //   theta = Math.PI / 2;
        //   //   sign.x = 0;
        //   // }

        //   // let f = REPULSE_FORCE * 250.0 / (distance * distance);

        //   // if (distance < 250.0) {
        //   //   force.add(difference.clone().negate().multiplyScalar(f));
        //   // }
      }

      // let attr = new THREE.Vector2(0, 0).sub(position);
      // let distAttr = attr.length();
      // force.add(attr.normalize()
      //               .multiplyScalar(distAttr * distAttr)
      //               .multiplyScalar(.1));
      // velocity.add(new THREE.Vector2(Math.random() * 2.0 - 1.0, Math.random()
      // * 2.0 - 1.0)
      // .normalize()
      // .multiplyScalar(Math.random() * 10.0));

      velocity.add(force.multiplyScalar(dt));
      // velocity.rotateAround(new THREE.Vector2(0, 0), Math.random() * Math.PI
      // * 0.05);

      position.add(velocity.multiplyScalar(dt));

      this.velocities[index * 2 + 0] = velocity.x;
      this.velocities[index * 2 + 1] = velocity.y;
      this.positions[index * 2 + 0] = position.x;
      this.positions[index * 2 + 1] = position.y;
    }
  }

  backendUpdate(dt: number) {
    // this.delay -= dt;
    // if (this.delay < 0) {
    //   this.delay = 1.0;
    //   let x = (Math.random() * 2.0 - 1.0) * 300.0 * 0.5;
    //   let y = (Math.random() * 2.0 - 1.0) * 300.0 * 0.5;
    //   console.log('divide')
    //   backend._BactorialSelect(x-100,y-100,x+100,y+100);
    //   backend._BactorialDivide();
    // }
    if(dt > 0.2) {
      return;
    }

    if (backend.calledRun && this.inited) {
      backend._BactorialUpdateWorld(dt * 2);
    }

    this.loadState(dt);
  }

  loadState(dt: number) {
    let ptr = this.backendAllocation;
    let objectCount = backend.getValue(ptr, 'i32');
    ptr += 4;

    let positionsPtr = backend.getValue(ptr, '*');
    ptr += 4;
    let velocitiesPtr = backend.getValue(ptr, '*');
    ptr += 4;
    let radiusesPtr = backend.getValue(ptr, '*');
    ptr += 4;
    let statesPtr = backend.getValue(ptr, '*');
    ptr += 4;
    let seedsPtr = backend.getValue(ptr, '*');
    ptr += 4;

    this.boundingBoxMin
        .set(
            backend.getValue(ptr + 4 * 0, 'float'),
            backend.getValue(ptr + 4 * 1, 'float'));
    this.boundingBoxMax
        .set(
            backend.getValue(ptr + 4 * 2, 'float'),
            backend.getValue(ptr + 4 * 3, 'float'));
    this.boundingBox
        .set(this.boundingBoxMin, this.boundingBoxMax);
    ptr += 4 * 4;

    let index = 0;

    while (index < objectCount && index < this.COUNT) {
      this.positions[index * 2 + 0] = backend.getValue(positionsPtr, 'float');
      positionsPtr += 4;
      this.positions[index * 2 + 1] = backend.getValue(positionsPtr, 'float');
      positionsPtr += 4;

      let vx = backend.getValue(velocitiesPtr, 'float');
      velocitiesPtr += 4;
      let vy = backend.getValue(velocitiesPtr, 'float');
      velocitiesPtr += 4;

      this.velocities[index * 2 + 0] =
          THREE.Math.lerp(this.velocities[index * 2 + 0], vx, 0.05);
      this.velocities[index * 2 + 1] =
          THREE.Math.lerp(this.velocities[index * 2 + 1], vy, 0.05);

      this.radiuses[index] = backend.getValue(radiusesPtr, 'float');
      radiusesPtr += 4;

      const raw = backend.getValue(statesPtr, 'i8') & 0xff;

      // enemy flag
      this.states[index * 4 + 0] = (raw >> 7) & 0x1;
      // selected flag
      this.states[index * 4 + 1] = (raw >> 6) & 0x1;
      // state enum
      const nextstate = (raw & 0x31);

      // update time when change state
      if (this.states[index * 4 + 2] !== nextstate) {
        this.states[index * 4 + 3] = this.clock.getElapsedTime();
      }

      this.states[index * 4 + 2] = nextstate;

      statesPtr += 1;

      this.seed[index * 2 + 0] = backend.getValue(seedsPtr, 'float');
      seedsPtr += 4;
      this.seed[index * 2 + 1] = backend.getValue(seedsPtr, 'float');
      seedsPtr += 4;

      index++;
    }
  }

  render(dt: number) {
    var time = this.clock.getElapsedTime();
    this.material.uniforms['time'].value = time;
    this.materialLogotype.uniforms['time'].value = time;
    this.renderer.render(this.scene, this.camera);
    // this.labelRenderer.render(this.scene, this.camera);
  }
}

new Game();
