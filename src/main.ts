import THREE = require('three');
import bacteria_frag from './shaders/bacteria.frag';
import bacteria_vert from './shaders/bacteria.vert';

console.log(bacteria_frag, bacteria_vert)

    class Game {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private geometry: THREE.InstancedBufferGeometry;
  private material: THREE.RawShaderMaterial;
  private mesh: THREE.Mesh;

  constructor(private COUNT = 100, private DISTANCE = 100) {
    if (this.init()) {
      this.animate();
    }
  }

  init() {
    const positions = new Float32Array(this.COUNT * 2);
    const side = Math.sqrt(this.COUNT);
    for (let x = 0; x < side; x++) {
      for (let y = 0; y < side; y++) {
        const index = y * side + x
        positions[index * 2 + 0] = x * this.DISTANCE
        positions[index * 2 + 1] = y * this.DISTANCE
      }
    }

    this.renderer = new THREE.WebGLRenderer();

    if (this.renderer.extensions.get('ANGLE_instanced_arrays') === null) {
      document.getElementById('notSupported').style.display = '';
      return false;
    }

    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera(
        50, window.innerWidth / window.innerHeight, 1, 5000);

    this.camera.position.z = 1400;

    this.scene = new THREE.Scene();

    const circleGeometry = new THREE.CircleBufferGeometry(1, 8);

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = circleGeometry.index;
    this.geometry.attributes = circleGeometry.attributes;

    this.geometry.addAttribute(
        'translate', new THREE.InstancedBufferAttribute(positions, 2));

    this.material = new THREE.RawShaderMaterial({
      uniforms: {
        map: {
          value: new THREE.TextureLoader().load('assets/sprites/circle.png')
        },
        time: {value: 0.0}
      },
      vertexShader: bacteria_vert,
      fragmentShader: bacteria_frag,
      depthTest: true,
      depthWrite: true
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
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
    // this.mesh.rotation.x = time * 0.2;
    // this.mesh.rotation.y = time * 0.4;
    this.renderer.render(this.scene, this.camera);
  }
}


new Game()