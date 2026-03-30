class ColorCube {
  constructor(colorSpace) {
    const count = colorSpace.flat.length;
    this.geometry = new THREE.InstancedBufferGeometry();
    const boxSize = 256 / Math.pow(count, 1/3)
    const box = new THREE.BoxBufferGeometry(boxSize, boxSize, boxSize);
    this.geometry.index = box.index;
    this.geometry.attributes.position = box.attributes.position;
    this.geometry.attributes.normal = box.attributes.normal;
    this.geometry.attributes.uv = box.attributes.uv;

    this.instancePositions = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.instanceColors = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.instanceAddedTime = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);

    this.geometry.addAttribute('instancePosition', this.instancePositions);
    this.geometry.addAttribute('instanceColor', this.instanceColors);
    this.geometry.addAttribute('instanceAddedTime', this.instanceAddedTime);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 }
      },
      vertexShader: `
        attribute vec3 instancePosition;
        attribute vec3 instanceColor;
        attribute float instanceAddedTime;
        varying vec3 vColor;
        varying float vAddedTime;
        void main() {
          vColor = instanceColor;
          vAddedTime = instanceAddedTime;
          vec3 pos = position + instancePosition;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAddedTime;
        uniform float uTime;
        void main() {
          float age = uTime - vAddedTime;
          float flash = 0.0;
          if (age >= 0.0 && age < 1.0) {
            flash = exp(-age * 5.0);
          }
          gl_FragColor = vec4(vColor + vec3(flash), 1.0);
        }
      `
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;

    this.currentPointIndex = 0;
    this.pointsUpdated = false;
    this.lastUpdatedIndex = 0;
  }

  addPoint(rgb, now) {
    const idx = this.currentPointIndex;

    this.instancePositions.setXYZ(idx, rgb.r - 128, rgb.g - 128, rgb.b - 128);
    this.instanceColors.setXYZ(idx, rgb.r / 255.0, rgb.g / 255.0, rgb.b / 255.0);
    this.instanceAddedTime.setX(idx, now || performance.now() / 1000);

    this.currentPointIndex++;
    this.geometry.maxInstancedCount = this.currentPointIndex;
    this.pointsUpdated = true;
  }

  render() {
    this.material.uniforms.uTime.value = performance.now() / 1000;
    if (this.pointsUpdated) {
      const updateRange = {
        offset: this.lastUpdatedIndex,
        count: this.currentPointIndex - this.lastUpdatedIndex
      };

      this.instancePositions.updateRange = {
        offset: updateRange.offset * 3,
        count: updateRange.count * 3
      };
      this.instanceColors.updateRange = {
        offset: updateRange.offset * 3,
        count: updateRange.count * 3
      };
      this.instanceAddedTime.updateRange = updateRange;

      this.instancePositions.needsUpdate = true;
      this.instanceColors.needsUpdate = true;
      this.instanceAddedTime.needsUpdate = true;

      this.lastUpdatedIndex = this.currentPointIndex;
      this.pointsUpdated = false;
    }
  }
}
