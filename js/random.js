/**
 * A random number generator.  Any two Random instances with the same seed
 * value will return the same sequence of numbers from nextRandom()
 *
 * const random1 = new Random(1234);
 * const random2 = new Random(1234);
 *
 * random1.nextRandom(); // => 0.07329497812315822
 * random2.nextRandom(); // => 0.07329497812315822
 */
class Random {
	constructor(seed) {
		this.seed = seed;
		this.previous = seed;
	}

	/**
	 * Gets the next random number in the sequence.
	 * Random numbers are returned as floats in the range [0, 1).
	 */
	nextRandom() {
		const rand = this.mulberry32(this.previous);
		this.previous = rand;
		return rand / 4294967296; // map to [0, 1) range
	}

	mulberry32(a) {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0);
	}
}
