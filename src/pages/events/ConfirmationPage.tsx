import { useState, useEffect, useRef, useCallback } from 'react'
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

const EVENT_DATES: Record<string, { readonly date: string; readonly start: string; readonly end: string; readonly title: string }> = {
  colazione_29: { date: '20260429', start: '080000', end: '103000', title: 'Estela — Breakfast Seminar' },
  colazione_30: { date: '20260430', start: '080000', end: '103000', title: 'Estela — Breakfast Seminar' },
  colazione_01: { date: '20260501', start: '080000', end: '103000', title: 'Estela — Breakfast Seminar' },
  sunset_29:    { date: '20260429', start: '170000', end: '190000', title: 'Estela — Sunset Cocktail' },
  sunset_30:    { date: '20260430', start: '170000', end: '190000', title: 'Estela — Sunset Cocktail' },
}

function generateICS(events: ReadonlyArray<readonly [string, string]>, token: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Estela Shipping//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const [key] of events) {
    const ev = EVENT_DATES[key]
    if (!ev) continue
    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;TZID=Europe/Madrid:${ev.date}T${ev.start}`,
      `DTEND;TZID=Europe/Madrid:${ev.date}T${ev.end}`,
      `SUMMARY:${ev.title}`,
      'LOCATION:Astilleros de Mallorca\\, Palma\\, Spain',
      `DESCRIPTION:Show your QR code at the entrance.\\nConfirmation: ${window.location.origin}/events/confirmation?token=${token}`,
      `URL:${window.location.origin}/events/confirmation?token=${token}`,
      `UID:${key}-${token}@estela`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
  const qrRef = useRef<HTMLDivElement>(null)

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

  const handleAddToCalendar = useCallback(() => {
    if (!token || selectedEvents.length === 0) return
    const ics = generateICS(selectedEvents, token)
    downloadFile(ics, 'estela-events.ics', 'text/calendar')
  }, [token, selectedEvents])

  const handleDownloadQR = useCallback(() => {
    if (!qrRef.current || !registration) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const padding = 32
    canvas.width = 220 + padding * 2
    canvas.height = 220 + padding * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, padding, padding, 220, 220)
      const a = document.createElement('a')
      a.download = `estela-qr-${registration.nome.toLowerCase()}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
  }, [registration])

  return (
    <div className="min-h-screen bg-surface">
      <header className="pt-8 pb-4 flex justify-center">
        <img
          src="/estela-logo.png"
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
                <div ref={qrRef} className="bg-white p-4 rounded-xl border border-surface-dark inline-block">
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

              <div className="print:hidden space-y-3">
                <p className="text-xs text-text-light">
                  Save your QR code for quick access at the event.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-estela text-white text-sm font-medium rounded-lg hover:bg-estela-light transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add to Calendar
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-estela text-estela text-sm font-medium rounded-lg hover:bg-estela/5 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download QR
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-surface-dark text-text-light text-sm font-medium rounded-lg hover:bg-surface transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                    </svg>
                    Print
                  </button>
                </div>
              </div>

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
