# deep-clone-kit

健壮的深拷贝工具，零依赖、全 TypeScript。相比 `JSON.parse(JSON.stringify(obj))` 和大多数手写版，它能正确处理：

- 🔁 **循环引用**：`WeakMap` 缓存，不爆栈、不丢引用关系
- 📅 **特殊对象**：`Date` / `RegExp` / `Map` / `Set` / `Error`
- 🧬 **二进制**：`ArrayBuffer` / `DataView` / `TypedArray`（Int8Array、Uint8Array、Float64Array 等）
- 🔑 **Symbol key + 不可枚举属性**：用 `Reflect.ownKeys` + 属性描述符，不丢任何自有属性
- 🧩 **原型链**：非普通对象保留 `Object.getPrototypeOf`

## 安装

```bash
npm install deep-clone-kit
```

## 快速开始

```ts
import { deepClone, cloneDeep } from 'deep-clone-kit'

const obj = {
  name: '小龙',
  date: new Date(),
  reg: /abc/gi,
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3]),
  buf: new Uint8Array([1, 2, 3]),
  [Symbol('id')]: 42,
}
obj.self = obj // 循环引用

const copy = deepClone(obj)
console.log(copy.self === copy)      // true：循环引用关系被保留
console.log(copy.date === obj.date)  // false：独立副本
console.log(copy.map === obj.map)    // false
```

## API

| 函数 | 说明 |
| --- | --- |
| `deepClone(value, options?)` | 深拷贝任意值 |
| `cloneDeep(value, options?)` | `deepClone` 的别名 |
| `isDeepStrictEqual(a, b)` | 深比较两个值（浅遍历递归，供测试/调试） |

### Options

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `cloneFunctions` | `boolean` | `false` | 是否拷贝函数，默认返回原引用 |

## 为什么不用 JSON 方案

`JSON.parse(JSON.stringify(obj))` 有三个致命问题，这个库都解决了：

| 问题 | JSON 方案 | deep-clone-kit |
| --- | --- | --- |
| 循环引用 | 💥 直接抛 `TypeError` | ✅ `WeakMap` 缓存，正确保留引用关系 |
| `Date` / `RegExp` / `Map` / `Set` | ❌ 变成 `{}` 或字符串 | ✅ 正确重建 |
| `undefined` / 函数 / Symbol key | ❌ 直接丢失 | ✅ 完整保留 |
| 不可枚举属性 | ❌ 丢失 | ✅ `Reflect.ownKeys` + 描述符保留 |

## 实现要点

1. **循环引用**：`WeakMap<object, object>` 记录「原对象 → 拷贝对象」，克隆前先查缓存，命中直接返回。
2. **类型分发**：用 `Object.prototype.toString` 得到精确 tag（`[object Date]`、`[object Map]` 等），按类型重建。
3. **属性完整性**：`Reflect.ownKeys` 拿到所有自有 key（含 Symbol、不可枚举），`getOwnPropertyDescriptor` 原样复制描述符（getter/setter、writable、enumerable）。
4. **WeakMap 用弱引用**：克隆完成后缓存自动释放，不阻止原对象被 GC。

## 已知边界（刻意不处理）

- `WeakMap` / `WeakSet`（不可遍历）、`Promise`（不可克隆）直接返回原引用。
- 函数默认共享引用（`cloneFunctions: true` 时才 `bind` 一份）。

## License

MIT
