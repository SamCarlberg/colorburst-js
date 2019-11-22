class ColorCube {
  constructor(colorSpace) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(colorSpace.flat.length * 3); // x3 for r, g, b indices
    this.colors = new Float32Array(colorSpace.flat.length * 3); // x3 for r, g, b
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    // const sprite = new THREE.TextureLoader().load('./img/circle.png');
    this.material = new THREE.PointsMaterial({ vertexColors: THREE.VertexColors, size: 5 });
    this.points = new THREE.Points(this.geometry, this.material);
    this.currentPointIndex = 0;
    this.pointsUpdated = false;
  }

  addPoint(rgb) {
    this.colors[this.currentPointIndex]      = rgb.r / 255.0;
    this.positions[this.currentPointIndex++] = rgb.r - 128;
    this.colors[this.currentPointIndex]      = rgb.g / 255.0;
    this.positions[this.currentPointIndex++] = rgb.g - 128;
    this.colors[this.currentPointIndex]      = rgb.b / 255.0;
    this.positions[this.currentPointIndex++] = rgb.b - 128;
    this.pointsUpdated = true;
  }

  render() {
    this.geometry.attributes.position.needsUpdate = this.pointsUpdated;
    this.geometry.attributes.color.needsUpdate = this.pointsUpdated;
    if (this.pointsUpdated) {
      this.geometry.computeBoundingSphere();
      this.geometry.computeBoundingBox();
    }
    this.pointsUpdated = false;
    this.points.rotation.x += 0.01;
    this.points.rotation.y += 0.01;
    this.points.rotation.z += 0.01;
  }
}
