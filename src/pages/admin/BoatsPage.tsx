import { useState, useEffect } from 'react'
import { useBoats } from '@/hooks/useBoats'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { boatSchema, type BoatFormData } from '@/lib/validators'
import type { Boat } from '@/types/database'

export function BoatsPage() {
  const { boats, isLoading, fetchBoats, createBoat, updateBoat, deleteBoat } = useBoats()
  const { showToast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null)
  const [formData, setFormData] = useState<BoatFormData>({
    name: '',
    berth_location: '',
    captain_name: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchBoats()
  }, [fetchBoats])

  function openCreateModal() {
    setEditingBoat(null)
    setFormData({ name: '', berth_location: '', captain_name: '', notes: '' })
    setFormErrors({})
    setIsModalOpen(true)
  }

  function openEditModal(boat: Boat) {
    setEditingBoat(boat)
    setFormData({
      name: boat.name,
      berth_location: boat.berth_location ?? '',
      captain_name: boat.captain_name ?? '',
      notes: boat.notes ?? '',
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  async function handleSubmit() {
    const validation = boatSchema.safeParse(formData)
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
      if (editingBoat) {
        await updateBoat(editingBoat.id, formData)
        showToast('Boat updated', 'success')
      } else {
        await createBoat(formData)
        showToast('Boat created', 'success')
      }
      setIsModalOpen(false)
      fetchBoats()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Operation failed', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(boat: Boat) {
    if (!confirm(`Delete "${boat.name}"?`)) return

    try {
      await deleteBoat(boat.id)
      showToast('Boat deleted', 'success')
      fetchBoats()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  function updateField(field: keyof BoatFormData, value: string) {
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
        <h1 className="text-2xl font-bold text-text">Boats</h1>
        <Button onClick={openCreateModal}>Add Boat</Button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-12" />
      ) : boats.length === 0 ? (
        <EmptyState
          title="No boats yet"
          description="Add your first boat to get started"
          action={<Button onClick={openCreateModal}>Add Boat</Button>}
        />
      ) : (
        <div className="bg-white rounded-lg border border-surface-dark overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase hidden sm:table-cell">Berth</th>
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase hidden md:table-cell">Captain</th>
                <th className="px-4 py-3 text-xs font-medium text-text-light uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-dark">
              {boats.map((boat) => (
                <tr key={boat.id}>
                  <td className="px-4 py-3 text-sm font-medium text-text">{boat.name}</td>
                  <td className="px-4 py-3 text-sm text-text-light hidden sm:table-cell">
                    {boat.berth_location ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-light hidden md:table-cell">
                    {boat.captain_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(boat)}
                        className="text-xs text-navy font-medium hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(boat)}
                        className="text-xs text-danger font-medium hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBoat ? 'Edit Boat' : 'Add Boat'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            error={formErrors.name}
            placeholder="M/Y Lady Nora"
            required
          />
          <Input
            label="Berth Location"
            value={formData.berth_location ?? ''}
            onChange={(e) => updateField('berth_location', e.target.value)}
            placeholder="Port Adriano, Berth 42"
          />
          <Input
            label="Captain Name"
            value={formData.captain_name ?? ''}
            onChange={(e) => updateField('captain_name', e.target.value)}
            placeholder="Capt. James Morrison"
          />
          <Input
            label="Notes"
            value={formData.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Any notes..."
          />

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} isLoading={isSubmitting} fullWidth>
              {editingBoat ? 'Update' : 'Create'}
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
