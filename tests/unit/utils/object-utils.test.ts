import { describe, expect, it } from 'vitest'
import {
  deepClone,
  deepMerge,
  isPlainObject,
  mergeArraysUnique,
  omit,
  pick,
} from '../../../src/utils/object-utils'

describe('object-utils', () => {
  describe('mergeArraysUnique', () => {
    it('should merge arrays with unique values', () => {
      const result = mergeArraysUnique([1, 2, 3], [3, 4, 5])
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle string arrays', () => {
      const result = mergeArraysUnique(['a', 'b'], ['b', 'c'])
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty arrays', () => {
      expect(mergeArraysUnique([], [1, 2])).toEqual([1, 2])
      expect(mergeArraysUnique([1, 2], [])).toEqual([1, 2])
      expect(mergeArraysUnique([], [])).toEqual([])
    })

    it('should handle null/undefined arrays', () => {
      expect(mergeArraysUnique(null as any, [1, 2])).toEqual([1, 2])
      expect(mergeArraysUnique([1, 2], undefined as any)).toEqual([1, 2])
    })
  })

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1 })).toBe(true)
      expect(isPlainObject(Object.create(null))).toBe(false) // No prototype
    })

    it('should return false for non-plain objects', () => {
      expect(isPlainObject(null)).toBe(false)
      expect(isPlainObject(undefined)).toBe(false)
      expect(isPlainObject(42)).toBe(false)
      expect(isPlainObject('string')).toBe(false)
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(new Map())).toBe(false)
      expect(isPlainObject(() => {})).toBe(false)
    })

    class CustomClass {}
    it('should return false for class instances', () => {
      expect(isPlainObject(new CustomClass())).toBe(false)
    })
  })

  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3, c: 4 }
      const result = deepMerge(target as any, source as any)

      expect(result).toEqual({ a: 1, b: 3, c: 4 })
    })

    it('should merge nested objects', () => {
      const target = { a: { b: 1, c: 2 }, d: 3 }
      const source = { a: { c: 3, e: 4 }, f: 5 }
      const result = deepMerge(target as any, source as any)

      expect(result).toEqual({
        a: { b: 1, c: 3, e: 4 },
        d: 3,
        f: 5,
      })
    })

    it('should skip undefined values', () => {
      const target = { a: 1, b: 2 }
      const source = { b: undefined, c: 3 }
      const result = deepMerge(target as any, source as any)

      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('should replace arrays by default', () => {
      const target = { arr: [1, 2] }
      const source = { arr: [3, 4] }
      const result = deepMerge(target as any, source as any)

      expect(result).toEqual({ arr: [3, 4] })
    })

    it('should concat arrays when specified', () => {
      const target = { arr: [1, 2] }
      const source = { arr: [3, 4] }
      const result = deepMerge(target, source, {
        mergeArrays: true,
        arrayMergeStrategy: 'concat',
      })

      expect(result).toEqual({ arr: [1, 2, 3, 4] })
    })

    it('should merge arrays with unique values when specified', () => {
      const target = { arr: [1, 2, 3] }
      const source = { arr: [3, 4, 5] }
      const result = deepMerge(target, source, {
        mergeArrays: true,
        arrayMergeStrategy: 'unique',
      })

      expect(result).toEqual({ arr: [1, 2, 3, 4, 5] })
    })

    it('should replace non-array with array', () => {
      const target = { value: 'string' }
      const source = { value: [1, 2, 3] }
      const result = deepMerge(target as any, source as any)

      expect(result).toEqual({ value: [1, 2, 3] })
    })

    it('should handle null values', () => {
      const target = { a: { b: 1 } }
      const source = { a: null }
      const result = deepMerge(target as any, source as any)

      expect(result).toEqual({ a: null })
    })
  })

  describe('deepClone', () => {
    it('should clone simple objects', () => {
      const obj = { a: 1, b: 'test', c: true }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } }, d: [1, 2, 3] }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.a).not.toBe(obj.a)
      expect(cloned.d).not.toBe(obj.d)
    })

    it('should clone arrays', () => {
      const arr = [1, { a: 2 }, [3, 4]]
      const cloned = deepClone(arr)

      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[1]).not.toBe(arr[1])
      expect(cloned[2]).not.toBe(arr[2])
    })

    it('should handle primitive values', () => {
      expect(deepClone(42)).toBe(42)
      expect(deepClone('string')).toBe('string')
      expect(deepClone(true)).toBe(true)
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
    })

    it('should handle dates', () => {
      const date = new Date('2024-01-01')
      const cloned = deepClone(date)

      expect(cloned).toEqual(date)
      expect(cloned).not.toBe(date)
      expect(cloned.getTime()).toBe(date.getTime())
    })

    it('should handle RegExp', () => {
      const regex = /test/gi
      const cloned = deepClone(regex)

      // RegExp is not deep cloned, returned as is
      expect(cloned).toBe(regex)
    })
  })

  describe('pick', () => {
    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 }
      const result = pick(obj, ['a', 'c'])

      expect(result).toEqual({ a: 1, c: 3 })
    })

    it('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 }
      const result = pick(obj, ['a', 'c' as any])

      expect(result).toEqual({ a: 1 })
    })

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 }
      const result = pick(obj, [])

      expect(result).toEqual({})
    })
  })

  describe('omit', () => {
    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 }
      const result = omit(obj, ['b', 'd'])

      expect(result).toEqual({ a: 1, c: 3 })
    })

    it('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 }
      const result = omit(obj, ['c' as any, 'd' as any])

      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 }
      const result = omit(obj, [])

      expect(result).toEqual({ a: 1, b: 2 })
    })
  })
})
