import { useState, useRef, type ReactNode, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'

const CHECKIN_PIN = import.meta.env.VITE_CHECKIN_PIN ?? ''
const SESSION_KEY = 'estela_pin_auth'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

function isSessionValid(): boolean {
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (!stored) return false
  const expiry = Number(stored)
  if (Number.isNaN(expiry) || Date.now() > expiry) {
    sessionStorage.removeItem(SESSION_KEY)
    return false
  }
  return true
}

interface PinGateProps {
  readonly children: ReactNode
}

export function PinGate({ children }: PinGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(isSessionValid)
  const [pin, setPin] = useState(['', '', '', ''])
  const [pinError, setPinError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function handlePinChange(index: number, value: string) {
    if (value.length > 1) return

    const digit = value.replace(/\D/, '')
    const next = pin.map((d, i) => (i === index ? digit : d))
    setPin(next)
    setPinError(null)

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePinKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePinSubmit(e: FormEvent) {
    e.preventDefault()
    const entered = pin.join('')

    if (entered.length < 4) {
      setPinError('Enter all 4 digits')
      return
    }

    if (entered === CHECKIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_TTL_MS))
      setIsAuthenticated(true)
    } else {
      setPinError('Incorrect PIN. Try again.')
      setPin(['', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
        <img
          src="/estela-logo.svg"
          alt="Estela"
          className="h-12 object-contain mx-auto mb-6"
        />
        <h1 className="text-xl font-semibold text-estela mb-2">
          Operator Access
        </h1>
        <p className="text-sm text-text-light mb-6">
          Enter PIN to continue
        </p>

        <form onSubmit={handlePinSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(i, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                className={`
                  w-14 h-14 text-center text-2xl font-semibold rounded-lg border bg-white
                  focus:outline-none focus:ring-2 focus:ring-estela
                  ${pinError ? 'border-danger' : 'border-surface-dark'}
                `.trim()}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-sm text-danger">{pinError}</p>
          )}

          <Button
            type="submit"
            fullWidth
            className="!bg-estela hover:!bg-estela-light"
          >
            Enter
          </Button>
        </form>
      </div>
    </div>
  )
}
