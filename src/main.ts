import THREE = require('three');
import bacteria_body_frag from './shaders/bacteria-body.frag';
import bacteria_dots_frag from './shaders/bacteria-dots.frag';
import bacteria_vert from './shaders/bacteria.vert';

class Game {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private geometry: THREE.InstancedBufferGeometry;
  private material: THREE.RawShaderMaterial;
  private material_dots: THREE.RawShaderMaterial;
  private mesh: THREE.Mesh;

  constructor(private COUNT = 100, private DISTANCE = 50) {
    if (this.init()) {
      this.animate();
    }
  }

  init() {
    const seed = new Float32Array(this.COUNT * 2);
    const positions = new Float32Array(this.COUNT * 2);
    const side = Math.sqrt(this.COUNT);
    for (let x = 0; x < side; x++) {
      for (let y = 0; y < side; y++) {
        const index = y * side + x
        positions[index * 2 + 0] = x * this.DISTANCE * 2
        positions[index * 2 + 1] = y * this.DISTANCE * 2

        seed[index * 2 + 0] = Math.random() * 2. - 1.;
        seed[index * 2 + 1] = Math.random() * 2. - 1.;
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
        10, window.innerWidth / window.innerHeight, 1, 5000);

    this.camera.position.z = 1400;

    this.scene = new THREE.Scene();

    const circleGeometry = new THREE.CircleBufferGeometry(1, 8);

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = circleGeometry.index;
    this.geometry.attributes = circleGeometry.attributes;

    this.geometry.addAttribute(
        'translate', new THREE.InstancedBufferAttribute(positions, 2));
    this.geometry.addAttribute(
        'seed', new THREE.InstancedBufferAttribute(seed, 2));

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

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.scale.set(1, 1, 1);
    this.scene.add(this.mesh);
    
    this.mesh = new THREE.Mesh(this.geometry, this.material_dots);
    this.mesh.scale.set(1, 1, 1);
    this.scene.add(this.mesh);

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

    this.render();
  }

  render() {
    var time = performance.now() * 0.0005;
    this.material.uniforms['time'].value = time;
    this.material_dots.uniforms['time'].value = time;
    // this.mesh.rotation.x = time * 0.2;
    // this.mesh.rotation.y = time * 0.4;
    this.renderer.render(this.scene, this.camera);
  }
}


new Game()