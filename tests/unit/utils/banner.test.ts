import { beforeEach, describe, expect, it, vi } from 'vitest'
import { displayBanner, displayBannerWithInfo } from '../../../src/utils/banner'

describe('banner utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('displayBanner', () => {
    it('should display banner', () => {
      displayBanner()
      expect(console.log).toHaveBeenCalled()
    })

    it('should display banner content', () => {
      displayBanner()
      // Check that ASCII art is displayed (contains box drawing characters)
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('╔'))
    })

    it('should display Zero-Config Code Flow', () => {
      displayBanner()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Zero-Config Code Flow'),
      )
    })

    it('should display custom subtitle', () => {
      displayBanner('Custom subtitle')
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Custom subtitle'),
      )
    })
  })

  describe('displayBannerWithInfo', () => {
    it('should display banner with version info', () => {
      displayBannerWithInfo()
      expect(console.log).toHaveBeenCalledTimes(2)
    })

    it('should display version', () => {
      displayBannerWithInfo()
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Version:'),
      )
    })
  })
})
