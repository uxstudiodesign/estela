import { useState, type FormEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { loginSchema } from '@/lib/validators'
import { APP_NAME } from '@/config/constants'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function togglePassword(e: MouseEvent) {
    e.preventDefault()
    setShowPassword((prev) => !prev)
  }

  // If already logged in, redirect
  if (profile) {
    const dest = profile.role === 'admin' ? '/admin' : '/courier'
    navigate(dest, { replace: true })
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      setError(validation.error.errors[0].message)
      return
    }

    setIsSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-navy mb-2">{APP_NAME}</h1>
          <p className="text-text-light">Proof of Delivery</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-surface-dark bg-white text-text focus:outline-none focus:ring-2 focus:ring-navy"
              placeholder="you@estela.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 rounded-lg border border-surface-dark bg-white text-text focus:outline-none focus:ring-2 focus:ring-navy"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-light hover:text-text transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-danger-light/20 text-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-navy text-white font-semibold rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
