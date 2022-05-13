/**
 * Created on 1400/12/3 (2022/2/22).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */

/**
 * @property {Object} o
 */
export class O {
  constructor(object) {
    this.entries = Object.entries(object)
  }
  
  get o() {
    return Object.fromEntries(this.entries)
  }
  
  /**
   * @callback ValueMapper
   * @param {any} value
   * @param {string} [key]
   * @param {int} [index] The index of the current element being processed in the `entries` array
   * @param {[string, *][]} [entries] The entries of the object on which the method was called
   * @return {*} The new value
   */
  
  /**
   * @callback KeyMapper
   * @param {string} key
   * @param {any} [value]
   * @param {int} [index] The index of the current element being processed in the `entries` array
   * @param {[string, *][]} [entries] The entries of the object on which the method was called
   * @return {string} The new key
   */
  /**
   * @param {ValueMapper} valueMapper
   * @param {KeyMapper} [keyMapper]
   */
  map(valueMapper, keyMapper) { // noinspection JSCheckFunctionSignatures
    this.entries = this.entries.map(([k, v], i, entries) => [
      keyMapper?.(k, v, i, entries) ?? k,
      valueMapper(v, k, i, entries),
    ])
    return this
  }
}

/**
 * Add useful methods (like `map`) to the object
 */
export const o = (object) => new O(object)
