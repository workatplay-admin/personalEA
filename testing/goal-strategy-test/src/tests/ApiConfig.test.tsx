import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ApiConfig from '../components/ApiConfig'
import { setApiConfig, getApiConfig, clearApiConfig } from '../services/api'

// Mock fetch
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('ApiConfig Component', () => {
  const mockOnConfigured = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    clearApiConfig()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should display API key input form when not configured', () => {
      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      expect(screen.getByText('OpenAI API Key Required')).toBeInTheDocument()
      expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument()
      expect(screen.getByText('Configure API')).toBeInTheDocument()
    })

    it('should load saved API key from localStorage', async () => {
      const savedKey = 'sk-test-saved-key-123456789'
      localStorageMock.getItem.mockReturnValue(savedKey)
      
      // Mock successful JWT token generation
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { token: 'test-jwt-token' } 
        })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      await waitFor(() => {
        const input = screen.getByLabelText('OpenAI API Key') as HTMLInputElement
        expect(input.value).toBe(savedKey)
      })
    })
  })

  describe('Environment Configuration', () => {
    it('should check backend environment configuration on mount', async () => {
      // Mock environment check response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            environmentConfigured: true,
            message: 'Backend OpenAI API key is configured'
          } 
        })
      })
      
      // Mock JWT token generation
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { token: 'test-jwt-token' } 
        })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/config/environment')
        )
      })
    })

    it('should auto-configure when backend environment is configured', async () => {
      // Mock environment check response
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { 
            environmentConfigured: true,
            message: 'Backend OpenAI API key is configured'
          } 
        })
      })
      
      // Mock JWT token generation
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { token: 'test-jwt-token' } 
        })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      await waitFor(() => {
        expect(screen.getByText('API Configuration Set')).toBeInTheDocument()
        expect(screen.getByText('Continue')).toBeInTheDocument()
      })
      
      // Verify API configuration was set
      const config = getApiConfig()
      expect(config).toEqual({
        jwtToken: 'test-jwt-token',
        openaiApiKey: 'ENVIRONMENT_CONFIGURED'
      })
    })
  })

  describe('API Key Validation', () => {
    it('should validate API key format', async () => {
      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      const input = screen.getByLabelText('OpenAI API Key')
      const configureButton = screen.getByText('Configure API')
      
      // Test invalid key
      fireEvent.change(input, { target: { value: 'invalid-key' } })
      fireEvent.click(configureButton)
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Invalid OpenAI API key format. Keys should start with "sk-" and be at least 20 characters long.'
        )
      })
    })

    it('should accept valid API key format', async () => {
      // Mock JWT token generation
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { token: 'test-jwt-token' } 
        })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      const input = screen.getByLabelText('OpenAI API Key')
      const configureButton = screen.getByText('Configure API')
      
      // Test valid key
      const validKey = 'sk-test-valid-key-with-sufficient-length'
      fireEvent.change(input, { target: { value: validKey } })
      fireEvent.click(configureButton)
      
      await waitFor(() => {
        expect(screen.getByText('API Configuration Set')).toBeInTheDocument()
      })
      
      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'goal-strategy-openai-key',
        validKey
      )
      
      // Verify API configuration was set
      const config = getApiConfig()
      expect(config).toEqual({
        jwtToken: 'test-jwt-token',
        openaiApiKey: validKey
      })
    })
  })

  describe('JWT Token Generation', () => {
    it('should generate JWT token when configuring API', async () => {
      // Mock JWT token generation
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { token: 'generated-jwt-token' } 
        })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      const input = screen.getByLabelText('OpenAI API Key')
      const configureButton = screen.getByText('Configure API')
      
      fireEvent.change(input, { target: { value: 'sk-test-key-with-sufficient-length' } })
      fireEvent.click(configureButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/auth/test-token')
        )
      })
    })

    it('should handle JWT token generation failure', async () => {
      // Mock JWT token generation failure
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      const input = screen.getByLabelText('OpenAI API Key')
      const configureButton = screen.getByText('Configure API')
      
      fireEvent.change(input, { target: { value: 'sk-test-key-with-sufficient-length' } })
      fireEvent.click(configureButton)
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to configure API. Please try again.')
      })
    })
  })

  describe('Configuration Actions', () => {
    it('should handle Continue button when configured', async () => {
      // Set up configured state
      setApiConfig({
        jwtToken: 'test-jwt-token',
        openaiApiKey: 'sk-test-key'
      })

      // Mock environment check
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      // Wait for component to detect configuration
      await waitFor(() => {
        expect(screen.getByText('API Configuration Set')).toBeInTheDocument()
      })
      
      const continueButton = screen.getByText('Continue')
      fireEvent.click(continueButton)
      
      expect(mockOnConfigured).toHaveBeenCalled()
    })

    it('should handle Reconfigure button', async () => {
      // Set up configured state
      setApiConfig({
        jwtToken: 'test-jwt-token',
        openaiApiKey: 'sk-test-key'
      })

      // Mock environment check
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      await waitFor(() => {
        expect(screen.getByText('API Configuration Set')).toBeInTheDocument()
      })
      
      const reconfigureButton = screen.getByText('Reconfigure')
      fireEvent.click(reconfigureButton)
      
      await waitFor(() => {
        expect(screen.getByText('OpenAI API Key Required')).toBeInTheDocument()
      })
    })

    it('should handle Clear button', async () => {
      // Set up configured state
      setApiConfig({
        jwtToken: 'test-jwt-token',
        openaiApiKey: 'sk-test-key'
      })

      // Mock environment check
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      await waitFor(() => {
        expect(screen.getByText('API Configuration Set')).toBeInTheDocument()
      })
      
      const clearButton = screen.getByText('Clear')
      fireEvent.click(clearButton)
      
      await waitFor(() => {
        expect(screen.getByText('OpenAI API Key Required')).toBeInTheDocument()
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('goal-strategy-openai-key')
      })
    })
  })

  describe('Show/Hide API Key', () => {
    it('should toggle API key visibility', () => {
      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      const input = screen.getByLabelText('OpenAI API Key') as HTMLInputElement
      const checkbox = screen.getByLabelText('Show API key in plain text')
      
      // Initially password type
      expect(input.type).toBe('password')
      
      // Click to show
      fireEvent.click(checkbox)
      expect(input.type).toBe('text')
      
      // Click to hide
      fireEvent.click(checkbox)
      expect(input.type).toBe('password')
    })
  })

  describe('Codespaces URL Detection', () => {
    it('should detect Codespaces environment and use correct URL', async () => {
      // Mock Codespaces environment
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'test-5174.app.github.dev'
        },
        writable: true
      })

      // Mock JWT token generation with Codespaces URL
      ;(global.fetch as any).mockImplementationOnce((url: string) => {
        expect(url).toContain('test-8085.app.github.dev')
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { token: 'codespaces-jwt-token' } 
          })
        })
      })

      render(<ApiConfig onConfigured={mockOnConfigured} />)
      
      const input = screen.getByLabelText('OpenAI API Key')
      const configureButton = screen.getByText('Configure API')
      
      fireEvent.change(input, { target: { value: 'sk-test-codespaces-key-12345' } })
      fireEvent.click(configureButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })
})