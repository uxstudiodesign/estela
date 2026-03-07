import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { supabase } from '@/config/supabase'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

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
  { key: 'colazione_29', label: 'Breakfast Seminar — 29 April' },
  { key: 'colazione_30', label: 'Breakfast Seminar — 30 April' },
  { key: 'colazione_01', label: 'Breakfast Seminar — 1 May' },
  { key: 'sunset_29', label: 'Sunset Cocktail — 29 April' },
  { key: 'sunset_30', label: 'Sunset Cocktail — 30 April' },
] as const

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
  telefono: z.string().optional(),
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
              placeholder="Optional"
            />

            {/* 5. Azienda */}
            <Input
              id="azienda"
              label="Company"
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
              <div className="space-y-3">
                {EVENT_FIELDS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData[key]}
                      onChange={() => toggleEvent(key)}
                      className="h-5 w-5 rounded border-surface-dark text-estela focus:ring-estela accent-estela"
                    />
                    <span className="text-sm text-text">{label}</span>
                  </label>
                ))}
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
