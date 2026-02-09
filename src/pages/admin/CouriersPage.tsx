import { useState, useEffect } from 'react'
import { useCouriers } from '@/hooks/useCouriers'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { courierSchema, type CourierFormData } from '@/lib/validators'
import type { CourierRole } from '@/types/database'

export function CouriersPage() {
  const { couriers, isLoading, fetchCouriers, createCourier, toggleCourierActive } = useCouriers()
  const { showToast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<CourierFormData>({
    email: '',
    full_name: '',
    password: '',
    role: 'courier',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCouriers()
  }, [fetchCouriers])

  function openCreateModal() {
    setFormData({ email: '', full_name: '', password: '', role: 'courier' })
    setFormErrors({})
    setIsModalOpen(true)
  }

  async function handleSubmit() {
    const validation = courierSchema.safeParse(formData)
    if (!validation.success) {
      const errors: Record<string, string> = {}
      validation.error.errors.forEach((e) => {
        if (e.path[0]) errors[e.path[0] as string] = e.message
      })
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      await createCourier(formData)
      showToast('Courier created. They will receive a confirmation email.', 'success')
      setIsModalOpen(false)
      fetchCouriers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create courier', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await toggleCourierActive(id, !currentActive)
      showToast(`Courier ${currentActive ? 'deactivated' : 'activated'}`, 'success')
      fetchCouriers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operation failed', 'error')
    }
  }

  function updateField(field: keyof CourierFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Couriers</h1>
        <Button onClick={openCreateModal}>Add Courier</Button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : couriers.length === 0 ? (
        <EmptyState
          title="No couriers yet"
          description="Add your first courier to get started"
          action={<Button onClick={openCreateModal}>Add Courier</Button>}
        />
      ) : (
        <div className="bg-white rounded-lg border border-surface-dark overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-dark">
              {couriers.map((courier) => (
                <tr key={courier.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text">{courier.full_name}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      courier.role === 'admin' ? 'bg-navy/10 text-navy' : 'bg-surface text-text-light'
                    }`}>
                      {courier.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-light hidden md:table-cell">
                    {courier.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      courier.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>
                      {courier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(courier.id, courier.is_active)}
                      className={`text-xs font-medium hover:underline ${
                        courier.is_active ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {courier.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Courier"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            error={formErrors.full_name}
            placeholder="Marco Rossi"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={formErrors.email}
            placeholder="marco@estela.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            error={formErrors.password}
            placeholder="Minimum 6 characters"
            required
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => updateField('role', e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-surface-dark bg-white text-text focus:outline-none focus:ring-2 focus:ring-navy"
            >
              <option value="courier">Courier</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <p className="text-xs text-text-light">
            The new user will receive a confirmation email at the provided address.
          </p>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} isLoading={isSubmitting} fullWidth>
              Create Courier
            </Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
