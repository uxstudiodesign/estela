import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/config/supabase'

const EVENT_LABELS: Record<string, string> = {
  colazione_29: 'Breakfast Seminar — 29 April',
  colazione_30: 'Breakfast Seminar — 30 April',
  colazione_01: 'Breakfast Seminar — 1 May',
  sunset_29: 'Sunset Cocktail — 29 April',
  sunset_30: 'Sunset Cocktail — 30 April',
}

interface Registration {
  readonly nome: string
  readonly cognome: string
  readonly colazione_29: boolean
  readonly colazione_30: boolean
  readonly colazione_01: boolean
  readonly sunset_29: boolean
  readonly sunset_30: boolean
}

export function ConfirmationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [registration, setRegistration] = useState<Registration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Missing token. Please check the link you received.')
      setIsLoading(false)
      return
    }

    async function fetchRegistration() {
      try {
        const { data, error: fetchError } = await supabase
          .from('registrations')
          .select('nome, cognome, colazione_29, colazione_30, colazione_01, sunset_29, sunset_30')
          .eq('qr_token', token!)
          .single()

        if (fetchError || !data) {
          throw new Error('Registration not found')
        }

        setRegistration(data as Registration)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred. Please try again later.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchRegistration()
  }, [token])

  const selectedEvents = registration
    ? Object.entries(EVENT_LABELS).filter(
        ([key]) => registration[key as keyof Registration],
      )
    : []

  return (
    <div className="min-h-screen bg-surface">
      <header className="pt-8 pb-4 flex justify-center">
        <img
          src="/estela-logo.svg"
          alt="Estela"
          className="h-16 object-contain"
        />
      </header>

      <main className="px-4 pb-12">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-md p-6 sm:p-8">
          {isLoading && (
            <div className="flex justify-center py-12">
              <span className="animate-spin rounded-full h-8 w-8 border-2 border-estela border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-danger text-lg font-medium mb-2">Error</p>
              <p className="text-text-light">{error}</p>
            </div>
          )}

          {registration && token && (
            <div className="text-center space-y-6">
              <div>
                <h1 className="text-2xl font-semibold text-estela mb-1">
                  Registration confirmed
                </h1>
                <p className="text-text-light">
                  Thank you, <span className="font-medium text-text">{registration.nome} {registration.cognome}</span>
                </p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl border border-surface-dark inline-block">
                  <QRCodeSVG
                    value={token}
                    size={220}
                    level="M"
                  />
                </div>
              </div>

              <p className="text-sm font-medium text-estela">
                Show this QR code at the entrance
              </p>

              <p className="text-xs text-text-light print:hidden">
                We recommend saving a screenshot of this page.
              </p>

              <button
                type="button"
                onClick={() => window.print()}
                className="print:hidden inline-flex items-center gap-2 px-5 py-2.5 bg-estela text-white text-sm font-medium rounded-lg hover:bg-estela/90 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Save as PDF
              </button>

              <div className="text-left bg-surface rounded-xl p-4">
                <p className="text-sm font-medium text-text mb-2">
                  Your events:
                </p>
                <ul className="space-y-1">
                  {selectedEvents.map(([key, label]) => (
                    <li key={key} className="text-sm text-text-light flex items-center gap-2">
                      <span className="text-success">&#10003;</span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="pb-8 text-center print:hidden">
        <p className="text-sm text-supasailing"><a href="https://supasailing.com" target="_blank" rel="noopener noreferrer">Powered by SupaSailing</a></p>
      </footer>
    </div>
  )
}
