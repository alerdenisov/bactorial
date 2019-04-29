import THREE = require('three');
import bacteria_body_frag from './shaders/bacteria-body.frag';
import bacteria_vert from './shaders/bacteria.vert';

import corpse_frag from './shaders/corpse.frag';
import corpse_vert from './shaders/corpse.vert';

import logotype_frag from './shaders/logotype.frag';
import logotype_vert from './shaders/logotype.vert';

import './cssRenderer';
import {OrthographicCamera} from 'three';

const Stats = require('stats-js');
const stats = new Stats();
stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const CORPSE_COUNT = 8;

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
  _BactorialUpdateWorld(dt: number): void;  //: number): void;
  _BactorialDivide(): void;
  _BactorialUnselect(): void;
  _BactorialSpawnEnemy(distance: number, size: number, vx: number, vy: number):
      void;
  _BactorialSelect(xmin: number, ymin: number, xmax: number, ymax: number):
      number;

  calledRun: boolean;
  }

let backend: IGameBackend = (<any>window).Module;
console.assert(typeof backend === 'object', 'Game backend isn\'t loaded');

class Game {
  private container: HTMLElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private material: THREE.RawShaderMaterial;
  private geometry: THREE.InstancedBufferGeometry;
  private mesh: THREE.Mesh;
  private clock: THREE.Clock;
  private backendAllocation: Ptr;
  seed: Float32Array;
  positions: Float32Array;
  velocities: Float32Array;
  radiuses: Float32Array;
  states: Float32Array;
  inited: boolean;
  labels: any[];
  COUNT: number;
  labelRenderer: any;
  boundingBoxMin: THREE.Vector2;
  boundingBoxMax: THREE.Vector2;
  boundingBox: THREE.Box2;
  materialLogotype: THREE.ShaderMaterial;


  corpseCount: number = 0;

  corpse_seed: Float32Array = new Float32Array(CORPSE_COUNT * 2);
  corpse_positions: Float32Array = new Float32Array(CORPSE_COUNT * 2);
  corpse_velocities: Float32Array = new Float32Array(CORPSE_COUNT * 2);
  corpse_radiuses: Float32Array = new Float32Array(CORPSE_COUNT * 1);
  corpse_states: Float32Array = new Float32Array(CORPSE_COUNT * 4);

  corpseGeometry: THREE.InstancedBufferGeometry;
  corpseMesh: THREE.Mesh;
  corpseMaterial: THREE.RawShaderMaterial;

  gameStarted: boolean = false;
  objectCount: number;

  spawnEnemy() {
    backend._BactorialSpawnEnemy(
        300, 30 + Math.pow(Math.random(), 2.2) * 60, 1, 1);
    setTimeout(
        this.spawnEnemy.bind(this),
        1000 + Math.max(0, 5000 - this.clock.getElapsedTime() * 100));
  }

  onClick(event: MouseEvent) {

    const listener = new THREE.AudioListener();
    this.camera.add(listener);

    // create a global audio source
    const sound = new THREE.Audio(listener);

    // load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('assets/sounds/music.mp3', function(buffer: THREE.AudioBuffer) {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.5);
      sound.play();
    }, null, null);
    
    event.preventDefault();

    const x = (event.clientX / this.container.clientWidth) * 2 - 1;
    const y = (event.clientY / this.container.clientHeight) * 2 - 1;

    const wpos = new THREE.Vector3(x, -y, 1).unproject(this.camera);
    const size = 0;
    const selected = backend._BactorialSelect(
        wpos.x - size, wpos.y - size, wpos.x + size, wpos.y + size);

    if (selected > 0) {
      if (!this.gameStarted) {
        setTimeout(this.spawnEnemy.bind(this), 1000);
        this.gameStarted = true;
      }


      backend._BactorialDivide();
      setTimeout(() => backend._BactorialUnselect(), 570);
    }
  }

  constructor(private SIDE = 10, private DISTANCE = 30) {
    this.COUNT = SIDE * SIDE;
    if (this.init()) {
      this.animate();
    }
  }

  init() {
    this.boundingBoxMin = new THREE.Vector2(
        -window.innerWidth * 0.01, -window.innerHeight * 0.01);
    this.boundingBoxMax =
        new THREE.Vector2(window.innerWidth * 0.01, window.innerHeight * 0.01);
    this.boundingBox = new THREE.Box2(this.boundingBoxMin, this.boundingBoxMax);

    this.clock = new THREE.Clock(true);
    this.seed = new Float32Array(this.COUNT * 2);
    this.positions = new Float32Array(this.COUNT * 2);
    this.velocities = new Float32Array(this.COUNT * 2);
    this.radiuses = new Float32Array(this.COUNT);
    this.states = new Float32Array(this.COUNT * 4);
    this.labels = new Array(this.COUNT);


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
    this.camera = new THREE.OrthographicCamera(
        -window.innerWidth * 0.02, window.innerWidth * 0.02,
        window.innerHeight * 0.02, -window.innerHeight * 0.02, -1, 1);

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
    const logoMaterial = (this.materialLogotype = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: new THREE.TextureLoader().load('assets/sprites/logotype.png')
        },
        time: {value: 0.0}
      },
      vertexShader: logotype_vert,
      fragmentShader: logotype_frag,
      depthTest: true,
      depthWrite: true
    }));

    logoMaterial.transparent = true;
    logoMaterial.blending = THREE.NormalBlending;

    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.scale.set(1, 1, 1).multiplyScalar(0.175);
    logo.position.set(-100.6, -50.56, 0);
    this.scene.add(logo);

    // const logoMesh = new THREE.Mesh(logoGeometry, logoMaterial);
    // logoMesh.position.set(0,0,0);
    // logoMesh.scale.set(.01, .01, .01);
    // this.scene.add(logoMesh);

    this.corpseGeometry = new THREE.InstancedBufferGeometry();
    this.corpseGeometry.index = circleGeometry.index;
    this.corpseGeometry.attributes = circleGeometry.attributes;

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
    this.corpseMaterial = new THREE.RawShaderMaterial({
      uniforms: {
        map: {
          value: new THREE.TextureLoader().load('assets/sprites/colormap.png')
        },
        time: {value: 0.0}
      },
      vertexShader: corpse_vert,
      fragmentShader: corpse_frag,
      depthTest: true,
      depthWrite: true
    });
    // this.material.blending = THREE.AdditiveBlending;
    // this.material_dots.blending = THREE.AdditiveBlending;
    this.material.transparent = true;
    this.corpseMaterial.transparent = true;

    this.corpseMesh = new THREE.Mesh(this.corpseGeometry, this.corpseMaterial);
    this.corpseMesh.scale.set(1, 1, 1);
    this.scene.add(this.corpseMesh);

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

        this.positions[index * 2 + 0] = -1000;
        this.positions[index * 2 + 1] = -1000;  //
        this.radiuses[index] = 0.0;
        this.seed[index * 2 + 0] = Math.random() * 2 - 1;
        this.seed[index * 2 + 1] = Math.random() * 2 - 1;

        // const labelDiv = document.createElement('div');
        // labelDiv.className = 'label';
        // labelDiv.textContent = 'Earth';
        // // labelDiv.style.marginTop = '-1em';
        // this.labels[index] = new (<any>THREE).CSS2DObject(labelDiv);
        // this.scene.add(this.labels[index]);
      }
      }

    for (let index = 0; index < CORPSE_COUNT; index++) {
      this.corpse_positions[index * 2 + 0] = 0;
      this.corpse_positions[index * 2 + 1] = 0;  //
      this.corpse_radiuses[index] = 2.0;
      this.corpse_seed[index * 2 + 0] = Math.random() * 2 - 1;
      this.corpse_seed[index * 2 + 1] = Math.random() * 2 - 1;
    }

    this.backendAllocation = backend._BactorialInitWorld(1, 20, 0);
    backend._BactorialUpdateWorld(1);  //;
    this.loadState(0);
    this.inited = true;

    const r = window.innerWidth / window.innerHeight;

    this.boundingBoxMin = new THREE.Vector2(-100 * r, -100);
    this.boundingBoxMax = new THREE.Vector2(100 * r, 100);
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
    this.updateGeometry();
    if (this.gameStarted) {
      this.backendUpdate(dt);
    }
    this.updateCamera(dt);
  }

  updateGeometry() {
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

    this.corpseGeometry.addAttribute(
        'corpse_translate',
        new THREE.InstancedBufferAttribute(this.corpse_positions, 2));
    this.corpseGeometry.addAttribute(
        'corpse_seed', new THREE.InstancedBufferAttribute(this.corpse_seed, 2));
    this.corpseGeometry.addAttribute(
        'corpse_velocity',
        new THREE.InstancedBufferAttribute(this.corpse_velocities, 2));
    this.corpseGeometry.addAttribute(
        'corpse_radius',
        new THREE.InstancedBufferAttribute(this.corpse_radiuses, 1));
    this.corpseGeometry.addAttribute(
        'corpse_state',
        new THREE.InstancedBufferAttribute(this.corpse_states, 4));

    // if (this.corpseCount > 0) {
    //   this.corpseGeometry.addAttribute(
    //     "translate",
    //     new THREE.InstancedBufferAttribute(this.corpsePositions, 2)
    //   );
    //   this.corpseGeometry.addAttribute(
    //     "seed",
    //     new THREE.InstancedBufferAttribute(this.seed.slice(0,
    //     this.corpseCount * 2), 2)
    //   );
    //   this.corpseGeometry.addAttribute(
    //     "velocity",
    //     new THREE.InstancedBufferAttribute(this.velocities.slice(0,
    //     this.corpseCount * 2), 2)
    //   );
    //   this.corpseGeometry.addAttribute(
    //     "radius",
    //     new THREE.InstancedBufferAttribute(this.corpseRadiuses, 1)
    //   );
    //   this.corpseGeometry.addAttribute(
    //     "state",
    //     new THREE.InstancedBufferAttribute(this.states.slice(0,
    //     this.corpseCount * 4), 4)
    //   );
    // }
  }

  updateCamera(dt: number) {
    /*

    w 10
    h 5
    r 2

    10 x 3

    5 x 3

    5 10


    */


    const ratio = window.innerWidth / window.innerHeight;
    const ortho = (this.camera as OrthographicCamera);

    const colonyWidth = Math.abs(this.boundingBoxMax.x - this.boundingBoxMin.x);
    const colonyHeight =
        Math.abs(this.boundingBoxMax.y - this.boundingBoxMin.y);

    let size =
        colonyHeight / ratio > colonyWidth ? colonyHeight : colonyWidth / ratio;
    size *= 2.5;
    size = Math.max(100, size);

    const centerX = this.boundingBox.min.x * .5 + this.boundingBox.max.x * .5;
    const centerY = this.boundingBox.min.y * .5 + this.boundingBox.max.y * .5;
    ortho.position.set(centerX, centerY, 0);

    ortho.left = THREE.Math.lerp(ortho.left, -size * ratio, dt * 3.0);
    ortho.right = THREE.Math.lerp(ortho.right, size * ratio, dt * 3.0);
    ortho.bottom = THREE.Math.lerp(ortho.bottom, -size, dt * 3.0);
    ortho.top = THREE.Math.lerp(ortho.top, size, dt * 3.0);

    ortho.updateProjectionMatrix();
  }
  updateCamera_centered(dt: number) {
    const ratio = window.innerWidth / window.innerHeight;
    const ortho = this.camera as OrthographicCamera;

    // // ortho.left = this.boundingBox.min.x;
    // // ortho.right = this.boundingBox.max.x;
    // // ortho.bottom = this.boundingBox.min.y;
    // // ortho.top = this.boundingBox.max.y;

    // // if (false) {
    //   const width = Math.max(
    //     0,
    //     Math.abs(this.boundingBox.max.x - this.boundingBox.min.x)
    //   );
    //   const height = Math.max(
    //     0,
    //     Math.abs(this.boundingBox.max.y - this.boundingBox.min.y)
    //   );

    //   const centerX =
    //     this.boundingBox.max.x * 0.5 + this.boundingBox.min.x * 0.5;
    //   const centerY =
    //     this.boundingBox.max.y * 0.5 + this.boundingBox.min.y * 0.5;
    //   const size = Math.max(width / ratio, height);

    //   const xmin = centerX - size * 0.5; // this.boundingBox.min.x - width *
    //   0.5;
    //   const xmax = centerX + size * 0.5; // this.boundingBox.max.x + width *
    //   0.5;

    //   const ymin = centerY - size * 0.5; // this.boundingBox.min.y - height *
    //   0.5;
    //   const ymax = centerY + size * 0.5; // this.boundingBox.max.y + height *
    //   0.5;

    //   ortho.left = THREE.Math.lerp(ortho.left, xmin * ratio, 0.5); //
    //   this.boundingBox.min.x;
    //   ortho.right = THREE.Math.lerp(ortho.right, xmax * ratio, 0.5); //
    //   this.boundingBox.max.x;

    //   ortho.bottom = THREE.Math.lerp(ortho.bottom, ymin, 0.5); //
    //   this.boundingBox.min.y;
    //   ortho.top = THREE.Math.lerp(ortho.top, ymax, 0.5); //
    //   this.boundingBox.max.y;

    //   ortho.position.set(centerX, centerY, 0);
    // // }

    const maxH = Math.max(
        Math.abs(this.boundingBox.min.x), Math.abs(this.boundingBox.max.x));
    const maxV = Math.max(
        Math.abs(this.boundingBox.min.y), Math.abs(this.boundingBox.max.y));
    const diam = Math.max(35., Math.sqrt(maxH * maxH + maxV * maxV) * 1.1);

    ortho.left = THREE.Math.lerp(ortho.left, -diam * ratio, dt * 5.);
    ortho.right = THREE.Math.lerp(ortho.right, diam * ratio, dt * 5.);
    ortho.bottom = THREE.Math.lerp(ortho.bottom, -diam, dt * 5.);
    ortho.top = THREE.Math.lerp(ortho.top, diam, dt * 5.);
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
      this.labels[index].element.innerHTML = this.states[index * 4 + 2];
      // this.radiuses[index];//.position.set(position.x, position.y, 0);
      // this.labels[index].element.innerHTML =
      // this.states[index];//.position.set(position.x, position.y, 0);
      this.labels[index].position.set(
          position.x, position.y + this.radiuses[index] * 0.5, 0);
    }
  }

  backendUpdate(dt: number) {
    if (dt > 0.2) {
      return;
      }

    if (backend.calledRun && this.inited) {
      backend._BactorialUpdateWorld(dt);  // * 1.3);
    }

    this.loadState(dt);
  }

  loadState(dt: number) {
    let ptr = this.backendAllocation;
    let previousObjectCount = this.objectCount;
    this.objectCount = backend.getValue(ptr, 'i32');
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

    this.boundingBoxMin.set(
        backend.getValue(ptr + 4 * 0, 'float'),
        backend.getValue(ptr + 4 * 1, 'float'));
    this.boundingBoxMax.set(
        backend.getValue(ptr + 4 * 2, 'float'),
        backend.getValue(ptr + 4 * 3, 'float'));
    this.boundingBox.set(this.boundingBoxMin, this.boundingBoxMax);
    ptr += 4 * 4;

    let index = 0;

    while (index < this.objectCount && index < this.COUNT) {
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
      const nextstate = raw & 31;

      // update time when change state
      if (this.states[index * 4 + 2] !== nextstate) {
        if (nextstate === 3 && this.states[index * 4 + 0] > 0) {
          const ci = this.corpseCount % CORPSE_COUNT;
          this.corpse_positions[ci * 2 + 0] = this.positions[index * 2 + 0];
          this.corpse_positions[ci * 2 + 1] = this.positions[index * 2 + 1];
          this.corpse_radiuses[ci] = this.radiuses[index];

          this.corpse_states[ci * 4 + 0] = 1;
          this.corpse_states[ci * 4 + 1] = 0;
          this.corpse_states[ci * 4 + 2] = 0;
          this.corpse_states[ci * 4 + 3] = this.clock.getElapsedTime();

          this.corpse_velocities[ci * 2 + 0] = 0;
          this.corpse_velocities[ci * 2 + 1] = 0;

          this.corpse_seed[ci * 2 + 0] = this.seed[index * 2 + 0];
          this.corpse_seed[ci * 2 + 1] = this.seed[index * 2 + 1];

          this.corpseCount++;
        }

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


    // index = 0;
    // while (index < objectCount && index < this.COUNT) {
    //   const state = this.states[index * 4 + 2];
    //   const ally = this.states[index * 4 + 0];
    //   if (state === 3 || ally === 0) {
    //      continue;
    //    }
    //   const x = this.positions[index * 2 + 0];
    //   const y = this.positions[index * 2 + 1];
    //   const r = this.radiuses[index];

    //   if (x - r < this.boundingBoxMin.x) {
    //     this.boundingBoxMin.setX(x - r);
    //   }
    //   if (y - r < this.boundingBoxMin.y) {
    //     this.boundingBoxMin.setY(y - r);
    //   }
    //   if (x + r > this.boundingBoxMax.y) {
    //     this.boundingBoxMin.setX(x + r);
    //   }
    //   if (y + r > this.boundingBoxMax.y) {
    //     this.boundingBoxMin.setY(y + r);
    //   }
    //   index++;
    // }

    // this.boundingBox.set(this.boundingBoxMin, this.boundingBoxMax);

    if (this.objectCount < previousObjectCount) {
      this.positions[this.objectCount * 2 + 0] = -10000;
      this.positions[this.objectCount * 2 + 1] = -10000;
    }
  }

  render(dt: number) {
    var time = this.clock.getElapsedTime();
    this.material.uniforms['time'].value = time;
    this.corpseMaterial.uniforms['time'].value = time;
    this.materialLogotype.uniforms['time'].value = time;
    this.renderer.render(this.scene, this.camera);
    // this.labelRenderer.render(this.scene, this.camera);
  }
}

new Game();
