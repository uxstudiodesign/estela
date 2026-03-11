import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import { PinGate } from '@/components/events/PinGate'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'

const EVENT_CONFIG = [
  { key: 'colazione_29', label: 'Breakfast Seminar — 29 Apr', type: 'colazione', day: '2025-04-29' },
  { key: 'colazione_30', label: 'Breakfast Seminar — 30 Apr', type: 'colazione', day: '2025-04-30' },
  { key: 'colazione_01', label: 'Breakfast Seminar — 1 May', type: 'colazione', day: '2025-05-01' },
  { key: 'sunset_29', label: 'Sunset Cocktail — 29 Apr', type: 'sunset', day: '2025-04-29' },
  { key: 'sunset_30', label: 'Sunset Cocktail — 30 Apr', type: 'sunset', day: '2025-04-30' },
] as const

type EventKey = typeof EVENT_CONFIG[number]['key']

const FILTER_OPTIONS = [
  { value: '', label: 'All events' },
  ...EVENT_CONFIG.map((e) => ({ value: e.key, label: e.label })),
]

interface FullRegistration {
  readonly id: string
  readonly created_at: string
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
  readonly consenso_dati: boolean
  readonly consenso_sponsor: boolean
  readonly status: string | null
}

interface Checkin {
  readonly id: string
  readonly registration_id: string
  readonly event_type: string
  readonly event_day: string
  readonly checked_in_at: string
}

export function EventAdminPage() {
  return (
    <PinGate>
      <AdminDashboard />
    </PinGate>
  )
}

function AdminDashboard() {
  const [registrations, setRegistrations] = useState<FullRegistration[]>([])
  const [checkinCounts, setCheckinCounts] = useState<Record<string, number>>({})
  const [checkinsByReg, setCheckinsByReg] = useState<Record<string, Set<string>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Edit modal state
  const [editingReg, setEditingReg] = useState<FullRegistration | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [editSaving, setEditSaving] = useState(false)

  // Checkins modal state
  const [checkinsReg, setCheckinsReg] = useState<FullRegistration | null>(null)
  const [regCheckins, setRegCheckins] = useState<Checkin[]>([])
  const [checkinsLoading, setCheckinsLoading] = useState(false)

  // Confirm delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: regs } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false })

      setRegistrations((regs ?? []) as FullRegistration[])

      const counts: Record<string, number> = {}
      await Promise.all(
        EVENT_CONFIG.map(async (evt) => {
          const { count } = await supabase
            .from('checkins')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', evt.type)
            .eq('event_day', evt.day)

          counts[evt.key] = count ?? 0
        }),
      )
      setCheckinCounts(counts)

      // Fetch per-registration checkins for badge coloring
      const { data: allCheckins } = await supabase
        .from('checkins')
        .select('registration_id, event_type, event_day')

      const byReg: Record<string, Set<string>> = {}
      for (const c of (allCheckins ?? []) as { registration_id: string; event_type: string; event_day: string }[]) {
        const evtKey = EVENT_CONFIG.find((e) => e.type === c.event_type && e.day === c.event_day)?.key
        if (evtKey) {
          if (!byReg[c.registration_id]) byReg[c.registration_id] = new Set()
          byReg[c.registration_id].add(evtKey)
        }
      }
      setCheckinsByReg(byReg)
    } catch {
      // silent — data will be empty
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredRegistrations = registrations
    .filter((r) => {
      if (!eventFilter) return true
      return r[eventFilter as EventKey]
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortOrder === 'asc' ? diff : -diff
    })

  // --- Delete registration ---
  async function handleDelete(id: string) {
    setDeleteLoading(true)
    try {
      const { error } = await supabase.rpc('delete_registration', { reg_id: id })

      if (error) throw new Error(error.message)

      setRegistrations((prev) => prev.filter((r) => r.id !== id))
      setDeletingId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  // --- Edit registration ---
  function openEdit(reg: FullRegistration) {
    setEditingReg(reg)
    setEditForm({
      nome: reg.nome,
      cognome: reg.cognome,
      email: reg.email,
      telefono: reg.telefono ?? '',
      azienda: reg.azienda ?? '',
      ruolo: reg.ruolo ?? '',
      provenienza: reg.provenienza ?? '',
      colazione_29: reg.colazione_29,
      colazione_30: reg.colazione_30,
      colazione_01: reg.colazione_01,
      sunset_29: reg.sunset_29,
      sunset_30: reg.sunset_30,
    })
  }

  function updateEditField(field: string, value: unknown) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveEdit() {
    if (!editingReg) return
    setEditSaving(true)
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          nome: editForm.nome as string,
          cognome: editForm.cognome as string,
          email: editForm.email as string,
          telefono: (editForm.telefono as string) || null,
          azienda: (editForm.azienda as string) || null,
          ruolo: (editForm.ruolo as string) || null,
          provenienza: (editForm.provenienza as string) || null,
          colazione_29: editForm.colazione_29 as boolean,
          colazione_30: editForm.colazione_30 as boolean,
          colazione_01: editForm.colazione_01 as boolean,
          sunset_29: editForm.sunset_29 as boolean,
          sunset_30: editForm.sunset_30 as boolean,
        })
        .eq('id', editingReg.id)

      if (error) throw new Error(error.message)

      setEditingReg(null)
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setEditSaving(false)
    }
  }

  // --- View / undo checkins ---
  async function openCheckins(reg: FullRegistration) {
    setCheckinsReg(reg)
    setCheckinsLoading(true)
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('registration_id', reg.id)
        .order('checked_in_at', { ascending: false })

      if (error) throw new Error(error.message)
      setRegCheckins((data ?? []) as Checkin[])
    } catch {
      setRegCheckins([])
    } finally {
      setCheckinsLoading(false)
    }
  }

  async function handleUndoCheckin(checkinId: string) {
    try {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('id', checkinId)

      if (error) throw new Error(error.message)

      setRegCheckins((prev) => prev.filter((c) => c.id !== checkinId))
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Undo failed')
    }
  }

  // --- Export CSV ---
  function handleExportCsv() {
    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Role', 'Origin',
      'Col 29', 'Col 30', 'Col 01', 'Sunset 29', 'Sunset 30',
      'Sponsor Consent', 'Registration Date',
    ]

    const rows = filteredRegistrations.map((r) => [
      r.nome,
      r.cognome,
      r.email,
      r.telefono ?? '',
      r.azienda ?? '',
      r.ruolo ?? '',
      r.provenienza ?? '',
      r.colazione_29 ? 'Yes' : 'No',
      r.colazione_30 ? 'Yes' : 'No',
      r.colazione_01 ? 'Yes' : 'No',
      r.sunset_29 ? 'Yes' : 'No',
      r.sunset_30 ? 'Yes' : 'No',
      r.consenso_sponsor ? 'Yes' : 'No',
      new Date(r.created_at).toLocaleDateString('en-GB'),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const date = new Date().toISOString().slice(0, 10)

    const link = document.createElement('a')
    link.href = url
    link.download = `registrations_estela_${date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="pt-8 pb-4 px-4 flex flex-col items-center gap-4">
        <img src="/estela-logo.png" alt="Estela" className="h-12 object-contain" />
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-estela">Admin Dashboard</h1>
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="text-estela hover:text-estela-light disabled:opacity-50"
            aria-label="Refresh data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      <main className="px-4 pb-12 max-w-6xl mx-auto space-y-6">
        {/* Summary table */}
        <section className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-surface">
            <h2 className="text-lg font-semibold text-text">Event Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-text-light">
                  <th className="text-left px-6 py-3 font-medium">Event</th>
                  <th className="text-right px-6 py-3 font-medium">Registered</th>
                  <th className="text-right px-6 py-3 font-medium">Check-in</th>
                </tr>
              </thead>
              <tbody>
                {EVENT_CONFIG.map((evt) => {
                  const registered = registrations.filter((r) => r[evt.key]).length
                  const checkedIn = checkinCounts[evt.key] ?? 0
                  return (
                    <tr key={evt.key} className="border-t border-surface">
                      <td className="px-6 py-3 text-text">{evt.label}</td>
                      <td className="px-6 py-3 text-right font-medium text-estela">{registered}</td>
                      <td className="px-6 py-3 text-right font-medium text-success">{checkedIn}</td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-estela bg-surface/50">
                  <td className="px-6 py-3 font-semibold text-text">Total Registrations</td>
                  <td className="px-6 py-3 text-right font-bold text-estela">{registrations.length}</td>
                  <td className="px-6 py-3 text-right font-bold text-success">
                    {Object.values(checkinCounts).reduce((sum, c) => sum + c, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Registration list */}
        <section className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-surface flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-lg font-semibold text-text flex-1">Registrations</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-56">
                <Select
                  options={[...FILTER_OPTIONS]}
                  value={eventFilter}
                  onChange={setEventFilter}
                  placeholder="Filter by event"
                />
              </div>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="text-sm text-estela hover:underline whitespace-nowrap"
              >
                Date {sortOrder === 'desc' ? '\u2193' : '\u2191'}
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCsv}
                disabled={filteredRegistrations.length === 0}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="animate-spin rounded-full h-8 w-8 border-2 border-estela border-t-transparent" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 text-text-light">
              No registrations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface text-text-light">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Phone</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Company</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Role</th>
                    <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Origin</th>
                    <th className="text-left px-4 py-3 font-medium">Events</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((r) => (
                    <tr key={r.id} className="border-t border-surface hover:bg-surface/30">
                      <td className="px-4 py-3 text-text">
                        <span className="font-medium">{r.nome} {r.cognome}</span>
                      </td>
                      <td className="px-4 py-3 text-text-light hidden md:table-cell">{r.email}</td>
                      <td className="px-4 py-3 text-text-light hidden md:table-cell">{r.telefono ?? '\u2014'}</td>
                      <td className="px-4 py-3 text-text-light hidden lg:table-cell">{r.azienda ?? '\u2014'}</td>
                      <td className="px-4 py-3 text-text-light hidden lg:table-cell">{r.ruolo ?? '\u2014'}</td>
                      <td className="px-4 py-3 text-text-light hidden xl:table-cell">{r.provenienza ?? '\u2014'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {EVENT_CONFIG.filter((evt) => r[evt.key]).map((evt) => (
                            <Badge
                              key={evt.key}
                              label={evt.key.replace('_', ' ')}
                              checkedIn={checkinsByReg[r.id]?.has(evt.key) ?? false}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-light hidden sm:table-cell whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton
                            title="Edit"
                            onClick={() => openEdit(r)}
                            icon={<PencilIcon />}
                          />
                          <ActionButton
                            title="Check-ins"
                            onClick={() => openCheckins(r)}
                            icon={<CheckIcon />}
                          />
                          <ActionButton
                            title="Delete"
                            onClick={() => setDeletingId(r.id)}
                            icon={<TrashIcon />}
                            variant="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-3 border-t border-surface text-sm text-text-light">
            {filteredRegistrations.length} registration{filteredRegistrations.length === 1 ? '' : 's'}
          </div>
        </section>
      </main>

      <footer className="pb-8 text-center">
        <p className="text-sm text-supasailing"><a href="https://supasailing.com" target="_blank" rel="noopener noreferrer">Powered by SupaSailing</a></p>
      </footer>

      {/* Delete confirmation modal */}
      {deletingId && (
        <Modal onClose={() => setDeletingId(null)}>
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
              <TrashIcon className="h-6 w-6 text-danger" />
            </div>
            <h3 className="text-lg font-semibold text-text">Delete Registration</h3>
            <p className="text-sm text-text-light">
              This will permanently delete the registration and all associated check-ins. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="secondary" size="sm" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteLoading}
                onClick={() => handleDelete(deletingId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editingReg && (
        <Modal onClose={() => setEditingReg(null)}>
          <h3 className="text-lg font-semibold text-text mb-4">Edit Registration</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                id="edit-nome"
                value={editForm.nome as string}
                onChange={(e) => updateEditField('nome', e.target.value)}
              />
              <Input
                label="Last Name"
                id="edit-cognome"
                value={editForm.cognome as string}
                onChange={(e) => updateEditField('cognome', e.target.value)}
              />
            </div>
            <Input
              label="Email"
              id="edit-email"
              type="email"
              value={editForm.email as string}
              onChange={(e) => updateEditField('email', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone"
                id="edit-telefono"
                value={editForm.telefono as string}
                onChange={(e) => updateEditField('telefono', e.target.value)}
              />
              <Input
                label="Company"
                id="edit-azienda"
                value={editForm.azienda as string}
                onChange={(e) => updateEditField('azienda', e.target.value)}
              />
            </div>
            <Input
              label="Role"
              id="edit-ruolo"
              value={editForm.ruolo as string}
              onChange={(e) => updateEditField('ruolo', e.target.value)}
            />

            <div>
              <p className="text-sm font-medium text-text mb-2">Events</p>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_CONFIG.map((evt) => (
                  <label key={evt.key} className="flex items-center gap-2 text-sm text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm[evt.key] as boolean}
                      onChange={(e) => updateEditField(evt.key, e.target.checked)}
                      className="rounded border-surface-dark text-estela focus:ring-estela"
                    />
                    {evt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="secondary" size="sm" onClick={() => setEditingReg(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={editSaving}
              onClick={handleSaveEdit}
              className="!bg-estela hover:!bg-estela-light"
            >
              Save Changes
            </Button>
          </div>
        </Modal>
      )}

      {/* Checkins modal */}
      {checkinsReg && (
        <Modal onClose={() => setCheckinsReg(null)}>
          <h3 className="text-lg font-semibold text-text mb-1">
            Check-ins: {checkinsReg.nome} {checkinsReg.cognome}
          </h3>
          <p className="text-sm text-text-light mb-4">{checkinsReg.email}</p>

          {checkinsLoading ? (
            <div className="flex justify-center py-8">
              <span className="animate-spin rounded-full h-6 w-6 border-2 border-estela border-t-transparent" />
            </div>
          ) : regCheckins.length === 0 ? (
            <p className="text-sm text-text-light text-center py-8">
              No check-ins found for this registration.
            </p>
          ) : (
            <ul className="space-y-2">
              {regCheckins.map((c) => {
                const evtConfig = EVENT_CONFIG.find(
                  (e) => e.type === c.event_type && e.day === c.event_day,
                )
                return (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border border-surface-dark p-3">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {evtConfig?.label ?? `${c.event_type} — ${c.event_day}`}
                      </p>
                      <p className="text-xs text-text-light">
                        {new Date(c.checked_in_at).toLocaleString('en-GB')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUndoCheckin(c.id)}
                      className="text-xs font-medium text-danger hover:text-danger/80 transition-colors px-2 py-1 rounded hover:bg-danger/5"
                    >
                      Undo
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="secondary" size="sm" onClick={() => setCheckinsReg(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// --- Shared components ---

function Modal({ children, onClose }: { readonly children: React.ReactNode; readonly onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}

function ActionButton({
  title,
  onClick,
  icon,
  variant = 'default',
}: {
  readonly title: string
  readonly onClick: () => void
  readonly icon: React.ReactNode
  readonly variant?: 'default' | 'danger'
}) {
  const colorClass = variant === 'danger'
    ? 'text-danger/60 hover:text-danger hover:bg-danger/5'
    : 'text-text-light hover:text-estela hover:bg-estela/5'

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${colorClass}`}
    >
      {icon}
    </button>
  )
}

function Badge({ label, checkedIn = false }: { readonly label: string; readonly checkedIn?: boolean }) {
  const colorClass = checkedIn
    ? 'bg-success/10 text-success'
    : 'bg-estela/10 text-estela'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${colorClass}`}>
      {checkedIn && <span>&#10003;</span>}
      {label}
    </span>
  )
}

// --- Icons ---

function PencilIcon({ className = 'h-4 w-4' }: { readonly className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }: { readonly className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function CheckIcon({ className = 'h-4 w-4' }: { readonly className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}
