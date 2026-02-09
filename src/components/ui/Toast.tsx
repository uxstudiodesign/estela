import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { TOAST_DURATION_MS } from '@/config/constants'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  readonly id: number
  readonly message: string
  readonly type: ToastType
}

interface ToastContextValue {
  readonly showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:w-96">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id))
          }} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  warning: 'bg-warning text-white',
}

function ToastItem({ toast, onDismiss }: { readonly toast: Toast; readonly onDismiss: () => void }) {
  return (
    <div className={`
      pointer-events-auto px-4 py-3 rounded-lg shadow-lg
      flex items-center justify-between gap-2
      animate-[slideUp_0.3s_ease-out]
      ${typeClasses[toast.type]}
    `.trim()}>
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
