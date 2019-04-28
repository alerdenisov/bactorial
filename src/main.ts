import THREE = require('three');
import bacteria_body_frag from './shaders/bacteria-body.frag';
import bacteria_dots_frag from './shaders/bacteria-dots.frag';
import bacteria_vert from './shaders/bacteria.vert';

const Stats = require('stats-js');
const stats = new Stats();
stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

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
  _BactorialInitWorld(): Ptr;
  _BactorialUpdateWorld(dt: number): void;

  calledRun: boolean;
  }

let backend: IGameBackend = (<any>window).Module;
console.assert(typeof backend === 'object', 'Game backend isn\'t loaded');

class Game {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
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
  inited: boolean;

  COUNT: number;

  constructor(private SIDE = 10, private DISTANCE = 30) {
    this.COUNT = SIDE * SIDE;
    if (this.init()) {
      this.animate();
    }
  }

  init() {
    this.clock = new THREE.Clock(true);

    this.seed = new Float32Array(this.COUNT * 2);
    this.positions = new Float32Array(this.COUNT * 2);
    this.velocities = new Float32Array(this.COUNT * 2);

    const side = this.SIDE;
    for (let x = 0; x < side; x++) {
      for (let y = 0; y < side; y++) {

        const index = y * side + x;
        this.positions[index * 2 + 0] = (x - this.SIDE / 2.0) * this.DISTANCE * 2;
        this.positions[index * 2 + 1] = (y - this.SIDE / 2.0) * this.DISTANCE * 2;

        this.seed[index * 2 + 0] = Math.random() * 2 - 1;
        this.seed[index * 2 + 1] = Math.random() * 2 - 1;
      }
    }
    

    this.renderer = new THREE.WebGLRenderer();

    this.renderer.setClearColor(0x1b1c24, 1.0);

    if (this.renderer.extensions.get('ANGLE_instanced_arrays') === null) {
      document.getElementById('notSupported').style.display = '';
      return false;
    }

    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera(
        50, window.innerWidth / window.innerHeight, 1, 5000);

    this.camera.position.set(0, 0, 1000);

    this.scene = new THREE.Scene();

    const circleGeometry = new THREE.CircleBufferGeometry(1, 8);

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = circleGeometry.index;
    this.geometry.attributes = circleGeometry.attributes;


    this.material = new THREE.RawShaderMaterial({
      uniforms: {
        map: {
          value: new THREE.TextureLoader().load('assets/sprites/circle.png')
        },
        time: {value: 0.0}
      },
      vertexShader: bacteria_vert,
      fragmentShader: bacteria_body_frag,
      depthTest: true,
      depthWrite: true
    });

    this.material_dots = new THREE.RawShaderMaterial({
      uniforms: {
        map: {
          value: new THREE.TextureLoader().load('assets/sprites/circle.png')
        },
        time: {value: 0.0}
      },
      vertexShader: bacteria_vert,
      fragmentShader: bacteria_dots_frag,
      depthTest: true,
      depthWrite: true
    });

    this.material.blending = THREE.AdditiveBlending;
    this.material_dots.blending = THREE.AdditiveBlending;


    this.geometry.addAttribute(
        'translate', new THREE.InstancedBufferAttribute(this.positions, 2));
    this.geometry.addAttribute(
        'seed', new THREE.InstancedBufferAttribute(this.seed, 2));
    this.geometry.addAttribute(
        'velocity', new THREE.InstancedBufferAttribute(this.velocities, 2));

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


    return true;
  }

  onWindowResize(event: UIEvent) {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const dt = this.clock.getDelta();
    this.update(dt);
    this.render(dt);
  }

  update(dt: number) {
    if (backend.calledRun && !this.inited) {
      this.backendAllocation = backend._BactorialInitWorld();
      this.inited = true;
      }

    if (backend.calledRun && this.inited) {
      backend._BactorialUpdateWorld(16 / 100000.0);
    }

    this.loadState();
    this.geometry.addAttribute(
        'translate', new THREE.InstancedBufferAttribute(this.positions, 2));
    this.geometry.addAttribute(
        'seed', new THREE.InstancedBufferAttribute(this.seed, 2));
    this.geometry.addAttribute(
        'velocity', new THREE.InstancedBufferAttribute(this.velocities, 2));
  }

  loadState() {
    let ptr = this.backendAllocation;
    let objectCount = backend.getValue(ptr, 'i32');
    ptr += 4

    let positionsPtr = backend.getValue(ptr, '*');
    ptr += 4
    let velocitiesPtr = backend.getValue(ptr, '*');
    ptr += 4

    let index = 0;

    while (index < objectCount && index < this.COUNT) {
      this.positions[index * 2 + 0] = backend.getValue(positionsPtr, 'float')
      positionsPtr += 4;
      this.positions[index * 2 + 1] = backend.getValue(positionsPtr, 'float')
      positionsPtr += 4;

      this.velocities[index * 2 + 0] = backend.getValue(velocitiesPtr, 'float')
      velocitiesPtr += 4;
      this.velocities[index * 2 + 1] = backend.getValue(velocitiesPtr, 'float')
      velocitiesPtr += 4;

      index++;
    }
  }

  render(dt: number) {
    var time = this.clock.getElapsedTime();  // performance.now() * 0.0005;
    this.material.uniforms['time'].value = time;
    this.material_dots.uniforms['time'].value = time;
    // this.mesh.rotation.x = time * 0.2;
    // this.mesh.rotation.y = time * 0.4;
    this.renderer.render(this.scene, this.camera);
  }
}


new Game();
