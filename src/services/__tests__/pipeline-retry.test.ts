import { describe, it, expect } from 'vitest'
import {
  isRetryableError, isNonRetryableError, getRetryDelay,
  shouldRetry, MAX_RETRIES, RETRY_DELAYS,
} from '../pipeline-retry-helpers'

describe('pipeline-retry-helpers', () => {
  describe('isRetryableError', () => {
    it('returns true for network timeout errors', () => {
      expect(isRetryableError('network timeout')).toBe(true)
      expect(isRetryableError('Connection timed out')).toBe(true)
    })

    it('returns true for connection refused errors', () => {
      expect(isRetryableError('connection refused')).toBe(true)
      expect(isRetryableError('ECONNREFUSED')).toBe(true)
    })

    it('returns true for 5xx HTTP errors', () => {
      expect(isRetryableError('500 Internal Server Error')).toBe(true)
      expect(isRetryableError('502 Bad Gateway')).toBe(true)
      expect(isRetryableError('503 Service Unavailable')).toBe(true)
      expect(isRetryableError('504 Gateway Timeout')).toBe(true)
    })

    it('returns false for non-retryable errors', () => {
      expect(isRetryableError('invalid URL')).toBe(false)
      expect(isRetryableError('file not found')).toBe(false)
      expect(isRetryableError('success')).toBe(false)
    })
  })

  describe('isNonRetryableError', () => {
    it('returns true for invalid URL', () => {
      expect(isNonRetryableError('invalid URL: http://')).toBe(true)
    })

    it('returns true for file not found', () => {
      expect(isNonRetryableError('404 file not found')).toBe(true)
      expect(isNonRetryableError('Not Found')).toBe(true)
    })

    it('returns true for permission denied', () => {
      expect(isNonRetryableError('EACCES: permission denied')).toBe(true)
    })

    it('returns true for corrupt data', () => {
      expect(isNonRetryableError('corrupt archive header')).toBe(true)
    })

    it('returns false for retryable errors', () => {
      expect(isNonRetryableError('network timeout')).toBe(false)
      expect(isNonRetryableError('connection refused')).toBe(false)
    })
  })

  describe('getRetryDelay', () => {
    it('returns 5s for first retry', () => {
      expect(getRetryDelay(1)).toBe(5000)
    })

    it('returns 30s for second retry', () => {
      expect(getRetryDelay(2)).toBe(30000)
    })

    it('returns 120s for third retry', () => {
      expect(getRetryDelay(3)).toBe(120000)
    })

    it('returns last delay for retries beyond max', () => {
      expect(getRetryDelay(4)).toBe(RETRY_DELAYS[RETRY_DELAYS.length - 1])
      expect(getRetryDelay(10)).toBe(RETRY_DELAYS[RETRY_DELAYS.length - 1])
    })
  })

  describe('shouldRetry', () => {
    it('returns true for retryable error within max', () => {
      expect(shouldRetry('network timeout', 0)).toBe(true)
      expect(shouldRetry('500 error', 1)).toBe(true)
    })

    it('returns false when retry count exceeds max', () => {
      expect(shouldRetry('network timeout', MAX_RETRIES)).toBe(false)
      expect(shouldRetry('network timeout', MAX_RETRIES + 1)).toBe(false)
    })

    it('returns false for non-retryable errors', () => {
      expect(shouldRetry('invalid URL', 0)).toBe(false)
      expect(shouldRetry('file not found', 1)).toBe(false)
      expect(shouldRetry('permission denied', 2)).toBe(false)
    })

    it('returns false for unknown error types', () => {
      expect(shouldRetry('some random error', 0)).toBe(false)
    })
  })

  describe('MAX_RETRIES and RETRY_DELAYS', () => {
    it('has exactly 3 retries', () => {
      expect(MAX_RETRIES).toBe(3)
    })

    it('has exactly 3 delay values', () => {
      expect(RETRY_DELAYS).toHaveLength(3)
    })

    it('delays are in ascending order', () => {
      for (let i = 1; i < RETRY_DELAYS.length; i++) {
        expect(RETRY_DELAYS[i]!).toBeGreaterThan(RETRY_DELAYS[i - 1]!)
      }
    })
  })
})