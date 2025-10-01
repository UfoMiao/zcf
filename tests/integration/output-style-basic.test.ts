import { describe, expect, it } from 'vitest'
import { getAvailableOutputStyles } from '../../src/utils/output-style'

describe('output-style basic functionality', () => {
  it('should return correct number of output styles', () => {
    const styles = getAvailableOutputStyles()
    expect(styles).toHaveLength(7)
  })

  it('should have 4 custom styles and 3 built-in styles', () => {
    const styles = getAvailableOutputStyles()
    const customStyles = styles.filter(s => s.isCustom)
    const builtinStyles = styles.filter(s => !s.isCustom)

    expect(customStyles).toHaveLength(4)
    expect(builtinStyles).toHaveLength(3)
  })

  it('should have expected custom style IDs', () => {
    const styles = getAvailableOutputStyles()
    const customStyleIds = styles.filter(s => s.isCustom).map(s => s.id)

    expect(customStyleIds).toEqual([
      'engineer-professional',
      'nekomata-engineer',
      'laowang-engineer',
      'ojousama-engineer',
    ])
  })

  it('should have expected built-in style IDs', () => {
    const styles = getAvailableOutputStyles()
    const builtinStyleIds = styles.filter(s => !s.isCustom).map(s => s.id)

    expect(builtinStyleIds).toEqual([
      'default',
      'explanatory',
      'learning',
    ])
  })

  it('should have valid style identifiers', () => {
    const styles = getAvailableOutputStyles()

    styles.forEach((style) => {
      // Verify all styles have valid ID
      expect(typeof style.id).toBe('string')
      expect(style.id.length).toBeGreaterThan(0)

      // Verify isCustom is boolean
      expect(typeof style.isCustom).toBe('boolean')

      // Custom styles should have filePath
      if (style.isCustom) {
        expect(typeof style.filePath).toBe('string')
        expect(style.filePath!.length).toBeGreaterThan(0)
      }
      else {
        // Built-in styles should not have filePath
        expect(style.filePath).toBeUndefined()
      }
    })
  })

  it('custom styles should have file paths, built-in styles should not', () => {
    const styles = getAvailableOutputStyles()

    styles.forEach((style) => {
      if (style.isCustom) {
        expect(style.filePath).toBeDefined()
        expect(style.filePath).toMatch(/\.md$/)
      }
      else {
        expect(style.filePath).toBeUndefined()
      }
    })
  })
})
