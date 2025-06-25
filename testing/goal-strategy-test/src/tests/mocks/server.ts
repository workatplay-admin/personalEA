import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup mock server with handlers
export const server = setupServer(...handlers)

// Export for use in tests
export { handlers } from './handlers'