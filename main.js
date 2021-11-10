let filled = [];
let usedColors = new Set();
let animationHandle = null;

var showColorspace = true;
let scene = new THREE.Scene();
let glRenderer = null;
let camera = null;
let cameraControls = null;
let colorCube = null;

var buildingImage = false;

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

var random = null;

function start() {
  const randomSeedInput = $('random_seed_input').value;
  var randomSeed = null;
  if (randomSeedInput === '') {
    const rand = new Random(Math.floor(Math.random() * 4294967296));
    randomSeed = rand.mulberry32(Math.floor(Math.random() * 4294967296));
    $('random_seed_input').placeholder = randomSeed;
  } else {
    randomSeed = randomSeedInput.hashCode();
  }

  random = new Random(randomSeed);

  // Cancel prior execution
  if (animationHandle !== null) {
    window.cancelAnimationFrame(animationHandle);
  }

  $('progress_area').hidden = false
  $('toggle_generation').value = 'Pause';
  showColorspace = $('display_colorspace').checked;

  const {canvas, _} = canvasContext();
  const colors = buildColors(canvas.width, canvas.height);
  filled = new Array(canvas.width);
  for (let i = 0; i < canvas.width; i++) {
    filled[i] = new Array(canvas.height);
    for (let j = 0; j < canvas.height; j++) {
      filled[i][j] = false;
    }
  }

  colorCube = new ColorCube(colors);

  $('colorcube_canvas').hidden = !showColorspace;
  if (showColorspace) {
    init3js();
  }

  let seedColorString = $('seed_color_picker').value;
  let startColor = colors.closest(colorStringToRgb(seedColorString));

  let seedAnchor = new Anchor(new XY(Math.floor((canvas.width - 1) / 2), Math.floor(canvas.height - 1)), startColor);
  setColor(seedAnchor.pos, seedAnchor.color);

  const renderer = new Renderer(colors, seedAnchor);

  buildingImage = true;
  let pixelsDrawn = 1;
  let elapsedTime = 0;
  const numPixels = canvas.width * canvas.height;

  const animationCallback = () => {
    if (buildingImage && renderer.anchors.length > 0) {
      const frameStart = Date.now();
      const MAX_TIME_PER_ITERATION = 33; // millis
      let newPixelsDrawn = 0;
      while (buildingImage && renderer.anchors.length > 0 && (Date.now() - frameStart < MAX_TIME_PER_ITERATION)) {
        renderer.renderPass();
        newPixelsDrawn++;
        pixelsDrawn++;
      }
      const frameTime = Date.now() - frameStart;
      elapsedTime += frameTime;
      const fillRate = Math.round(pixelsDrawn / (elapsedTime / 1000));
      const progress = 100 * pixelsDrawn / numPixels;
      $('elapsed_time_text').textContent = `in ${toHHMMSS(elapsedTime)}`;
      $('fillrate_text').textContent = `(drawing ${fillRate} pixels per second)`;
      $('progress_bar').value = progress;
      $('progress_text').textContent = `${Math.floor(progress)}%`;
    }

    if (showColorspace) {
      colorCube.render();
      cameraControls.update();
      glRenderer.render(scene, camera);
    }
    animationHandle = window.requestAnimationFrame(animationCallback);
  };

  animationHandle = window.requestAnimationFrame(animationCallback);
}

function toggleGeneration() {
  buildingImage = !buildingImage;
  if (buildingImage) {
    $('toggle_generation').value = 'Pause';
  } else {
    $('toggle_generation').value = 'Resume'
  }
}

function colorToSigned24Bit(s) {
  return (parseInt(s.substr(1), 16) << 8) / 256;
}

function colorStringToRgb(colorString) {
  let colorVal = colorToSigned24Bit(colorString);
  let r = (colorVal >> 16) & 0xff;
  let g = (colorVal >> 8) & 0xff;
  let b = colorVal & 0xff;
  return new RGB(r, g, b);
}

function init3js() {
  camera = new THREE.PerspectiveCamera(70, 1, 0.01, 256 * 4);
  camera.position.z = 256 * 1.414;
  while(scene.children.length > 0){ 
    scene.remove(scene.children[0]); 
  }
  scene.add(colorCube.points);

  glRenderer = new THREE.WebGLRenderer({ antialias: true, canvas: $('colorcube_canvas') });
  glRenderer.setSize(512, 512);
  glRenderer.setPixelRatio(window.devicePixelRatio);

  cameraControls = new THREE.TrackballControls(camera, glRenderer.domElement);
}

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
}

function downloadImage(){
  const canvas = $('main_canvas');
  const link = document.createElement("a");
  const imgData = canvas.toDataURL({format: 'png', multiplier: 4});
  const strDataURI = imgData.substr(22, imgData.length);
  const blob = dataURLtoBlob(imgData);
  const objurl = URL.createObjectURL(blob);

  link.download = `colorburst-${canvas.width}x${canvas.height}.png`;
  link.href = objurl;
  link.click();
}

function toHHMMSS(millis) {
  let seconds = Math.floor(millis / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  seconds = Math.floor(seconds % 60);
  minutes = Math.floor(minutes % 60);
  hours = Math.floor(hours % 60);
  if (hours > 0) {
    return `${hours} hour${plural(hours)} ${minutes} minute${plural(minutes)} ${seconds} second${plural(seconds)}`
  } else if (minutes > 0) {
    return `${minutes} minute${plural(minutes)} ${seconds} second${plural(seconds)}`
  } else {
    return `${seconds} second${plural(seconds)}`
  }
}

function plural(count) {
  return count == 1 ? "" : "s";
}

function setColor(xy, rgb) {
  const {_, context} = canvasContext();
  context.fillStyle = rgb.toColorString();
  context.fillRect(xy.x, xy.y, 1, 1);
  // usedColors.add(rgb);
  rgb.inUse = true;
  filled[xy.x][xy.y] = true;

  if (showColorspace) {
    colorCube.addPoint(rgb);
  }
}

function resetAndStart() {
  const {canvas, context} = canvasContext();
  context.clearRect(0, 0, canvas.width, canvas.height);

  canvas.width = $('width_field').value;
  canvas.height = $('height_field').value;
  start();
}

function buildColors(width, height) {
  const colorDepth = Math.ceil(Math.pow(2, (Math.log2(width * height)) / 3));
  const colorSkip = 256 / colorDepth;

  const matrix = new ColorSpace(colorDepth, colorSkip);
  matrix.build();

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
  const i = Math.floor(random.nextRandom() * values.length);
  const element = values[i];
  values.splice(i, 1);
  return element;
}

/**
 * Gets a random element from an array and returns it.
 * @param {Array} values
 * @returns {null|*} a random element from the array, or null if the array is empty.
 */
function getRandom(values) {
  if (values.length === 0) {
    return null;
  }
  const i = Math.floor(random.nextRandom() * values.length);
  return values[i];
}

function groupBy(extractor) {
  return function(map, value) {
    var key = extractor(value);
    if (map.get(key) === undefined) {
      map.set(key, []);
    }
    map.get(key).push(value);
    return map;
  };
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
    this.indexes = [];
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

  build() {
    for (let i = 0; i < this.colorDepth; i++) {
      this.indexes.push(Math.floor(i * this.colorSkip)); // i, j, k are all going to be in the same set of numbers

      for (let j = 0; j < this.colorDepth; j++) {
        for (let k = 0; k < this.colorDepth; k++) {
          let rgb = new RGB(
            Math.floor(i * this.colorSkip), // R
            Math.floor(j * this.colorSkip), // G
            Math.floor(k * this.colorSkip)  // B
          );

          this.set(i, j, k, rgb);
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
    return this.fastSearch(rgb);
  }

  mapToIndex(channelValue) {
    // +1, -2, +3, -4, +5, -6, +7, -8, +9, -10, ...
    // checks offsets of +1, -1, +2, -2, etc
    var offset = 1;
    while(this.indexes.indexOf(channelValue) === -1) {
      channelValue += offset;
      offset = -1 * (offset + Math.sign(offset));
    }

    return this.indexes.indexOf(channelValue);
  }

  fastSearch(rgb) {
    const dim = this.colorDepth;
    const arr = this.arr;

    const r = this.mapToIndex(rgb.r);
    const g = this.mapToIndex(rgb.g);
    const b = this.mapToIndex(rgb.b);

    // Search the faces of a cube centered at point (R, G, B) with radius up to colorDepth to find any unused colors;
    // out of those colors, find the one closest to (R, G, B) and return it.  If multiple colors are the same distance,
    // pick one of them at random.
    for (let searchRadius = 0; searchRadius < this.colorDepth; searchRadius++) {
      const availableOptions = [];


      const xOffsets = [];
      const yOffsets = [];
      const zOffsets = [];

      if (r - searchRadius >= 0)  { xOffsets.push(r - searchRadius); }
      if (r + searchRadius < dim) { xOffsets.push(r + searchRadius); }

      if (g - searchRadius >= 0)  { yOffsets.push(g - searchRadius); }
      if (g + searchRadius < dim) { yOffsets.push(g + searchRadius); }

      if (b - searchRadius >= 0)  { zOffsets.push(b - searchRadius); }
      if (b + searchRadius < dim) { zOffsets.push(b + searchRadius); }

      // bottom red-green plane and top red-green plane (-b, +b)
      for (let x = Math.max(0, r - searchRadius); x <= r + searchRadius && x < dim; x++) {
        for (let y = Math.max(0, g - searchRadius); y <= g + searchRadius && y < dim; y++) {
          for (const z of zOffsets) {
            const color = arr[x][y][z];

            // will add the same color twice in the case of searchRadius === 0,
            // but that's the only color in the search space so that doesn't matter
            if (color && color.inUse === false) {
              availableOptions.push(color);
            }
          }
        }
      }

      // left green-blue plane and right green-blue plane (-r, +r)
      // z-index is pushed towards the center by one to avoid re-querying the edges on the R-G planes
      for (let y = Math.max(0, g - searchRadius); y <= g + searchRadius && y < dim; y++) {
        for (let z = Math.max(0, b - searchRadius + 1); z <= b + searchRadius - 1 && z < dim; z++) {
          for (const x of xOffsets) {
            const color = arr[x][y][z];
            
            if (color && color.inUse === false) {
              availableOptions.push(color);
            }
          }
        }
      }

      // front red-blue plane and back red-blue plane
      for (let x = Math.max(0, r - searchRadius + 1); x <= r + searchRadius - 1 && x < dim; x++) {
        for (let z = Math.max(0, b - searchRadius + 1); z <= b + searchRadius - 1 && z < dim; z++) {
          for (const y of yOffsets) {
            const color = arr[x][y][z];

            if (color && color.inUse === false) {
              availableOptions.push(color);
            }
          }
        }
      }

      if (availableOptions.length === 1) {
        return availableOptions[0];
      } else if (availableOptions.length > 1) {
        let closestDistance = null;
        let closestOptions = [];

        for (const option of availableOptions) {
          const distance = option.distance(rgb);
          if (!closestDistance || distance < closestDistance) {
            closestDistance = distance;
            closestOptions = [];
            closestOptions.push(option);
          } else if (Math.abs(distance - closestDistance) < 0.01) { // epsilon comparison
            closestOptions.push(option);
          }
        }

        return getRandom(closestOptions);
      }
    }

    // Should never get here - the search should exhaustively cover the entire color space
    console.warn(`Search found no results for ${rgb}!`);
    return new RGB(255, 255, 255);
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
    this.inUse = false;
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
      Math.pow((this.r - other.r), 2) +
      Math.pow((this.g - other.g), 2) + 
      Math.pow((this.b - other.b), 2)
    );
    // return deltaE(rgb2lab([this.r, this.g, this.b]), rgb2lab([other.r, other.g, other.b]));
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


// RGB-LAB conversion
// SOURCE: https://github.com/antimatter15/rgb-lab/blob/master/color.js

// the following functions are based off of the pseudocode
// found on www.easyrgb.com

function lab2rgb(lab){
  var y = (lab[0] + 16) / 116,
      x = lab[1] / 500 + y,
      z = y - lab[2] / 200,
      r, g, b;

  x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787);
  y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787);
  z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787);

  r = x *  3.2406 + y * -1.5372 + z * -0.4986;
  g = x * -0.9689 + y *  1.8758 + z *  0.0415;
  b = x *  0.0557 + y * -0.2040 + z *  1.0570;

  r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
  g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
  b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1/2.4) - 0.055) : 12.92 * b;

  return [Math.max(0, Math.min(1, r)) * 255, 
          Math.max(0, Math.min(1, g)) * 255, 
          Math.max(0, Math.min(1, b)) * 255]
}


function rgb2lab(rgb){
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255,
      x, y, z;

  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}

// calculate the perceptual distance between colors in CIELAB
// https://github.com/THEjoezack/ColorMine/blob/master/ColorMine/ColorSpaces/Comparisons/Cie94Comparison.cs

function deltaE(labA, labB){
  var deltaL = labA[0] - labB[0];
  var deltaA = labA[1] - labB[1];
  var deltaB = labA[2] - labB[2];
  var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  var deltaC = c1 - c2;
  var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  var sc = 1.0 + 0.045 * c1;
  var sh = 1.0 + 0.015 * c1;
  var deltaLKlsl = deltaL / (1.0);
  var deltaCkcsc = deltaC / (sc);
  var deltaHkhsh = deltaH / (sh);
  var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

// end RGB-LAB conversion
