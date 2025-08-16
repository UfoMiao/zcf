import { describe, it, expect } from 'vitest';
import { compareVersions, shouldUpdate } from '../../../src/utils/version-checker';

// These functions don't have dependencies, so we can test them directly
describe('version-checker', () => {
  describe('compareVersions', () => {
    it('should compare valid versions correctly', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should handle pre-release versions', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBe(1);
    });

    it('should return -1 for invalid versions', () => {
      expect(compareVersions('invalid', '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', 'invalid')).toBe(-1);
      expect(compareVersions('invalid', 'invalid')).toBe(-1);
    });

    it('should handle patch versions', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    });

    it('should handle minor versions', () => {
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
    });
  });

  describe('shouldUpdate', () => {
    it('should return true when update needed', () => {
      expect(shouldUpdate('1.0.0', '2.0.0')).toBe(true);
      expect(shouldUpdate('1.0.0-beta', '1.0.0')).toBe(true);
      expect(shouldUpdate('0.9.0', '1.0.0')).toBe(true);
    });

    it('should return false when no update needed', () => {
      expect(shouldUpdate('2.0.0', '1.0.0')).toBe(false);
      expect(shouldUpdate('1.0.0', '1.0.0')).toBe(false);
      expect(shouldUpdate('1.1.0', '1.0.0')).toBe(false);
    });

    it('should return true for invalid versions', () => {
      expect(shouldUpdate('invalid', '1.0.0')).toBe(true);
      expect(shouldUpdate('', '1.0.0')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(shouldUpdate('1.0.0', '')).toBe(true);
      expect(shouldUpdate('', '')).toBe(true);
    });
  });

});