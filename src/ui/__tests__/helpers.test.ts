import { describe, it, expect } from 'vitest'
import { formatBytes, formatSpeed, formatTime, formatDuration, formatDate } from '../helpers'

describe('formatBytes', () => {
  it('formats 0 bytes', () => expect(formatBytes(0)).toBe('0 B'))
  it('formats KB', () => expect(formatBytes(1024)).toBe('1.0 KB'))
  it('formats MB', () => expect(formatBytes(1048576)).toBe('1.0 MB'))
  it('formats GB', () => expect(formatBytes(1073741824)).toBe('1.0 GB'))
  it('handles negative', () => expect(formatBytes(-100)).toBe('0 B'))
  it('handles NaN', () => expect(formatBytes(NaN)).toBe('0 B'))
})

describe('formatSpeed', () => {
  it('formats 0', () => expect(formatSpeed(0)).toBe('0 B/s'))
  it('formats KB/s', () => expect(formatSpeed(1024)).toBe('1.0 KB/s'))
  it('formats MB/s', () => expect(formatSpeed(1048576)).toBe('1.0 MB/s'))
})

describe('formatTime', () => {
  it('empty for 0', () => expect(formatTime(0)).toBe(''))
  it('seconds', () => expect(formatTime(45)).toBe('45s'))
  it('minutes', () => expect(formatTime(125)).toBe('2m 5s'))
  it('hours', () => expect(formatTime(3700)).toBe('1h 1m'))
  it('handles negative', () => expect(formatTime(-10)).toBe(''))
  it('handles NaN', () => expect(formatTime(NaN)).toBe(''))
})

describe('formatDuration', () => {
  it('zero', () => expect(formatDuration(0)).toBe('0m'))
  it('minutes only', () => expect(formatDuration(300)).toBe('5m'))
  it('hours and minutes', () => expect(formatDuration(3660)).toBe('1h 1m'))
  it('handles negative', () => expect(formatDuration(-50)).toBe('0m'))
})

describe('formatDate', () => {
  it('empty for undefined', () => expect(formatDate()).toBe(''))
  it('formats date', () => expect(formatDate('2024-01-15')).toContain('2024'))
})
