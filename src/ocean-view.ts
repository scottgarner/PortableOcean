import * as THREE from "three";

import { Water } from "three/addons/objects/Water.js";
import { Sky } from "three/addons/objects/Sky.js";

export class OceanView {
  container: HTMLElement;

  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  water: Water;
  sun: THREE.Vector3;
  sky: Sky = new Sky();

  xOffset: number = 0;
  yOffset: number = 0;

  sensorOrientation = new THREE.Quaternion();

  parameters = {
    elevation: 2,
    azimuth: 180,
  };

  pmremGenerator: THREE.PMREMGenerator;
  sceneEnvironment: THREE.Scene = new THREE.Scene();
  renderTarget: THREE.RenderTarget | undefined;

  constructor() {
    console.log("Ocean View.");

    // Scene setup.
    {
      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        1,
        20000
      );
      this.camera.position.set(0, 16, 0);

      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setAnimationLoop(() => {
        this.animate();
      });
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.5;

      this.container = document.getElementById("container")!;
      this.container.appendChild(this.renderer.domElement);
    }

    //Controls
    {
      window.addEventListener("keydown", (event) => {
        const rotationStep = 0.05;

        if (event.key === "ArrowUp") {
          this.xOffset += rotationStep;
        } else if (event.key === "ArrowDown") {
          this.xOffset -= rotationStep;
        } else if (event.key === "ArrowLeft") {
          this.yOffset += rotationStep;
        } else if (event.key === "ArrowRight") {
          this.yOffset -= rotationStep;
        }
      });
    }

    // Resize
    {
      window.addEventListener("resize", () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    // Ocean setup.
    {
      this.sun = new THREE.Vector3();

      // Water.
      {
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

        this.water = new Water(waterGeometry, {
          textureWidth: 512,
          textureHeight: 512,
          waterNormals: new THREE.TextureLoader().load(
            "textures/waternormals.jpg",
            function (texture) {
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
          ),
          sunDirection: new THREE.Vector3(),
          sunColor: 0xffffff,
          waterColor: 0x201e6f,
          distortionScale: 3.7,
          fog: this.scene.fog !== undefined,
        });

        this.water.rotation.x = -Math.PI / 2;

        this.scene.add(this.water);
      }

      // Skybox
      {
        this.sky.scale.setScalar(10000);
        this.scene.add(this.sky);

        const skyUniforms = this.sky.material.uniforms;

        skyUniforms["turbidity"].value = 10;
        skyUniforms["rayleigh"].value = 2;
        skyUniforms["mieCoefficient"].value = 0.005;
        skyUniforms["mieDirectionalG"].value = 0.8;

        this.sceneEnvironment.add(this.sky);
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      }

      this.updateSun();
    }
  }

  updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - this.parameters.elevation);
    const theta = THREE.MathUtils.degToRad(this.parameters.azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
    this.water.material.uniforms["sunDirection"].value
      .copy(this.sun)
      .normalize();

    if (this.renderTarget !== undefined) this.renderTarget.dispose();

    this.renderTarget = this.pmremGenerator.fromScene(this.sceneEnvironment);
    this.scene.add(this.sky);

    this.scene.environment = this.renderTarget.texture;
  }

  updateCamera(data: any) {
    const pitch = THREE.MathUtils.degToRad(data.pitch);
    const yaw = THREE.MathUtils.degToRad(data.yaw);
    const roll = THREE.MathUtils.degToRad(data.roll);

    this.sensorOrientation.setFromEuler(
      new THREE.Euler(-pitch, -yaw, roll, "YXZ")
    );
  }

  animate() {
    const time = performance.now() * 0.001;

    this.camera.quaternion
      .identity()
      .multiply(this.sensorOrientation)
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.yOffset
        )
      )
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion),
          this.xOffset
        )
      );

    this.water.material.uniforms["time"].value = time;
    this.renderer.render(this.scene, this.camera);
  }
}
