import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Setup MSW server for API mocking
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// Custom matchers for better assertions
expect.extend({
  toBeValidSMARTGoal(received) {
    const pass = 
      received &&
      typeof received === 'object' &&
      received.id &&
      received.title &&
      received.criteria &&
      received.criteria.specific &&
      received.criteria.measurable &&
      received.criteria.achievable &&
      received.criteria.relevant &&
      received.criteria.timeBound &&
      typeof received.confidence === 'number' &&
      received.confidence >= 0 &&
      received.confidence <= 1

    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a valid SMART goal`
          : `Expected ${JSON.stringify(received)} to be a valid SMART goal with all required fields`
    }
  },

  toBeValidMilestone(received) {
    const pass = 
      received &&
      typeof received === 'object' &&
      received.id &&
      received.goalId &&
      received.title &&
      received.description &&
      received.targetDate &&
      Array.isArray(received.successCriteria) &&
      Array.isArray(received.dependencies) &&
      typeof received.progress === 'number' &&
      ['not_started', 'in_progress', 'completed', 'blocked'].includes(received.status)

    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a valid milestone`
          : `Expected ${JSON.stringify(received)} to be a valid milestone with all required fields`
    }
  },

  toBeValidWBSTask(received) {
    const pass = 
      received &&
      typeof received === 'object' &&
      received.id &&
      received.milestoneId &&
      received.title &&
      received.description &&
      received.completionCriteria &&
      typeof received.estimatedHours === 'number' &&
      ['low', 'medium', 'high', 'critical'].includes(received.priority) &&
      Array.isArray(received.dependencies) &&
      ['not_started', 'in_progress', 'completed', 'blocked'].includes(received.status) &&
      typeof received.level === 'number' &&
      typeof received.order === 'number'

    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a valid WBS task`
          : `Expected ${JSON.stringify(received)} to be a valid WBS task with all required fields`
    }
  },

  toBeValidTaskEstimation(received) {
    const pass = 
      received &&
      typeof received === 'object' &&
      received.taskId &&
      received.expertJudgment &&
      received.analogyBased &&
      received.threePoint &&
      received.parametric &&
      received.bottomUp &&
      received.finalEstimate &&
      typeof received.finalEstimate.hours === 'number' &&
      typeof received.finalEstimate.confidence === 'number' &&
      received.finalEstimate.uncertaintyRange &&
      typeof received.finalEstimate.uncertaintyRange.min === 'number' &&
      typeof received.finalEstimate.uncertaintyRange.max === 'number'

    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${JSON.stringify(received)} not to be a valid task estimation`
          : `Expected ${JSON.stringify(received)} to be a valid task estimation with all required fields`
    }
  }
})

// Global test configuration
global.console = {
  ...console,
  // Silence console during tests unless explicitly needed
  log: process.env.VITEST_VERBOSE ? console.log : () => {},
  debug: process.env.VITEST_VERBOSE ? console.debug : () => {},
  info: process.env.VITEST_VERBOSE ? console.info : () => {},
  warn: console.warn,
  error: console.error,
}

// Mock window.location for browser environment tests
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:5174',
    origin: 'http://localhost:5174',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
})

// Mock fetch for browser environment
global.fetch = global.fetch || (() => Promise.resolve({
  json: () => Promise.resolve({}),
  ok: true,
  status: 200,
  statusText: 'OK'
}) as any)

// Set up environment variables for testing
process.env.NODE_ENV = 'test'
process.env.VITE_API_BASE_URL = 'http://localhost:3000/api/v1'