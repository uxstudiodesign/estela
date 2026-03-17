import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { supabase } from '@/config/supabase'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

const RUOLO_OPTIONS = [
  { value: 'capitano', label: 'Captain' },
  { value: 'armatore', label: 'Shipowner' },
  { value: 'broker', label: 'Broker' },
  { value: 'manager', label: 'Manager' },
  { value: 'agente_marittimo', label: 'Maritime Agent' },
  { value: 'marina_manager', label: 'Marina Manager' },
  { value: 'altro', label: 'Other' },
] as const

const PROVENIENZA_OPTIONS = [
  { value: 'mallorca', label: 'Mallorca' },
  { value: 'fuori_mallorca', label: 'Outside Mallorca' },
  { value: 'altro', label: 'Other' },
] as const

const EVENT_FIELDS = [
  { key: 'colazione_29', name: 'Breakfast Seminar', date: '29 April', time: '08:00–10:30', infoType: 'breakfast', tag: 'Safety' },
  { key: 'colazione_30', name: 'Breakfast Seminar', date: '30 April', time: '08:00–10:30', infoType: 'breakfast', tag: 'AI' },
  { key: 'colazione_01', name: 'Breakfast Seminar', date: '1 May', time: '08:00–10:30', infoType: 'breakfast', tag: 'Sustainability' },
  { key: 'sunset_29', name: 'Sunset Cocktail', date: '29 April', time: '17:00–19:00', infoType: 'sunset', tag: null },
  { key: 'sunset_30', name: 'Sunset Cocktail', date: '30 April', time: '17:00–19:00', infoType: 'sunset', tag: null },
] as const

type EventInfoType = 'breakfast' | 'sunset'

const BREAKFAST_TOPICS = [
  { date: '29 April', topic: 'Safety', title: 'Rethinking Superyacht Risk in an Unpredictable Era' },
  { date: '30 April', topic: 'Artificial Intelligence', title: 'Beyond the Buzzword: How AI is Actually Changing Superyacht Operations' },
  { date: '1 May', topic: 'Sustainability', title: 'From Engines to Ecosystems: The Future of Sustainable Superyachts' },
] as const

const EVENT_INFO: Record<EventInfoType, {
  readonly title: string
  readonly time: string
  readonly description: string
  readonly audience: string
  readonly sponsors: ReadonlyArray<{
    readonly tier: string
    readonly items: ReadonlyArray<{ readonly name: string; readonly url: string; readonly desc: string }>
  }>
}> = {
  breakfast: {
    title: 'Breakfast Seminars',
    time: '08:00 – 10:30',
    description:
      'Focused mornings with coffee networking and short, relevant industry content. Part of the Astilleros programme at Astilleros de Mallorca, designed to connect the wider yachting industry in a relaxed, high-quality setting right next to the Palma International Boat Show.',
    audience:
      'Captains, yacht managers, brokers, shipyards, marinas and key suppliers.',
    sponsors: [
      {
        tier: 'Partner Sponsor',
        items: [
          { name: 'Multiplex', url: 'https://multiplexgmbh.com/', desc: 'Premium carbon boarding systems and exterior yacht equipment' },
        ],
      },
      {
        tier: 'Gold Sponsors',
        items: [
          { name: 'Sevenstar Yacht Transport', url: 'https://www.sevenstar-yacht-transport.com', desc: 'Worldwide yacht transport and logistics' },
          { name: 'Alcaidesa Marina', url: 'https://alcaidesamarina.com/', desc: 'Marina services in a strategic Gibraltar-area location' },
          { name: 'Coral Marine', url: 'https://www.coralmarine.es/', desc: 'Luxury yachting services in Ibiza' },
          { name: 'AYSS', url: 'https://www.ayss.org', desc: 'Global superyacht shore-support network' },
          { name: 'TermoPetroli Versilia', url: 'https://www.termopetroliversilia.com', desc: 'Yacht fuel and lube oil supply network' },
          { name: 'Antigua Superyacht Marina', url: 'https://antiguasuperyachtmarina.com/', desc: 'Full-service superyacht marina in the Caribbean' },
        ],
      },
      {
        tier: 'Silver Sponsors',
        items: [
          { name: 'Pantaenius', url: 'https://www.pantaenius.com', desc: 'Yacht and superyacht insurance specialist' },
          { name: 'Frizonia', url: 'https://frizonia.com', desc: 'Naval HVAC and refrigeration engineering' },
          { name: 'Marina Cala del Forte', url: 'https://www.caladelforte-ventimiglia.it', desc: 'Superyacht marina at the gateway to the Riviera' },
          { name: 'Pantalán del Mediterráneo', url: 'https://www.pantalanmediterraneo.com', desc: 'Marina and berthing services in Palma' },
          { name: 'VULKAN Spain', url: 'https://www.vulkan.com', desc: 'Marine power transmission solutions' },
        ],
      },
      {
        tier: 'In Collaboration With',
        items: [
          { name: 'PYA', url: 'https://www.pya.org', desc: 'Professional Yachting Association' },
          { name: 'Italian Yacht Masters', url: 'https://www.italianyachtmasters.com', desc: 'Association of Italian yacht captains' },
        ],
      },
    ],
  },
  sunset: {
    title: 'Sunset Cocktails',
    time: '17:00 – 19:00',
    description:
      'A proven highlight of the week: relaxed, informal networking at the perfect time of day, with excellent participation from the yachting industry. Part of the Astilleros programme at Astilleros de Mallorca, connecting industry professionals in a high-quality setting next to the Palma International Boat Show.',
    audience:
      'Companies, associations, marinas, brokers, yacht managers, yacht agents, suppliers, crew and captains.',
    sponsors: [
      {
        tier: 'Partner Sponsor',
        items: [
          { name: 'Multiplex', url: 'https://multiplexgmbh.com/', desc: 'Premium carbon boarding systems and exterior yacht equipment' },
        ],
      },
      {
        tier: 'Gold Sponsors',
        items: [
          { name: 'Sevenstar Yacht Transport', url: 'https://www.sevenstar-yacht-transport.com', desc: 'Worldwide yacht transport and logistics' },
          { name: 'Alcaidesa Marina', url: 'https://alcaidesamarina.com/', desc: 'Marina services in a strategic Gibraltar-area location' },
          { name: 'Coral Marine', url: 'https://www.coralmarine.es/', desc: 'Luxury yachting services in Ibiza' },
          { name: 'AYSS', url: 'https://www.ayss.org', desc: 'Global superyacht shore-support network' },
          { name: 'TermoPetroli Versilia', url: 'https://www.termopetroliversilia.com', desc: 'Yacht fuel and lube oil supply network' },
          { name: 'Antigua Superyacht Marina', url: 'https://antiguasuperyachtmarina.com/', desc: 'Full-service superyacht marina in the Caribbean' },
        ],
      },
      {
        tier: 'Silver Sponsors',
        items: [
          { name: 'Pantaenius', url: 'https://www.pantaenius.com', desc: 'Yacht and superyacht insurance specialist' },
          { name: 'Frizonia', url: 'https://frizonia.com', desc: 'Naval HVAC and refrigeration engineering' },
          { name: 'Marina Cala del Forte', url: 'https://www.caladelforte-ventimiglia.it', desc: 'Superyacht marina at the gateway to the Riviera' },
          { name: 'Pantalán del Mediterráneo', url: 'https://www.pantalanmediterraneo.com', desc: 'Marina and berthing services in Palma' },
          { name: 'VULKAN Spain', url: 'https://www.vulkan.com', desc: 'Marine power transmission solutions' },
        ],
      },
      {
        tier: 'In Collaboration With',
        items: [
          { name: 'PYA', url: 'https://www.pya.org', desc: 'Professional Yachting Association' },
          { name: 'Italian Yacht Masters', url: 'https://www.italianyachtmasters.com', desc: 'Association of Italian yacht captains' },
        ],
      },
    ],
  },
}

type EventKey = typeof EVENT_FIELDS[number]['key']

interface FormData {
  readonly nome: string
  readonly cognome: string
  readonly email: string
  readonly telefono: string
  readonly azienda: string
  readonly ruolo: string
  readonly provenienza: string
  readonly colazione_29: boolean
  readonly colazione_30: boolean
  readonly colazione_01: boolean
  readonly sunset_29: boolean
  readonly sunset_30: boolean
  readonly consenso_dati: boolean
  readonly consenso_sponsor: boolean
}

const INITIAL_FORM: FormData = {
  nome: '',
  cognome: '',
  email: '',
  telefono: '',
  azienda: '',
  ruolo: '',
  provenienza: '',
  colazione_29: false,
  colazione_30: false,
  colazione_01: false,
  sunset_29: false,
  sunset_30: false,
  consenso_dati: false,
  consenso_sponsor: false,
}

const registrationSchema = z.object({
  nome: z.string().min(1, 'First name is required'),
  cognome: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  telefono: z.string().min(1, 'Phone number is required'),
  azienda: z.string().optional(),
  ruolo: z.string().optional(),
  provenienza: z.string().optional(),
  colazione_29: z.boolean(),
  colazione_30: z.boolean(),
  colazione_01: z.boolean(),
  sunset_29: z.boolean(),
  sunset_30: z.boolean(),
  consenso_dati: z.literal(true, { message: 'You must accept the data processing terms to proceed' }),
  consenso_sponsor: z.boolean(),
}).refine(
  (data) =>
    data.colazione_29 || data.colazione_30 || data.colazione_01 ||
    data.sunset_29 || data.sunset_30,
  { message: 'Please select at least one event', path: ['events'] },
)

export function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrivacyModalOpen, setPrivacyModalOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [eventInfoModal, setEventInfoModal] = useState<string | null>(null)

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      delete next['events']
      return next
    })
  }

  function toggleEvent(key: EventKey) {
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next['events']
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const result = registrationSchema.safeParse(formData)

    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        if (key && !errors[key]) {
          errors[key] = issue.message
        }
      }
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          telefono: formData.telefono || null,
          azienda: formData.azienda || null,
          ruolo: formData.ruolo || null,
          provenienza: formData.provenienza || null,
          colazione_29: formData.colazione_29,
          colazione_30: formData.colazione_30,
          colazione_01: formData.colazione_01,
          sunset_29: formData.sunset_29,
          sunset_30: formData.sunset_30,
          consenso_dati: formData.consenso_dati,
          consenso_sponsor: formData.consenso_sponsor,
        })
        .select('qr_token')
        .single()

      if (error) throw new Error(error.message)

      // Fire-and-forget: send confirmation email without blocking navigation
      const selectedEvents = EVENT_FIELDS
        .filter(({ key }) => formData[key])
        .map(({ key }) => key)

      supabase.functions.invoke('send-confirmation-email', {
        body: {
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          events: selectedEvents,
          qrToken: data.qr_token,
        },
      })

      navigate('/events/confirmation?token=' + data.qr_token)
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'An error occurred. Please try again later.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <h1 className="text-2xl font-semibold text-estela text-center mb-6">
            Event Registration
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 1. Nome */}
            <Input
              id="nome"
              label="First Name"
              value={formData.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              error={formErrors.nome}
              required
              placeholder="Your first name"
            />

            {/* 2. Cognome */}
            <Input
              id="cognome"
              label="Last Name"
              value={formData.cognome}
              onChange={(e) => updateField('cognome', e.target.value)}
              error={formErrors.cognome}
              required
              placeholder="Your last name"
            />

            {/* 3. Email */}
            <Input
              id="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={formErrors.email}
              required
              placeholder="name@example.com"
            />

            {/* 4. Telefono */}
            <Input
              id="telefono"
              label="Phone"
              type="tel"
              value={formData.telefono}
              onChange={(e) => updateField('telefono', e.target.value)}
              error={formErrors.telefono}
              required
              placeholder="Your phone number"
            />

            {/* 5. Azienda */}
            <Input
              id="azienda"
              label="Company / Yacht"
              value={formData.azienda}
              onChange={(e) => updateField('azienda', e.target.value)}
              placeholder="Optional"
            />

            {/* 6. Ruolo */}
            <Select
              label="Role"
              options={[...RUOLO_OPTIONS]}
              value={formData.ruolo}
              onChange={(value) => updateField('ruolo', value)}
              placeholder="Select role"
              error={formErrors.ruolo}
            />

            {/* 7. Provenienza */}
            <Select
              label="Origin"
              options={[...PROVENIENZA_OPTIONS]}
              value={formData.provenienza}
              onChange={(value) => updateField('provenienza', value)}
              placeholder="Select origin"
              error={formErrors.provenienza}
            />

            {/* 8. Event selection */}
            <fieldset>
              <legend className="block text-sm font-medium text-text mb-2">
                Events <span className="text-danger">*</span>
              </legend>
              <div className="space-y-2">
                {EVENT_FIELDS.map(({ key, name, date, time, infoType, tag }) => {
                  const checked = formData[key]
                  return (
                    <div
                      key={key}
                      className={`
                        relative rounded-xl border-2 transition-all
                        ${checked
                          ? 'border-estela bg-estela/5'
                          : 'border-surface-dark bg-white hover:border-estela/30'}
                      `}
                    >
                      <label className="flex items-center gap-3 cursor-pointer px-3 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(key)}
                          className="h-5 w-5 shrink-0 rounded border-surface-dark text-estela focus:ring-estela accent-estela"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text leading-tight">
                              {name}
                            </span>
                            {tag && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-estela/10 text-estela">
                                {tag}
                              </span>
                            )}
                            <span className="text-sm text-text-light leading-tight">
                              — {date}
                            </span>
                          </div>
                          <span className="text-xs text-text-light flex items-center gap-1 mt-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {time}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setEventInfoModal(key)
                          }}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs text-text-light hover:text-estela hover:bg-estela/10 transition-colors"
                          aria-label={`Info about ${name}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Details
                        </button>
                      </label>
                    </div>
                  )
                })}
              </div>
              {formErrors.events && (
                <p className="mt-1 text-sm text-danger">{formErrors.events}</p>
              )}
            </fieldset>

            {/* 9. Consenso dati (required) */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consenso_dati}
                  onChange={() => updateField('consenso_dati', !formData.consenso_dati)}
                  className="h-5 w-5 mt-0.5 rounded border-surface-dark text-estela focus:ring-estela accent-estela"
                />
                <span className="text-sm text-text">
                  I consent to the processing of my personal data (GDPR).{' '}
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(true)}
                    className="underline text-estela hover:text-estela-light"
                  >
                    Read more
                  </button>{' '}
                  <span className="text-danger">*</span>
                </span>
              </label>
              {formErrors.consenso_dati && (
                <p className="mt-1 text-sm text-danger">{formErrors.consenso_dati}</p>
              )}
            </div>

            {/* 10. Consenso sponsor (optional) */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consenso_sponsor}
                  onChange={() => updateField('consenso_sponsor', !formData.consenso_sponsor)}
                  className="h-5 w-5 mt-0.5 rounded border-surface-dark text-estela focus:ring-estela accent-estela"
                />
                <span className="text-sm text-text">
                  I consent to receive communications from event sponsors.{' '}
                  <button
                    type="button"
                    onClick={() => setPrivacyModalOpen(true)}
                    className="underline text-estela hover:text-estela-light"
                  >
                    Read more
                  </button>
                </span>
              </label>
            </div>

            <PrivacyModal
              isOpen={isPrivacyModalOpen}
              onClose={() => setPrivacyModalOpen(false)}
            />

            {eventInfoModal && (() => {
              const field = EVENT_FIELDS.find((f) => f.key === eventInfoModal)
              if (!field) return null
              const infoType = field.infoType as EventInfoType
              return (
                <EventInfoModal
                  info={EVENT_INFO[infoType]}
                  eventKey={eventInfoModal}
                  onClose={() => setEventInfoModal(null)}
                />
              )
            })()}

            {/* Submit error */}
            {submitError && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-3">
                <p className="text-sm text-danger">{submitError}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              isLoading={isSubmitting}
              fullWidth
              className="!bg-estela hover:!bg-estela-light !h-14 !text-lg !rounded-xl"
            >
              Register
            </Button>
          </form>
        </div>
      </main>

      <footer className="pb-8 text-center">
        <p className="text-sm text-supasailing"><a href="https://supasailing.com" target="_blank" rel="noopener noreferrer">Powered by SupaSailing</a></p>
      </footer>
    </div>
  )
}

function PrivacyModal({
  isOpen,
  onClose,
}: {
  readonly isOpen: boolean
  readonly onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">Privacy Policy</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-light hover:text-text p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-sm text-text space-y-4">
          <section>
            <h3 className="font-semibold mb-1">Data Controller</h3>
            <p>
              <strong>Estela Shipping Palma S.A.</strong><br />
              CIF: A07021967<br />
              Avenida Gabriel Roca 37, 07014 Palma, Baleares, Spain<br />
              Email:{' '}
              <a href="mailto:palma@estelashipping.net" className="underline text-estela">
                palma@estelashipping.net
              </a>
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Purpose of Data Processing</h3>
            <p>
              Your personal data is collected and processed solely for the purpose of
              managing your registration and check-in at the Estela Shipping events
              during the Palma International Boat Show 2025 (29 April – 1 May).
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Legal Basis</h3>
            <p>
              Processing is based on your explicit consent pursuant to Art. 6(1)(a) of
              the EU General Data Protection Regulation (GDPR) 2016/679.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Data Collected</h3>
            <p>
              First name, last name, email address, phone number (optional), company
              (optional), role (optional), origin (optional), selected events, and
              consent preferences.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Data Retention</h3>
            <p>
              Your data will be retained for the duration necessary to fulfil the
              purposes described above and will be deleted within 12 months after the
              event, unless a longer retention period is required by law.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Sharing with Sponsors</h3>
            <p>
              If you provide separate optional consent, your contact information may be
              shared with event sponsors and partners for promotional communications.
              You may withdraw this consent at any time.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Your Rights</h3>
            <p>
              Under the GDPR you have the right to access, rectify, erase, restrict
              processing, data portability, and object to processing of your personal
              data. You may also withdraw your consent at any time without affecting the
              lawfulness of processing carried out prior to withdrawal.
            </p>
            <p className="mt-1">
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:palma@estelashipping.net" className="underline text-estela">
                palma@estelashipping.net
              </a>.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Right to Lodge a Complaint</h3>
            <p>
              You have the right to lodge a complaint with the Spanish Data Protection
              Agency (AEPD) at{' '}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-estela"
              >
                www.aepd.es
              </a>.
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-estela text-white py-3 text-sm font-medium hover:bg-estela-light transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function EventInfoModal({
  info,
  eventKey,
  onClose,
}: {
  readonly info: typeof EVENT_INFO[EventInfoType]
  readonly eventKey: string
  readonly onClose: () => void
}) {
  const [sponsorsOpen, setSponorsOpen] = useState(false)

  return (
    <Modal isOpen title={info.title} onClose={onClose}>
      <div className="text-sm text-text space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
          <svg className="w-4 h-4 text-estela shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-estela">{info.time}</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
          <svg className="w-4 h-4 text-estela shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <a
            href="https://maps.google.com/?q=Astilleros+de+Mallorca,+Palma"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-estela hover:text-estela-light underline"
          >
            Astilleros de Mallorca, Palma
          </a>
        </div>

        <p>{info.description}</p>

        {info.title === 'Breakfast Seminars' && (() => {
          const field = EVENT_FIELDS.find((f) => f.key === eventKey)
          const topic = field ? BREAKFAST_TOPICS.find((t) => t.date === field.date) : null
          if (!topic) return null
          return (
            <div>
              <h3 className="font-semibold mb-2">
                Seminar <span className="text-estela">Topic</span>
              </h3>
              <div className="rounded-lg bg-surface px-3 py-2.5">
                <p className="text-xs font-semibold text-estela uppercase tracking-wide mb-0.5">
                  {topic.topic}
                </p>
                <p className="text-sm text-text leading-snug">{topic.title}</p>
              </div>
            </div>
          )
        })()}

        <div>
          <h3 className="font-semibold mb-1">Ideal For</h3>
          <p className="text-text-light">{info.audience}</p>
        </div>

        <div className="border-t border-surface-dark pt-3">
          <button
            type="button"
            onClick={() => setSponorsOpen((prev) => !prev)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-semibold">Sponsored By</h3>
            <svg
              className={`w-4 h-4 text-text-light transition-transform ${sponsorsOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sponsorsOpen && (
            <div className="space-y-3 mt-3">
              {info.sponsors.map((group) => (
                <div key={group.tier}>
                  <p className="text-xs font-semibold text-text-light uppercase tracking-wide mb-1">
                    {group.tier}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((sponsor) => (
                      <li key={sponsor.name}>
                        <a
                          href={sponsor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-estela hover:text-estela-light underline"
                        >
                          {sponsor.name}
                        </a>
                        <span className="text-text-light"> — {sponsor.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
