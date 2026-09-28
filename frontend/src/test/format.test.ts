import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, initialsOf, formatRelative } from '../lib/format';

describe('Format Utilities', () => {
  describe('formatMoney', () => {
    it('returns -- for null or undefined', () => {
      expect(formatMoney(null)).toBe('--');
      expect(formatMoney(undefined)).toBe('--');
    });

    it('formats positive numbers in INR format', () => {
      const result = formatMoney(5000);
      expect(result).toContain('5,000.00');
    });

    it('formats 0 with decimals', () => {
      const result = formatMoney(0);
      expect(result).toContain('0.00');
    });
  });

  describe('formatDate', () => {
    it('returns -- for null or undefined or empty', () => {
      expect(formatDate(null)).toBe('--');
      expect(formatDate(undefined)).toBe('--');
      expect(formatDate('')).toBe('--');
    });

    it('formats ISO date strings to dd MMM yyyy', () => {
      const res = formatDate('2026-09-28');
      expect(res).toContain('2026');
      expect(res).toContain('Sep');
    });
  });

  describe('initialsOf', () => {
    it('handles empty or null names', () => {
      expect(initialsOf('')).toBe('--');
      expect(initialsOf(null)).toBe('--');
      expect(initialsOf(undefined)).toBe('--');
    });

    it('extracts two initials from single word', () => {
      expect(initialsOf('Arun')).toBe('AR');
    });

    it('extracts first and last initials from multiple words', () => {
      expect(initialsOf('Arun Kumar')).toBe('AK');
      expect(initialsOf('Meera V. Sharma')).toBe('MS');
    });
  });

  describe('formatRelative', () => {
    it('returns empty string for null or empty input', () => {
      expect(formatRelative(null)).toBe('');
      expect(formatRelative('')).toBe('');
    });

    it('returns just now for current timestamp', () => {
      expect(formatRelative(new Date().toISOString())).toBe('just now');
    });
  });
});
