/**
 * 深拷贝工具：处理循环引用、特殊对象（Date/RegExp/Map/Set/TypedArray/DataView/ArrayBuffer）、
 * Symbol key、不可枚举属性、原型链等，比 JSON.parse(JSON.stringify()) 和大多数手写版更完整。
 */

export interface DeepCloneOptions {
  /** 是否拷贝函数（默认 false，函数直接返回原引用，因为函数通常应共享） */
  cloneFunctions?: boolean
}

const objectToString = Object.prototype.toString

function getTag(value: unknown): string {
  return objectToString.call(value)
}

function isPlainObject(value: unknown): value is Record<PropertyKey, any> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * 深拷贝。
 * @param value 任意值
 * @param options 配置
 */
export function deepClone<T>(value: T, options: DeepCloneOptions = {}): T {
  return clone(value, new WeakMap(), options)
}

function clone(value: any, seen: WeakMap<object, any>, options: DeepCloneOptions): any {
  // 原始值 / null / undefined / 函数 / symbol / bigint 直接返回（不可变或应共享）
  if (value === null || typeof value !== 'object') {
    return value
  }

  // 函数：默认共享引用
  if (typeof value === 'function') {
    return options.cloneFunctions ? (value as Function).bind(null) : value
  }

  // 循环引用：命中缓存直接返回，避免死循环
  if (seen.has(value)) return seen.get(value)

  const tag = getTag(value)

  switch (tag) {
    case '[object Date]':
      return new Date(value.getTime())

    case '[object RegExp]':
      return new RegExp(value.source, value.flags)

    case '[object Map]': {
      const map = new Map()
      seen.set(value, map)
      value.forEach((v: any, k: any) => map.set(clone(k, seen, options), clone(v, seen, options)))
      return map
    }

    case '[object Set]': {
      const set = new Set()
      seen.set(value, set)
      value.forEach((v: any) => set.add(clone(v, seen, options)))
      return set
    }

    case '[object ArrayBuffer]':
      return value.slice(0)

    case '[object DataView]': {
      const buffer = clone(value.buffer, seen, options)
      return new DataView(buffer, value.byteOffset, value.byteLength)
    }

    case '[object Error]':
    case '[object EvalError]':
    case '[object RangeError]':
    case '[object ReferenceError]':
    case '[object SyntaxError]':
    case '[object TypeError]':
    case '[object URIError]': {
      const err = new (value.constructor as any)(value.message)
      err.stack = value.stack
      return err
    }
  }

  // TypedArray：Int8Array / Uint8Array / Float64Array 等（DataView 已在上面单独处理）
  if (ArrayBuffer.isView(value)) {
    const buffer = clone(value.buffer, seen, options)
    return new (value.constructor as any)(buffer, value.byteOffset, (value as any).length)
  }

  // WeakMap / WeakSet 不可遍历，Promise 不可克隆，直接返回原引用
  if (tag === '[object WeakMap]' || tag === '[object WeakSet]' || tag === '[object Promise]') {
    return value
  }

  // 数组：新建数组，逐项克隆
  if (Array.isArray(value)) {
    const arr: any[] = []
    seen.set(value, arr)
    for (let i = 0; i < value.length; i++) {
      arr[i] = clone(value[i], seen, options)
    }
    return arr
  }

  // 普通对象：保留原型链，克隆所有自有属性（含 Symbol key、不可枚举）
  const result: Record<PropertyKey, any> = isPlainObject(value)
    ? {}
    : Object.create(Object.getPrototypeOf(value))
  seen.set(value, result)

  for (const key of Reflect.ownKeys(value)) {
    const desc = Object.getOwnPropertyDescriptor(value, key)
    if (!desc) continue
    if ('value' in desc) {
      desc.value = clone(desc.value, seen, options)
    }
    Object.defineProperty(result, key, desc)
  }

  return result
}

/** 别名 */
export { deepClone as cloneDeep }

/** 判断两个值是否深拷贝后相等（浅比较递归，仅供测试/调试） */
export function isDeepStrictEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (getTag(a) !== getTag(b)) return false
  const keysA = Reflect.ownKeys(a as object)
  const keysB = Reflect.ownKeys(b as object)
  if (keysA.length !== keysB.length) return false
  return keysA.every((k) => isDeepStrictEqual((a as any)[k], (b as any)[k]))
}
