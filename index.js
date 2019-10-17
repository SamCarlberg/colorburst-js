let filled = [];
let usedColors = new Set();

function reset() {
  const {canvas, context} = canvasContext();
  context.clearRect(0, 0, canvas.width, canvas.height);
  filled = [];
  usedColors = new Set();
}

function start() {
  const {canvas, _} = canvasContext();
  const colors = buildColors(canvas.width, canvas.height);
  filled = new Array(canvas.width);
  for (let i = 0; i < canvas.width; i++) {
    filled[i] = new Array(canvas.height);
    for (let j = 0; j < canvas.height; j++) {
      filled[i][j] = false;
    }
  }
  let seedAnchor = new Anchor(new XY(Math.floor((canvas.width - 1) / 2), Math.floor(canvas.height - 1)), popRandom(colors.flat));
  setColor(seedAnchor.pos, seedAnchor.color);

  const renderer = new Renderer(colors, seedAnchor);

  let callback = () => {
    const MAX_ITERATIONS_PER_UPDATE = 128;
    let i = 0;
    while (renderer.anchors.length > 0 && i++ < MAX_ITERATIONS_PER_UPDATE) {
      renderer.renderPass();
    }
    if (renderer.anchors.length > 0) {
      window.requestAnimationFrame(callback);
    }
  };
  window.requestAnimationFrame(callback);
}

function setColor(xy, rgb) {
  const {_, context} = canvasContext();
  context.fillStyle = rgb.toColorString();
  context.fillRect(xy.x, xy.y, 1, 1);
  usedColors.add(rgb);
  filled[xy.x][xy.y] = true;
}

function resetAndStart() {
  const {canvas, context} = canvasContext();
  context.clearRect(0, 0, canvas.width, canvas.height);

  canvas.width = $('width_field').value;
  canvas.height = $('height_field').value;
  start();
}

function buildColors(width, height) {
  const colorDepth = Math.ceil(Math.pow(2, (Math.log2(width) + Math.log2(height)) / 3));
  const colorSkip = 256 / colorDepth;

  const matrix = new ColorSpace(colorDepth, colorSkip);
  for (let i = 0; i < colorDepth; i++) {
    for (let j = 0; j < colorDepth; j++) {
      for (let k = 0; k < colorDepth; k++) {
        let rgb = new RGB(
          Math.floor(i * colorSkip),
          Math.floor(j * colorSkip),
          Math.floor(k * colorSkip)
        );

        matrix.set(i, j, k, rgb);
      }
    }
  }

  return matrix;
}

/**
 * Pops a random element from an array and returns it.
 * @param {Array} values
 * @returns {null|*} a random element from the array, or null if the array is empty.
 */
function popRandom(values) {
  if (values.length === 0) {
    return null;
  }
  const i = Math.floor(Math.random() * values.length);
  const element = values[i];
  values.splice(i, 1);
  return element;
}

/**
 *
 * @param xy an {@link XY}
 * @returns {*}
 */
function isOpen(xy) {
  if (xy.x >= filled.length) {
    throw `IndexOutOfBounds: X ${xy.x} > ${filled.length - 1}`
  }
  if (xy.y >= filled[0].length) {
    throw `IndexOutOfBounds: Y ${xy.y} > ${filled[0].length - 1}`
  }
  return filled[xy.x][xy.y] === false;
}

function canvasContext() {
  let canvas = $('main_canvas');
  let context = canvas.getContext('2d');
  return {
    canvas: canvas,
    context: context
  };
}

function $(id) {
  return document.getElementById(id);
}

class Renderer {
  constructor(colorSpace, seedAnchor) {
    this.anchors = [seedAnchor];
    this.colorSpace = colorSpace;
  }

  renderPass() {
    if (this.anchors.length === 0) {
      return;
    }
    const anchor = this.getNextAnchor();
    if (anchor === null || anchor === undefined) {
      this.anchors = [];
      return;
    }
    const neighbors = anchor.getNeighbors();
    const xy = popRandom(neighbors);
    const color = this.colorSpace.closest(anchor.color);

    if (xy !== null) {
      const newAnchor = new Anchor(xy, color);
      if (newAnchor.hasNeighbors() || isOpen(xy)) {
        removeElement(this.anchors, newAnchor);
        this.anchors.push(newAnchor);
      }
      setColor(xy, color);
    }

    if (anchor.hasNeighbors()) {
      // The anchor is still viable, push it back
      this.anchors.push(anchor);
    }
  }

  /**
   *
   * @returns {null|Anchor}
   */
  getNextAnchor() {
    let anchor = null;
    let usable = false;

    do {
      if (this.anchors.length === 0) {
        return null;
      }
      anchor = popRandom(this.anchors);
      usable = anchor.hasNeighbors();
    } while (!usable);

    return anchor;
  }
}

/**
 *
 * @param array {[]}
 * @param element {*}
 */
function removeElement(array, element) {
  let index = array.findIndex(e => e.sameAs(element));
  if (index > -1) {
    array.splice(index, 1);
  }
}

class ColorSpace {
  constructor(colorDepth, colorSkip) {
    this.colorDepth = colorDepth;
    this.colorSkip = colorSkip;
    this.flat = [];
    this.arr = new Array(colorDepth);
    for (let x = 0; x < colorDepth; x++) {
      this.arr[x] = new Array(colorDepth);
      for (let y = 0; y < colorDepth; y++) {
        this.arr[x][y] = new Array(colorDepth);
        for (let z = 0; z < colorDepth; z++) {
          this.arr[x][y][z] = 0;
        }
      }
    }
  }

  /**
   * Gets the closest available color to the given one.
   * @param rgb
   * @returns {RGB}
   */
  closest(rgb) {
    // TODO
    return this.fastSearch(rgb);
  }

  fastSearch(rgb) {
    const dim = this.colorDepth;
    const arr = this.arr;
    const r = Math.floor(rgb.r / this.colorSkip + 1);
    const g = Math.floor(rgb.g / this.colorSkip + 1);
    const b = Math.floor(rgb.b / this.colorSkip + 1);

    for (let i = 1; i < dim; i++) {
      const max = (i * 2) + 1;

      const clamp = function (value) {
        return Math.min(arr.length - 1, Math.max(0, Math.min(Math.floor(value - max / 2), dim - 1)));
      };

      const options = [];

      // Top and bottom planes
      for (let x = 0; x < max; x++) {
        for (let y = 0; y < max; y++) {
          const plane = arr[x][y];
          options.push(plane[clamp(b)]);
          options.push(plane[clamp(b + max - 1)])
        }
      }

      // Intermediate planes. Ignore the internals of the cube since prior
      // iterations will have covered those, or in the initial case of max=3,
      // the center value is the input color and we don't want to return it
      // anyway
      for (let z = 1; z < max - 1; z++) {
        for (let x = 0; x < max; x++) {
          // Two edges
          options.push(arr[clamp(r + x)][clamp(g)][clamp(b + z)]);
          options.push(arr[clamp(r + max - 1)][clamp(g + max - 1)][clamp(b + z)]);
        }
        // Other edges - start and end one position in to avoid duplicating the corners
        for (let y = 1; y < max - 1; y++) {
          options.push(arr[clamp(r)][clamp(g + y)][clamp(b + z)]);
          options.push(arr[clamp(r + max - 1)][clamp(g + y)][clamp(b + z)]);
        }
      }

      const availableOptions = options.filter(color => !usedColors.has(color));
      if (availableOptions.length > 0) {
        return availableOptions.sort((a, b) => a.distance(rgb) - b.distance(rgb))[0];
      }
    }

    return rgb;
  }

  /**
   *
   * @returns {[]}
   */
  flatten() {
    return this.flat;
  }

  get(x, y, z) {
    return this.arr[x][y][z];
  }

  /**
   *
   * @param x
   * @param y
   * @param z
   * @param value
   */
  set(x, y, z, value) {
    this.arr[x][y][z] = value;
    this.flat.push(value);
  }
}

class Equatable {
  sameAs(other) {
    return this === other;
  }
}

class RGB extends Equatable {
  constructor(r, g, b) {
    super();
    this.r = r;
    this.g = g;
    this.b = b;
    return this;
  }

  /**
   *
   */
  toString() {
    return this.toColorString();
  }

  /**
   *
   * @returns {string}
   */
  toColorString() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, 1)`;
  }

  /**
   *
   * @param other
   * @returns {boolean}
   */
  sameAs(other) {
    return this.r === other.r
      && this.g === other.g
      && this.b === other.b;
  }

  /**
   *
   * @param other
   * @returns {number}
   */
  distance(other) {
    return Math.sqrt(
      Math.pow((this.r - other.r), 2)
      + Math.pow(this.g - other.g, 2)
      + Math.pow(this.b - other.b, 2)
    );
  }
}

class XY extends Equatable {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  /**
   *
   * @param other
   * @returns {boolean}
   */
  sameAs(other) {
    return this.x === other.x && this.y === other.y;
  }

  toString() {
    return `(${this.x}, ${this.y})`;
  }
}

class Anchor extends Equatable {
  constructor(pos, color) {
    super();
    this.pos = pos;
    this.color = color;
  }

  toString() {
    return `Anchor[${this.pos.toString()}, ${this.color.toString()}]`
  }

  /**
   *
   * @param other
   * @returns {boolean}
   */
  sameAs(other) {
    return this.pos.sameAs(other.pos);
  }

  /**
   * Checks if there are any available neighbors adjacent to this anchor.
   * @returns {boolean}
   */
  hasNeighbors() {
    return this.getNeighbors().length > 0;
  }

  /**
   * Gets available points adjacent to this anchor.
   * @returns {Array}
   */
  getNeighbors() {
    const {canvas, _} = canvasContext();
    const neighbors = [];
    const cx = this.pos.x;
    const cy = this.pos.y;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) {
          continue;
        }

        let x = cx + i;
        let y = cy + j;

        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
          continue;
        }

        let pos = new XY(x, y);
        if (isOpen(pos)) {
          neighbors.push(pos);
        }
      }
    }
    return neighbors;
  }
}
