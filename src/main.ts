import THREE = require('three');
import {World} from 'hecs';
import {Position, Velocity, Radius, Spliting, Attacking, Target, registerAllComponent as registerAllComponents} from './features/components'

import bacteria_body_frag from './shaders/bacteria-body.frag';
import bacteria_dots_frag from './shaders/bacteria-dots.frag';
import bacteria_vert from './shaders/bacteria.vert';

import './cssRenderer';

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
  _BactorialInitWorld(): Ptr;
  _BactorialUpdateWorld(dt: number): void;
  _BactorialDivide(): void;
  _BactorialSelect(xmin: number, ymin: number, xmax: number, ymax: number):
      void;

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
  private world: World;

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

  
  onClick(event: MouseEvent){ 
    event.preventDefault();

    const x = (event.clientX / this.container.clientWidth) * 2 - 1;
    const y = (event.clientY / this.container.clientHeight) * 2 - 1;

    const wpos = new THREE.Vector3(x, -y, 1).unproject(this.camera);
    const size = 5;
    backend._BactorialSelect(wpos.x - size, wpos.y - size, wpos.x + size, wpos.y + size);
    backend._BactorialDivide();
  }

  constructor(private SIDE = 15, private DISTANCE = 30) {
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
    this.radiuses = new Float32Array(this.COUNT);
    this.targets = new Float32Array(this.COUNT * 2);
    this.labels = new Array(this.COUNT);
    this.states = new Float32Array(this.COUNT * 4);

    // this.world = this.setupWorld();
    this.renderer = new THREE.WebGLRenderer();


    this.labelRenderer = new (<any>THREE).CSS2DRenderer();
    this.labelRenderer.setSize( window.innerWidth, window.innerHeight );
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = 0;
    document.body.appendChild(this.labelRenderer.domElement );

    this.renderer.setClearColor(0x1b1c24, 1.0);

    if (this.renderer.extensions.get('ANGLE_instanced_arrays') === null) {
      document.getElementById('notSupported').style.display = '';
      return false;
    }

    const far = 1500;
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera(
        50, window.innerWidth / window.innerHeight, 1, far);

    this.camera.position.set(0, 0, far);
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
        this.positions[index * 2 + 0] = -1000;
        this.positions[index * 2 + 1] = -1000;//
        // this.positions[index * 2 + 0] = (Math.random() * 2. - 1.) * window.innerWidth;
        // this.positions[index * 2 + 1] = (Math.random() * 2. - 1.) * window.innerHeight;//

        this.seed[index * 2 + 0] = Math.random() * 2 - 1;
        this.seed[index * 2 + 1] = Math.random() * 2 - 1;

        // this.targets[index * 2 + 0] = (Math.random() * 2. - 1.) *
        // window.innerWidth * 0.3;
        // this.targets[index * 2 + 1] = (Math.random() * 2. - 1.) *
        // window.innerHeight * 0.3;
        this.radiuses[index] = 50.0;  //  + Math.floor(Math.random() * 5.);


        var labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        labelDiv.textContent = 'Earth';
        // labelDiv.style.marginTop = '-1em';
        this.labels[index] = new (<any>THREE).CSS2DObject(labelDiv);

        this.scene.add(this.labels[index]);
      }
    }

    return true;
  }

  setupWorld(): World {
    const world = new World();
    registerAllComponents(world);

    return world;
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

  delay: number = 2;

  update(dt: number) {
    this.updateLabels(dt);
    // this.updatePhysics(dt)
    // this.world.update();
    this.backendUpdate(dt);
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

  updateLabels(dt: number) {
    for (let index = 0; index < this.COUNT; index++) {
      let position = new THREE.Vector2(
          this.positions[index * 2 + 0], this.positions[index * 2 + 1]);
      // this.labels[index].element.innerHTML = `${this.velocities[index * 2 + 0].toFixed(3)}, ${this.velocities[index * 2 + 1].toFixed(3)}`;//.position.set(position.x, position.y, 0);
      // this.labels[index].element.innerHTML = this.radiuses[index];//.position.set(position.x, position.y, 0);
      // this.labels[index].element.innerHTML = this.states[index];//.position.set(position.x, position.y, 0);
      // this.labels[index].position.set(position.x, position.y + this.radiuses[index] * 0.5, 0);
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
      let force = dif.clone().normalize().multiplyScalar(3000.);

      if (dif.lengthSq() < 25) {
        this.targets[index * 2 + 0] =
            (Math.random() * 2. - 1.) * window.innerWidth * 0.3;
        this.targets[index * 2 + 1] =
            (Math.random() * 2. - 1.) * window.innerHeight * 0.3;
        }

      for (let other = 0; other < this.COUNT; other++) {
        if (other === index) {
          continue;
          }

        let otherR = this.radiuses[other];

        let p2 = new THREE.Vector2(
            this.positions[other * 2 + 0], this.positions[other * 2 + 1]);

        let d = p2.clone().sub(position);
        let l = Math.max(0.001, d.length() - ((radius + otherR) * 50));

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

    if (backend.calledRun && !this.inited) {
      this.backendAllocation = backend._BactorialInitWorld();
      this.inited = true;
      }

    if (backend.calledRun && this.inited) {
      backend._BactorialUpdateWorld(dt * 2);
    }

    this.loadState(dt);
  }

  loadState(dt: number) {
    let ptr = this.backendAllocation;
    let objectCount = backend.getValue(ptr, 'i32');
    ptr += 4

    let positionsPtr = backend.getValue(ptr, '*');
    ptr += 4
    let velocitiesPtr = backend.getValue(ptr, '*');
    ptr += 4
    let radiusesPtr = backend.getValue(ptr, '*');
    ptr += 4
    let statesPtr = backend.getValue(ptr, '*');
    ptr += 4

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

      this.velocities[index * 2 + 0] = THREE.Math.lerp(this.velocities[index * 2 + 0], vx, .05);
      this.velocities[index * 2 + 1] = THREE.Math.lerp(this.velocities[index * 2 + 1], vy, .05);

      this.radiuses[index] = backend.getValue(radiusesPtr, 'float');
      radiusesPtr += 4;

      const raw = backend.getValue(statesPtr, 'i8') & 0xFF;

      // enemy flag
      this.states[index * 4 + 0] = (raw >> 7 & 0x1);
      // selected flag
      this.states[index * 4 + 1] = (raw >> 6 & 0x1);
      // state enum
      this.states[index * 4 + 2] = (raw >> 5);
      // unused yet... (timer in future)
      this.states[index * 4 + 3] = 0;

      statesPtr += 1;

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
    // this.labelRenderer.render(this.scene, this.camera);
  }
}


new Game();
