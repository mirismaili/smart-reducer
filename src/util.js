/**
 * Created on 1400/12/3 (2022/2/22).
 * @author {@link https://mirismaili.github.io S. Mahdi Mir-Ismaili}
 */

class O {
  constructor(object) {
    this.object = object
  }
  
  map(valueMapper, keyMapper = undefined) {
    return Object.fromEntries(
      Object.entries(this.object).map(([k, v], i) => [keyMapper?.(k, v, i) ?? k, valueMapper(v, k, i)]),
    )
  }
}

/**
 * Add useful methods (like `map`) to the object
 */
export const o = (object) => new O(object)
