import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { PinGate } from '@/components/events/PinGate'
import { supabase } from '@/config/supabase'

const QR_SCANNER_ID = 'qr-scanner'
const LOCAL_STORAGE_KEY = 'estela_checkin_event'

const EVENT_OPTIONS = [
  { value: 'colazione_29', label: 'Breakfast 29/04' },
  { value: 'colazione_30', label: 'Breakfast 30/04' },
  { value: 'colazione_01', label: 'Breakfast 01/05' },
  { value: 'sunset_29', label: 'Sunset 29/04' },
  { value: 'sunset_30', label: 'Sunset 30/04' },
] as const

const EVENT_MAP: Record<string, { type: string; day: string; regField: string }> = {
  colazione_29: { type: 'colazione', day: '2025-04-29', regField: 'colazione_29' },
  colazione_30: { type: 'colazione', day: '2025-04-30', regField: 'colazione_30' },
  colazione_01: { type: 'colazione', day: '2025-05-01', regField: 'colazione_01' },
  sunset_29:    { type: 'sunset',    day: '2025-04-29', regField: 'sunset_29' },
  sunset_30:    { type: 'sunset',    day: '2025-04-30', regField: 'sunset_30' },
}

type AttendeeStatus = 'pending' | 'checked_in' | 'checked_out'

const STATUS_FILTERS: readonly { value: AttendeeStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'checked_out', label: 'Checked out' },
]

interface Registration {
  readonly id: string
  readonly nome: string
  readonly cognome: string
  readonly email: string
  readonly telefono: string | null
  readonly azienda: string | null
  readonly ruolo: string | null
  readonly provenienza: string | null
  readonly colazione_29: boolean
  readonly colazione_30: boolean
  readonly colazione_01: boolean
  readonly sunset_29: boolean
  readonly sunset_30: boolean
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

function getInitialEvent(): string {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (stored && EVENT_MAP[stored]) return stored
  return EVENT_OPTIONS[0].value
}

export function CheckinPage() {
  return (
    <PinGate>
      <CheckinDashboard />
    </PinGate>
  )
}

function CheckinDashboard() {
  const [selectedEvent, setSelectedEvent] = useState(getInitialEvent)

  // Persist selected event
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, selectedEvent)
  }, [selectedEvent])

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)
  const [statusFilter, setStatusFilter] = useState<AttendeeStatus | 'all'>('all')

  // Attendee data
  const [allRegistrations, setAllRegistrations] = useState<readonly Registration[]>([])
  const [checkinMap, setCheckinMap] = useState<Record<string, { checked_out_at: string | null }>>({})
  const [listLoading, setListLoading] = useState(true)

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  // QR Scanner modal
  const [scannerModalOpen, setScannerModalOpen] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'already' | 'error'; name?: string } | null>(null)
  const scannerRef = useRef<unknown>(null)

  const currentEvent = EVENT_MAP[selectedEvent]

  // --- Derive attendee status ---
  function getStatus(registrationId: string): AttendeeStatus {
    const checkin = checkinMap[registrationId]
    if (!checkin) return 'pending'
    if (checkin.checked_out_at) return 'checked_out'
    return 'checked_in'
  }

  // --- Stats ---
  const stats = allRegistrations.reduce(
    (acc, r) => {
      const status = getStatus(r.id)
      return {
        ...acc,
        [status]: acc[status] + 1,
      }
    },
    { pending: 0, checked_in: 0, checked_out: 0 } as Record<AttendeeStatus, number>,
  )

  // --- Fetch attendee list + checkins ---
  const fetchAttendeeList = useCallback(async () => {
    const ev = EVENT_MAP[selectedEvent]
    if (!ev) return

    setListLoading(true)
    try {
      const [regsResult, checkinsResult] = await Promise.all([
        supabase
          .from('registrations')
          .select('id, nome, cognome, email, telefono, azienda, ruolo, provenienza, colazione_29, colazione_30, colazione_01, sunset_29, sunset_30')
          .eq(ev.regField, true)
          .order('cognome', { ascending: true }),
        supabase
          .from('checkins')
          .select('registration_id, checked_out_at')
          .eq('event_type', ev.type)
          .eq('event_day', ev.day),
      ])

      setAllRegistrations((regsResult.data ?? []) as readonly Registration[])

      const map: Record<string, { checked_out_at: string | null }> = {}
      for (const c of (checkinsResult.data ?? []) as { registration_id: string; checked_out_at: string | null }[]) {
        map[c.registration_id] = { checked_out_at: c.checked_out_at }
      }
      setCheckinMap(map)
    } catch {
      setAllRegistrations([])
      setCheckinMap({})
    } finally {
      setListLoading(false)
    }
  }, [selectedEvent])

  useEffect(() => {
    fetchAttendeeList()
  }, [fetchAttendeeList])

  // Reset on event change
  useEffect(() => {
    setActionLoading({})
    setScanResult(null)
  }, [selectedEvent])

  // --- Filter & search attendees ---
  const filteredAttendees = allRegistrations.filter((r) => {
    // Status filter
    if (statusFilter !== 'all' && getStatus(r.id) !== statusFilter) return false

    // Search filter
    if (debouncedQuery.length >= 2) {
      const q = debouncedQuery.toLowerCase()
      const searchable = [r.nome, r.cognome, r.email, r.azienda].filter(Boolean).join(' ').toLowerCase()
      if (!searchable.includes(q)) return false
    }

    return true
  })

  // --- Check-in handler ---
  async function handleCheckin(registrationId: string) {
    if (!currentEvent) return

    setActionLoading((prev) => ({ ...prev, [registrationId]: true }))
    try {
      // Check existing
      const { count } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('registration_id', registrationId)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (count && count > 0) return

      const { error } = await supabase
        .from('checkins')
        .insert({
          registration_id: registrationId,
          event_type: currentEvent.type,
          event_day: currentEvent.day,
        })

      if (error) throw new Error(error.message)

      setCheckinMap((prev) => ({
        ...prev,
        [registrationId]: { checked_out_at: null },
      }))
    } catch {
      // silent
    } finally {
      setActionLoading((prev) => ({ ...prev, [registrationId]: false }))
    }
  }

  // --- Checkout handler ---
  async function handleCheckout(registrationId: string) {
    if (!currentEvent) return

    setActionLoading((prev) => ({ ...prev, [registrationId]: true }))
    try {
      const { error } = await supabase
        .from('checkins')
        .update({ checked_out_at: new Date().toISOString() })
        .eq('registration_id', registrationId)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (error) throw new Error(error.message)

      setCheckinMap((prev) => ({
        ...prev,
        [registrationId]: { checked_out_at: new Date().toISOString() },
      }))
    } catch {
      // silent
    } finally {
      setActionLoading((prev) => ({ ...prev, [registrationId]: false }))
    }
  }

  // --- Undo check-in (delete record) ---
  async function handleUndoCheckin(registrationId: string) {
    if (!currentEvent) return

    setActionLoading((prev) => ({ ...prev, [registrationId]: true }))
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('registration_id', registrationId)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (error) throw new Error(error.message)

      setCheckinMap((prev) => {
        const next = { ...prev }
        delete next[registrationId]
        return next
      })
    } catch {
      // silent
    } finally {
      setActionLoading((prev) => ({ ...prev, [registrationId]: false }))
    }
  }

  // --- Undo checkout (clear checked_out_at) ---
  async function handleUndoCheckout(registrationId: string) {
    if (!currentEvent) return

    setActionLoading((prev) => ({ ...prev, [registrationId]: true }))
    try {
      const { error } = await supabase
        .from('checkins')
        .update({ checked_out_at: null })
        .eq('registration_id', registrationId)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (error) throw new Error(error.message)

      setCheckinMap((prev) => ({
        ...prev,
        [registrationId]: { checked_out_at: null },
      }))
    } catch {
      // silent
    } finally {
      setActionLoading((prev) => ({ ...prev, [registrationId]: false }))
    }
  }

  // --- QR Scanner ---
  useEffect(() => {
    if (!scannerModalOpen) return

    setScannerActive(true)
    let cancelled = false

    async function initScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (cancelled) return

        const el = document.getElementById(QR_SCANNER_ID)
        if (!el) return

        const scanner = new Html5Qrcode(QR_SCANNER_ID)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          (decodedText) => {
            scanner.stop().catch(() => {})
            handleQrScan(decodedText)
          },
          () => {},
        )
      } catch {
        // Camera unavailable
      }
    }

    initScanner()

    return () => {
      cancelled = true
      const scanner = scannerRef.current as { stop?: () => Promise<void>; clear?: () => void; isScanning?: boolean } | null
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop?.().then(() => {
            try { scanner.clear?.() } catch { /* already cleared */ }
          }).catch(() => {})
        } else {
          try { scanner.clear?.() } catch { /* already cleared */ }
        }
        scannerRef.current = null
      }
      setScannerActive(false)
    }
  }, [scannerModalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleQrScan(qrToken: string) {
    setScannerActive(false)

    try {
      // Look up registration
      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .select('id, nome, cognome')
        .eq('qr_token', qrToken)
        .single()

      if (regError || !reg) {
        setScanResult({ type: 'error' })
        return
      }

      const name = `${(reg as { nome: string }).nome} ${(reg as { cognome: string }).cognome}`

      // Check existing checkin
      const { count } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('registration_id', (reg as { id: string }).id)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (count && count > 0) {
        setScanResult({ type: 'already', name })
        return
      }

      // Insert checkin
      const { error: insertError } = await supabase
        .from('checkins')
        .insert({
          registration_id: (reg as { id: string }).id,
          event_type: currentEvent.type,
          event_day: currentEvent.day,
        })

      if (insertError) throw new Error(insertError.message)

      setCheckinMap((prev) => ({
        ...prev,
        [(reg as { id: string }).id]: { checked_out_at: null },
      }))

      setScanResult({ type: 'success', name })
    } catch {
      setScanResult({ type: 'error' })
    }
  }

  function closeScannerModal() {
    setScannerModalOpen(false)
    setScanResult(null)
  }

  // --- Layout ---
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-surface-dark px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <img
            src="/estela-logo.svg"
            alt="Estela"
            className="h-8 object-contain hidden sm:block"
          />

          <div className="flex-1 max-w-xs">
            <Select
              options={[...EVENT_OPTIONS]}
              value={selectedEvent}
              onChange={setSelectedEvent}
              placeholder="Select event"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-text-light">{allRegistrations.length} registered</span>
              <span className="text-success font-medium">{stats.checked_in} in</span>
              {stats.checked_out > 0 && (
                <span className="text-warning font-medium">{stats.checked_out} out</span>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => setScannerModalOpen(true)}
            >
              <span className="flex items-center gap-2">
                <QrIcon />
                Scan QR
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Search + Filters */}
      <div className="bg-white border-b border-surface-dark px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or company..."
            />
          </div>
          <div className="flex rounded-lg border border-surface-dark overflow-hidden text-sm shrink-0">
            {STATUS_FILTERS.map(({ value, label }) => {
              const isActive = statusFilter === value
              const count = value === 'all'
                ? allRegistrations.length
                : value === 'pending' ? stats.pending
                : value === 'checked_in' ? stats.checked_in
                : stats.checked_out
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-2 font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-estela text-white'
                      : 'bg-white text-text-light hover:bg-surface'
                  }`}
                >
                  {label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Attendee Table */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-dark overflow-hidden">
          {listLoading ? (
            <div className="flex justify-center py-16">
              <span className="animate-spin rounded-full h-8 w-8 border-2 border-estela border-t-transparent" />
            </div>
          ) : filteredAttendees.length === 0 ? (
            <p className="text-sm text-text-light text-center py-16">
              {debouncedQuery.length >= 2
                ? `No results for "${debouncedQuery}"`
                : statusFilter !== 'all'
                  ? `No ${statusFilter.replace('_', ' ')} attendees`
                  : 'No registrations for this event'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-text-light">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Company / Yacht</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Phone</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((reg) => {
                    const status = getStatus(reg.id)
                    const loading = actionLoading[reg.id] ?? false

                    return (
                      <tr
                        key={reg.id}
                        className="border-t border-surface hover:bg-surface/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-text">{reg.nome} {reg.cognome}</p>
                          {reg.ruolo && (
                            <p className="text-xs text-text-light">{reg.ruolo}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-light hidden sm:table-cell">
                          {reg.azienda ?? '\u2014'}
                        </td>
                        <td className="px-4 py-3 text-text-light hidden md:table-cell">
                          {reg.email}
                        </td>
                        <td className="px-4 py-3 text-text-light hidden lg:table-cell">
                          {reg.telefono ?? '\u2014'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <ActionButtons
                            status={status}
                            loading={loading}
                            onCheckin={() => handleCheckin(reg.id)}
                            onCheckout={() => handleCheckout(reg.id)}
                            onUndoCheckin={() => handleUndoCheckin(reg.id)}
                            onUndoCheckout={() => handleUndoCheckout(reg.id)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center">
        <p className="text-sm text-supasailing">
          <a href="https://supasailing.com" target="_blank" rel="noopener noreferrer">
            Powered by SupaSailing
          </a>
        </p>
      </footer>

      {/* QR Scanner Modal */}
      <Modal
        isOpen={scannerModalOpen}
        onClose={closeScannerModal}
        title="QR Scanner"
      >
        {scannerActive && (
          <div
            id={QR_SCANNER_ID}
            className="w-full rounded-lg overflow-hidden bg-black min-h-[300px]"
          />
        )}

        {!scannerActive && !scanResult && (
          <div className="flex justify-center py-8">
            <span className="animate-spin rounded-full h-8 w-8 border-2 border-estela border-t-transparent" />
          </div>
        )}

        {scanResult?.type === 'success' && (
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <span className="text-3xl text-success">&#10003;</span>
            </div>
            <p className="text-lg font-semibold text-success">Check-in successful</p>
            {scanResult.name && <p className="text-sm text-text-light">{scanResult.name}</p>}
            <Button variant="secondary" size="sm" onClick={closeScannerModal}>
              Close
            </Button>
          </div>
        )}

        {scanResult?.type === 'already' && (
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
              <span className="text-3xl text-warning">!</span>
            </div>
            <p className="text-lg font-semibold text-warning">Already checked in</p>
            {scanResult.name && <p className="text-sm text-text-light">{scanResult.name}</p>}
            <Button variant="secondary" size="sm" onClick={closeScannerModal}>
              Close
            </Button>
          </div>
        )}

        {scanResult?.type === 'error' && (
          <div className="flex flex-col items-center text-center py-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
              <span className="text-3xl text-danger">&times;</span>
            </div>
            <p className="text-lg font-semibold text-danger">QR code not recognised</p>
            <Button variant="secondary" size="sm" onClick={closeScannerModal}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

// --- Sub-components ---

function StatusBadge({ status }: { readonly status: AttendeeStatus }) {
  const styles: Record<AttendeeStatus, string> = {
    pending: 'bg-surface text-text-light',
    checked_in: 'bg-success/10 text-success',
    checked_out: 'bg-warning/10 text-warning',
  }

  const labels: Record<AttendeeStatus, string> = {
    pending: 'Pending',
    checked_in: 'Checked in',
    checked_out: 'Checked out',
  }

  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function ActionButtons({
  status,
  loading,
  onCheckin,
  onCheckout,
  onUndoCheckin,
  onUndoCheckout,
}: {
  readonly status: AttendeeStatus
  readonly loading: boolean
  readonly onCheckin: () => void
  readonly onCheckout: () => void
  readonly onUndoCheckin: () => void
  readonly onUndoCheckout: () => void
}) {
  if (status === 'pending') {
    return (
      <Button size="sm" variant="success" isLoading={loading} onClick={onCheckin}>
        Check-in
      </Button>
    )
  }

  if (status === 'checked_in') {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" isLoading={loading} onClick={onCheckout}>
          Check-out
        </Button>
        <button
          type="button"
          disabled={loading}
          onClick={onUndoCheckin}
          className="text-xs text-danger hover:text-danger/80 px-2 py-1 rounded hover:bg-danger/5 disabled:opacity-50"
        >
          Undo
        </button>
      </div>
    )
  }

  // checked_out
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onUndoCheckout}
      className="text-xs font-medium text-warning hover:text-warning/80 px-2 py-1 rounded hover:bg-warning/5 disabled:opacity-50"
    >
      {loading ? 'Undoing...' : 'Undo checkout'}
    </button>
  )
}

function QrIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 17h4v4h-4zM14 14h3v3h-3z" />
    </svg>
  )
}
