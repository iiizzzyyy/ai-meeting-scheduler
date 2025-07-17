import { render, screen, fireEvent, waitFor } from '../setup/test-utils'
import { SignInForm } from '@/components/auth/signin-form'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { origin: 'http://localhost:3000' },
  writable: true,
})

const mockPush = jest.fn()
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
})

describe('SignInForm', () => {
  it('renders all form elements correctly', () => {
    render(<SignInForm />)
    
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
  })

  it('shows validation error for empty fields', async () => {
    render(<SignInForm />)
    
    const submitButton = screen.getByRole('button', { name: /^sign in$/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument()
    })

    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email', async () => {
    render(<SignInForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /^sign in$/i })
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('handles successful email/password sign in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      error: null,
    })

    render(<SignInForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /^sign in$/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('handles sign in error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
    })

    render(<SignInForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /^sign in$/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('toggles password visibility', () => {
    render(<SignInForm />)
    
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
    const toggleButton = screen.getByRole('button', { name: '' }) // Eye icon button
    
    expect(passwordInput.type).toBe('password')
    
    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('text')
    
    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('password')
  })

  it('handles OAuth sign in', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValueOnce({
      error: null,
    })

    render(<SignInForm />)
    
    const googleButton = screen.getByRole('button', { name: /google/i })
    fireEvent.click(googleButton)
    
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })
  })

  it('handles OAuth error', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValueOnce({
      error: { message: 'OAuth configuration error' },
    })

    render(<SignInForm />)
    
    const githubButton = screen.getByRole('button', { name: /github/i })
    fireEvent.click(githubButton)
    
    await waitFor(() => {
      expect(screen.getByText(/oauth configuration error/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during sign in', async () => {
    mockSupabase.auth.signInWithPassword.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<SignInForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /^sign in$/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    expect(screen.getByText(/signing in.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    await waitFor(() => {
      expect(screen.getByText(/^sign in$/i)).toBeInTheDocument()
    })
  })
})
