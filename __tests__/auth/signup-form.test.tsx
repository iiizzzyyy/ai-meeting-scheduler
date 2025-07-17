import { render, screen, fireEvent, waitFor } from '../setup/test-utils'
import { SignUpForm } from '@/components/auth/signup-form'
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
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
})

describe('SignUpForm', () => {
  it('renders all form elements correctly', () => {
    render(<SignUpForm />)
    
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
  })

  it('shows validation error for empty fields', async () => {
    render(<SignUpForm />)
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument()
    })

    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email', async () => {
    render(<SignUpForm />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('shows validation error for password mismatch', async () => {
    render(<SignUpForm />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('shows validation error for short password', async () => {
    render(<SignUpForm />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'short' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters long/i)).toBeInTheDocument()
    })

    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('displays password strength indicator', () => {
    render(<SignUpForm />)
    
    const passwordInput = screen.getByLabelText('Password')
    
    // Weak password
    fireEvent.change(passwordInput, { target: { value: 'weak' } })
    expect(screen.getByText(/weak/i)).toBeInTheDocument()
    
    // Medium password
    fireEvent.change(passwordInput, { target: { value: 'medium123' } })
    expect(screen.getByText(/medium/i)).toBeInTheDocument()
    
    // Strong password
    fireEvent.change(passwordInput, { target: { value: 'Strong123!@#' } })
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })

  it('handles successful sign up', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      error: null,
    })

    render(<SignUpForm />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
          },
        },
      })
    })

    expect(screen.getByText(/check your email for a confirmation link/i)).toBeInTheDocument()
  })

  it('handles sign up error', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      error: { message: 'Email already exists' },
    })

    render(<SignUpForm />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })
  })

  it('toggles password visibility', () => {
    render(<SignUpForm />)
    
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement
    const toggleButtons = screen.getAllByRole('button', { name: '' }) // Eye icon buttons
    
    expect(passwordInput.type).toBe('password')
    expect(confirmPasswordInput.type).toBe('password')
    
    // Toggle password visibility
    fireEvent.click(toggleButtons[0])
    expect(passwordInput.type).toBe('text')
    
    // Toggle confirm password visibility
    fireEvent.click(toggleButtons[1])
    expect(confirmPasswordInput.type).toBe('text')
  })

  it('handles OAuth sign up', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValueOnce({
      error: null,
    })

    render(<SignUpForm />)
    
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

  it('shows loading state during sign up', async () => {
    mockSupabase.auth.signUp.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<SignUpForm />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    expect(screen.getByText(/creating account.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
    
    await waitFor(() => {
      expect(screen.getByText(/create account/i)).toBeInTheDocument()
    })
  })

  it('displays terms and privacy policy links', () => {
    render(<SignUpForm />)
    
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument()
  })

  it('displays sign in link', () => {
    render(<SignUpForm />)
    
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })
})
