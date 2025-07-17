import React, { ReactElement } from 'react'
import { render, RenderOptions, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock Supabase user for testing
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User',
  },
  app_metadata: {
    providers: ['email'],
  },
  created_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
}

// Mock session for testing
export const mockSession = {
  user: mockUser,
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 3600000,
  expires_in: 3600,
  token_type: 'bearer',
}

// Test wrapper component
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render, screen, fireEvent, waitFor }

// Helper functions for common test scenarios
export const fillForm = (fields: Record<string, string>) => {
  Object.entries(fields).forEach(([label, value]) => {
    const input = document.querySelector(`input[name="${label}"]`) as HTMLInputElement
    if (input) {
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
}

export const clickButton = (buttonText: string) => {
  const button = document.querySelector(`button:contains("${buttonText}")`) as HTMLButtonElement
  if (button) {
    button.click()
  }
}

// Mock authentication responses
export const mockAuthResponses = {
  signInSuccess: {
    data: { user: mockUser, session: mockSession },
    error: null,
  },
  signInError: {
    data: { user: null, session: null },
    error: { message: 'Invalid credentials' },
  },
  signUpSuccess: {
    data: { user: mockUser, session: null },
    error: null,
  },
  signUpError: {
    data: { user: null, session: null },
    error: { message: 'Email already exists' },
  },
  oAuthSuccess: {
    data: { provider: 'google', url: 'https://oauth.url' },
    error: null,
  },
  oAuthError: {
    data: null,
    error: { message: 'OAuth configuration error' },
  },
}

// Helper to wait for async operations
export const waitForAsyncOperation = () => new Promise(resolve => setTimeout(resolve, 0))
