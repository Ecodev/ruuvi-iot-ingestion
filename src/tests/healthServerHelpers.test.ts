import { describe, it, expect } from 'vitest';

// Reimplementation of healthServer's pure helpers to test them without starting Fastify
function normalizeMac(mac?: string): string | undefined {
  if (!mac) return undefined;
  return mac.toUpperCase().replace(/[^A-F0-9]/g, '');
}
function normalizeMacMap(macMap: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [mac, name] of Object.entries(macMap)) {
    const key = normalizeMac(mac);
    if (!key) continue;
    normalized[key] = name;
  }
  return normalized;
}
describe('normalizeMac', () => {
  it('should strip colons and uppercase', () => {
    expect(normalizeMac('f3:2d:ef:e7:2e:78')).toBe('F32DEFE72E78');
  });

  it('should handle already normalized MAC', () => {
    expect(normalizeMac('F32DEFE72E78')).toBe('F32DEFE72E78');
  });

  it('should handle MAC with dashes', () => {
    expect(normalizeMac('F3-2D-EF-E7-2E-78')).toBe('F32DEFE72E78');
  });

  it('should return undefined for undefined input', () => {
    expect(normalizeMac(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(normalizeMac('')).toBeUndefined();
  });
});

describe('normalizeMacMap', () => {
  it('should normalize MAC keys', () => {
    const result = normalizeMacMap({ 'F3:2D:EF:E7:2E:78': 'Station 1' });
    expect(result['F32DEFE72E78']).toBe('Station 1');
  });

  it('should handle multiple entries', () => {
    const result = normalizeMacMap({
      'F3:2D:EF:E7:2E:78': 'Station 1',
      'C8:25:2D:8E:9C:2C': 'Station 2',
    });
    expect(result['F32DEFE72E78']).toBe('Station 1');
    expect(result['C8252D8E9C2C']).toBe('Station 2');
  });

  it('should return empty object for empty input', () => {
    expect(normalizeMacMap({})).toEqual({});
  });
});
