import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { PinGate } from '@/components/events/PinGate'
import { supabase } from '@/config/supabase'

const QR_SCANNER_ID = 'qr-scanner'
const SCAN_RESET_MS = 3000

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

type CheckinStatus = 'success' | 'error' | 'already'

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export function CheckinPage() {
  return (
    <PinGate>
      <CheckinDashboard />
    </PinGate>
  )
}

function CheckinDashboard() {
  const [selectedEvent, setSelectedEvent] = useState(EVENT_OPTIONS[0].value)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)
  const [searchResults, setSearchResults] = useState<readonly Registration[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Check-in state
  const [checkinStatus, setCheckinStatus] = useState<Record<string, CheckinStatus>>({})
  const [checkinLoading, setCheckinLoading] = useState<Record<string, boolean>>({})
  const [presentiCount, setPresentiCount] = useState<number | null>(null)

  // Scanner state
  const [scannerActive, setScannerActive] = useState(true)
  const [scannedReg, setScannedReg] = useState<Registration | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<CheckinStatus | null>(null)
  const [scanCheckinLoading, setScanCheckinLoading] = useState(false)
  const scannerRef = useRef<unknown>(null)

  // Attendee list state
  const [allRegistrations, setAllRegistrations] = useState<readonly Registration[]>([])
  const [checkedInIds, setCheckedInIds] = useState<ReadonlySet<string>>(new Set())
  const [listLoading, setListLoading] = useState(true)
  const [listTab, setListTab] = useState<'pending' | 'done'>('pending')

  const currentEvent = EVENT_MAP[selectedEvent]

  // --- Fetch attendee list + checkins for selected event ---
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
          .select('registration_id')
          .eq('event_type', ev.type)
          .eq('event_day', ev.day),
      ])

      setAllRegistrations((regsResult.data ?? []) as readonly Registration[])

      const ids = new Set((checkinsResult.data ?? []).map((c: { registration_id: string }) => c.registration_id))
      setCheckedInIds(ids)
      setPresentiCount(ids.size)
    } catch {
      setAllRegistrations([])
      setCheckedInIds(new Set())
    } finally {
      setListLoading(false)
    }
  }, [selectedEvent])

  useEffect(() => {
    fetchAttendeeList()
  }, [fetchAttendeeList])

  const pendingAttendees = allRegistrations.filter((r) => !checkedInIds.has(r.id))
  const checkedInAttendees = allRegistrations.filter((r) => checkedInIds.has(r.id))

  // --- Search ---
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([])
      return
    }

    let cancelled = false

    async function search() {
      setIsSearching(true)
      try {
        const pattern = `%${debouncedQuery}%`
        const { data, error } = await supabase
          .from('registrations')
          .select('id, nome, cognome, email, telefono, azienda, ruolo, provenienza, colazione_29, colazione_30, colazione_01, sunset_29, sunset_30')
          .or(`nome.ilike.${pattern},cognome.ilike.${pattern},email.ilike.${pattern}`)
          .limit(20)

        if (cancelled) return

        if (error) {
          setSearchResults([])
          return
        }

        setSearchResults(data as readonly Registration[])
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }

    search()
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Reset statuses when event changes
  useEffect(() => {
    setCheckinStatus({})
    setCheckinLoading({})
    resetScan()
  }, [selectedEvent])

  // --- QR Scanner init ---
  useEffect(() => {
    if (!scannerActive) return

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
            handleScan(decodedText)
          },
          () => {},
        )
      } catch {
        // Camera unavailable — scanner panel will show idle state
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
    }
  }, [scannerActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-reset after scan result ---
  useEffect(() => {
    if (!scanStatus && !scanError) return

    const timer = setTimeout(() => {
      resetScan()
    }, SCAN_RESET_MS)

    return () => clearTimeout(timer)
  }, [scanStatus, scanError])

  function resetScan() {
    setScannedReg(null)
    setScanError(null)
    setScanStatus(null)
    setScanCheckinLoading(false)
    setScannerActive(true)
  }

  // --- QR scan handler ---
  async function handleScan(qrToken: string) {
    setScannerActive(false)
    setScanError(null)
    setScannedReg(null)
    setScanStatus(null)

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('id, nome, cognome, email, azienda, colazione_29, colazione_30, colazione_01, sunset_29, sunset_30')
        .eq('qr_token', qrToken)
        .single()

      if (error || !data) {
        setScanError('QR code not recognised')
        return
      }

      setScannedReg(data as Registration)
    } catch {
      setScanError('QR code not recognised')
    }
  }

  // --- Scanner check-in handler ---
  async function handleScanCheckin() {
    if (!scannedReg || !currentEvent) return

    setScanCheckinLoading(true)

    try {
      const { count, error: countError } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('registration_id', scannedReg.id)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (countError) throw new Error(countError.message)

      if (count && count > 0) {
        setScanStatus('already')
        return
      }

      const { error: insertError } = await supabase
        .from('checkins')
        .insert({
          registration_id: scannedReg.id,
          event_type: currentEvent.type,
          event_day: currentEvent.day,
        })

      if (insertError) throw new Error(insertError.message)

      setScanStatus('success')
      setCheckedInIds((prev) => {
        const next = new Set([...prev, scannedReg.id])
        setPresentiCount(next.size)
        return next
      })
    } catch {
      setScanStatus('error')
    } finally {
      setScanCheckinLoading(false)
    }
  }

  // --- Check-in handler (manual search) ---
  async function handleCheckin(registrationId: string) {
    if (!currentEvent) return

    setCheckinLoading((prev) => ({ ...prev, [registrationId]: true }))

    try {
      // Check for existing checkin
      const { count, error: countError } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('registration_id', registrationId)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (countError) throw new Error(countError.message)

      if (count && count > 0) {
        setCheckinStatus((prev) => ({ ...prev, [registrationId]: 'already' }))
        return
      }

      // Insert checkin
      const { error: insertError } = await supabase
        .from('checkins')
        .insert({
          registration_id: registrationId,
          event_type: currentEvent.type,
          event_day: currentEvent.day,
        })

      if (insertError) throw new Error(insertError.message)

      setCheckinStatus((prev) => ({ ...prev, [registrationId]: 'success' }))
      setCheckedInIds((prev) => {
        const next = new Set([...prev, registrationId])
        setPresentiCount(next.size)
        return next
      })
    } catch {
      setCheckinStatus((prev) => ({ ...prev, [registrationId]: 'error' }))
    } finally {
      setCheckinLoading((prev) => ({ ...prev, [registrationId]: false }))
    }
  }

  // --- Undo check-in handler ---
  const [undoLoading, setUndoLoading] = useState<Record<string, boolean>>({})

  async function handleUndoCheckin(registrationId: string) {
    if (!currentEvent) return

    setUndoLoading((prev) => ({ ...prev, [registrationId]: true }))

    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('registration_id', registrationId)
        .eq('event_type', currentEvent.type)
        .eq('event_day', currentEvent.day)

      if (error) throw new Error(error.message)

      setCheckedInIds((prev) => {
        const next = new Set([...prev])
        next.delete(registrationId)
        setPresentiCount(next.size)
        return next
      })
      setCheckinStatus((prev) => {
        const next = { ...prev }
        delete next[registrationId]
        return next
      })
    } catch {
      // silent
    } finally {
      setUndoLoading((prev) => ({ ...prev, [registrationId]: false }))
    }
  }

  // --- Main layout ---
  const filteredResults = searchResults.filter((r) => {
    const field = currentEvent?.regField as keyof Registration | undefined
    return field ? r[field] : false
  })

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-surface-dark px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <img
            src="/estela-logo.svg"
            alt="Estela"
            className="h-8 object-contain hidden sm:block"
          />

          <div className="flex-1">
            <Select
              options={[...EVENT_OPTIONS]}
              value={selectedEvent}
              onChange={setSelectedEvent}
              placeholder="Select event"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text whitespace-nowrap">
              {presentiCount !== null ? presentiCount : '\u2014'} / 150 present
            </span>
            <time className="text-sm text-text-light whitespace-nowrap">
              {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        </div>
      </header>

      {/* Two-panel layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left panel — QR Scanner */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-dark p-6 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-semibold text-text mb-4">QR Scanner</h2>

          {/* Camera feed */}
          {scannerActive && (
            <div
              id={QR_SCANNER_ID}
              className="w-full rounded-lg overflow-hidden bg-black min-h-[280px]"
            />
          )}

          {/* Loading between states */}
          {!scannerActive && !scannedReg && !scanError && !scanStatus && (
            <div className="flex-1 flex items-center justify-center">
              <span className="animate-spin rounded-full h-8 w-8 border-2 border-estela border-t-transparent" />
            </div>
          )}

          {/* Scanned attendee — awaiting check-in */}
          {scannedReg && !scanStatus && (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="rounded-xl border border-surface-dark p-4">
                <p className="text-lg font-semibold text-text">
                  {scannedReg.nome} {scannedReg.cognome}
                </p>
                {(scannedReg.ruolo || scannedReg.azienda) && (
                  <p className="text-sm text-text-light">
                    {[scannedReg.ruolo, scannedReg.azienda].filter(Boolean).join(' — ')}
                  </p>
                )}
                {(scannedReg.email || scannedReg.telefono) && (
                  <p className="text-xs text-text-light mt-1">
                    {[scannedReg.email, scannedReg.telefono].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-3">
                  {scannedReg.colazione_29 && <EventBadge label="Col 29" />}
                  {scannedReg.colazione_30 && <EventBadge label="Col 30" />}
                  {scannedReg.colazione_01 && <EventBadge label="Col 01" />}
                  {scannedReg.sunset_29 && <EventBadge label="Sun 29" />}
                  {scannedReg.sunset_30 && <EventBadge label="Sun 30" />}
                </div>
              </div>
              <Button
                variant="success"
                fullWidth
                size="lg"
                isLoading={scanCheckinLoading}
                onClick={handleScanCheckin}
              >
                Confirm Check-in
              </Button>
            </div>
          )}

          {/* Scan result: success */}
          {scanStatus === 'success' && scannedReg && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <span className="text-3xl text-success">&#10003;</span>
              </div>
              <p className="text-lg font-semibold text-success">Check-in successful</p>
              <p className="text-sm text-text-light">{scannedReg.nome} {scannedReg.cognome}</p>
            </div>
          )}

          {/* Scan result: already checked in */}
          {scanStatus === 'already' && scannedReg && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                <span className="text-3xl text-warning">!</span>
              </div>
              <p className="text-lg font-semibold text-warning">Already checked in for this event</p>
              <p className="text-sm text-text-light">{scannedReg.nome} {scannedReg.cognome}</p>
            </div>
          )}

          {/* Scan result: error */}
          {(scanStatus === 'error' || scanError) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
                <span className="text-3xl text-danger">&times;</span>
              </div>
              <p className="text-lg font-semibold text-danger">
                {scanError ?? 'Check-in error'}
              </p>
            </div>
          )}
        </div>

        {/* Right panel — Manual Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-dark p-6 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-semibold text-text mb-4">Manual Search</h2>

          <Input
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, surname or email..."
          />

          <div className="mt-4 flex-1 overflow-y-auto">
            {isSearching && (
              <div className="flex justify-center py-8">
                <span className="animate-spin rounded-full h-6 w-6 border-2 border-estela border-t-transparent" />
              </div>
            )}

            {!isSearching && debouncedQuery.length >= 2 && filteredResults.length === 0 && (
              <p className="text-sm text-text-light text-center py-8">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </p>
            )}

            {!isSearching && filteredResults.length > 0 && (
              <ul className="space-y-2">
                {filteredResults.map((reg) => {
                  const status = checkinStatus[reg.id]
                  const loading = checkinLoading[reg.id] ?? false

                  return (
                    <li
                      key={reg.id}
                      className={`
                        rounded-xl border p-4 transition-colors
                        ${status === 'success' ? 'border-success/40 bg-success/5' : ''}
                        ${status === 'already' ? 'border-warning/40 bg-warning/5' : ''}
                        ${status === 'error' ? 'border-danger/40 bg-danger/5' : ''}
                        ${!status ? 'border-surface-dark' : ''}
                      `.trim()}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text truncate">
                            {reg.nome} {reg.cognome}
                          </p>
                          {(reg.azienda || reg.ruolo) && (
                            <p className="text-sm text-text-light truncate">
                              {[reg.ruolo, reg.azienda].filter(Boolean).join(' — ')}
                            </p>
                          )}
                          {(reg.email || reg.telefono) && (
                            <p className="text-xs text-text-light truncate">
                              {[reg.email, reg.telefono].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {reg.colazione_29 && <EventBadge label="Col 29" />}
                            {reg.colazione_30 && <EventBadge label="Col 30" />}
                            {reg.colazione_01 && <EventBadge label="Col 01" />}
                            {reg.sunset_29 && <EventBadge label="Sun 29" />}
                            {reg.sunset_30 && <EventBadge label="Sun 30" />}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {status === 'success' && (
                            <span className="text-xs font-medium text-success">
                              &#10003; Check-in successful
                            </span>
                          )}
                          {status === 'already' && (
                            <span className="text-xs font-medium text-warning">
                              Already checked in for this event
                            </span>
                          )}
                          {status === 'error' && (
                            <span className="text-xs font-medium text-danger">
                              Error, try again
                            </span>
                          )}
                          {status !== 'success' && (
                            <Button
                              size="sm"
                              variant="success"
                              isLoading={loading}
                              onClick={() => handleCheckin(reg.id)}
                            >
                              Check-in
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        {/* Full-width attendee list */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-surface-dark p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">Attendee List</h2>
            <div className="flex rounded-lg border border-surface-dark overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setListTab('pending')}
                className={`px-4 py-1.5 font-medium transition-colors ${
                  listTab === 'pending'
                    ? 'bg-estela text-white'
                    : 'bg-white text-text-light hover:bg-surface'
                }`}
              >
                Pending ({pendingAttendees.length})
              </button>
              <button
                type="button"
                onClick={() => setListTab('done')}
                className={`px-4 py-1.5 font-medium transition-colors ${
                  listTab === 'done'
                    ? 'bg-success text-white'
                    : 'bg-white text-text-light hover:bg-surface'
                }`}
              >
                Checked in ({checkedInAttendees.length})
              </button>
            </div>
          </div>

          {listLoading ? (
            <div className="flex justify-center py-8">
              <span className="animate-spin rounded-full h-6 w-6 border-2 border-estela border-t-transparent" />
            </div>
          ) : (
            <AttendeeTable
              attendees={listTab === 'pending' ? pendingAttendees : checkedInAttendees}
              isPending={listTab === 'pending'}
              checkinStatus={checkinStatus}
              checkinLoading={checkinLoading}
              onCheckin={handleCheckin}
              undoLoading={undoLoading}
              onUndo={handleUndoCheckin}
            />
          )}
        </div>
      </main>

      <footer className="py-4 text-center">
        <p className="text-sm text-supasailing"><a href="https://supasailing.com" target="_blank" rel="noopener noreferrer">Powered by SupaSailing</a></p>
      </footer>
    </div>
  )
}

function AttendeeTable({
  attendees,
  isPending,
  checkinStatus,
  checkinLoading,
  onCheckin,
  undoLoading,
  onUndo,
}: {
  readonly attendees: readonly Registration[]
  readonly isPending: boolean
  readonly checkinStatus: Record<string, CheckinStatus>
  readonly checkinLoading: Record<string, boolean>
  readonly onCheckin: (id: string) => void
  readonly undoLoading: Record<string, boolean>
  readonly onUndo: (id: string) => void
}) {
  if (attendees.length === 0) {
    return (
      <p className="text-sm text-text-light text-center py-8">
        {isPending ? 'Everyone is checked in!' : 'No one checked in yet.'}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface text-text-light">
            <th className="text-left px-4 py-2.5 font-medium">Name</th>
            <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Company</th>
            <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Role</th>
            <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Email</th>
            <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Phone</th>
            <th className="text-left px-4 py-2.5 font-medium hidden xl:table-cell">Origin</th>
            <th className="text-right px-4 py-2.5 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {attendees.map((reg) => {
            const status = checkinStatus[reg.id]
            const loading = checkinLoading[reg.id] ?? false
            const justCheckedIn = status === 'success'
            const isUndoing = undoLoading[reg.id] ?? false

            return (
              <tr
                key={reg.id}
                className={`border-t border-surface transition-colors ${
                  justCheckedIn ? 'bg-success/5' : 'hover:bg-surface/30'
                }`}
              >
                <td className="px-4 py-2.5 text-text font-medium">
                  {reg.nome} {reg.cognome}
                </td>
                <td className="px-4 py-2.5 text-text-light hidden sm:table-cell">
                  {reg.azienda ?? '\u2014'}
                </td>
                <td className="px-4 py-2.5 text-text-light hidden md:table-cell">
                  {reg.ruolo ?? '\u2014'}
                </td>
                <td className="px-4 py-2.5 text-text-light hidden lg:table-cell">
                  {reg.email}
                </td>
                <td className="px-4 py-2.5 text-text-light hidden lg:table-cell">
                  {reg.telefono ?? '\u2014'}
                </td>
                <td className="px-4 py-2.5 text-text-light hidden xl:table-cell">
                  {reg.provenienza ?? '\u2014'}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  {isPending ? (
                    justCheckedIn ? (
                      <span className="text-xs font-medium text-success">&#10003; Done</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        isLoading={loading}
                        onClick={() => onCheckin(reg.id)}
                      >
                        Check-in
                      </Button>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={isUndoing}
                      onClick={() => onUndo(reg.id)}
                      className="text-xs font-medium text-danger hover:text-danger/80 transition-colors px-2 py-1 rounded hover:bg-danger/5 disabled:opacity-50"
                    >
                      {isUndoing ? 'Undoing...' : 'Undo'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EventBadge({ label }: { readonly label: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-estela/10 text-estela">
      {label}
    </span>
  )
}
