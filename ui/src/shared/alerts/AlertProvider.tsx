import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { registerAlertBridge, type AlertType, type ModalPayload, type ToastPayload } from './alertBus'
import './alert.css'

type ToastItem = ToastPayload & { id: string }

type AlertContextValue = {
  showToast: (payload: ToastPayload) => void
  showAlert: (payload: ModalPayload) => void
  showConfirm: (payload: ModalPayload) => void
}

const AlertContext = createContext<AlertContextValue | null>(null)

const typeMeta: Record<AlertType, { icon: string; color: string; bg: string }> = {
  success: { icon: '✓', color: '#16a34a', bg: '#ecfdf3' },
  error: { icon: '✕', color: '#dc2626', bg: '#fef2f2' },
  warning: { icon: '⚠', color: '#f59e0b', bg: '#fffbeb' },
  info: { icon: 'ⓘ', color: '#2563eb', bg: '#eff6ff' },
}

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [modal, setModal] = useState<(ModalPayload & { mode: 'alert' | 'confirm' }) | null>(null)
  const hoverRef = useRef<Record<string, boolean>>({})

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
    delete hoverRef.current[id]
  }, [])

  const showToast = useCallback((payload: ToastPayload) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev.slice(-3), { ...payload, id }])

    const duration = payload.durationMs ?? (payload.type === 'error' ? 0 : 3500)
    if (duration > 0) {
      const startedAt = Date.now()
      const tick = () => {
        if (hoverRef.current[id]) {
          setTimeout(tick, 250)
          return
        }
        if (Date.now() - startedAt >= duration) {
          closeToast(id)
          return
        }
        setTimeout(tick, 150)
      }
      setTimeout(tick, 150)
    }
  }, [closeToast])

  const showAlert = useCallback((payload: ModalPayload) => {
    setModal({ ...payload, mode: 'alert' })
  }, [])

  const showConfirm = useCallback((payload: ModalPayload) => {
    setModal({ ...payload, mode: 'confirm' })
  }, [])

  useEffect(() => {
    registerAlertBridge({ showToast, showAlert, showConfirm })
    return () => registerAlertBridge(null)
  }, [showAlert, showConfirm, showToast])

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModal(null)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  const value = useMemo(() => ({ showToast, showAlert, showConfirm }), [showAlert, showConfirm, showToast])

  return (
    <AlertContext.Provider value={value}>
      {children}

      <div className="alert-toast-stack" aria-live="polite">
        {toasts.map((toast) => {
          const meta = typeMeta[toast.type]
          return (
            <div
              key={toast.id}
              className="alert-toast"
              style={{ borderLeftColor: meta.color, background: meta.bg }}
              onMouseEnter={() => { hoverRef.current[toast.id] = true }}
              onMouseLeave={() => { hoverRef.current[toast.id] = false }}
            >
              <div className="alert-toast__icon" style={{ color: meta.color }}>{meta.icon}</div>
              <div className="alert-toast__text">
                {toast.title ? <p className="alert-toast__title">{toast.title}</p> : null}
                <p className="alert-toast__message">{toast.message}</p>
              </div>
              <button className="alert-toast__close" onClick={() => closeToast(toast.id)} aria-label="Dismiss notification">✕</button>
            </div>
          )
        })}
      </div>

      {modal ? (
        <div className="alert-modal-backdrop" onClick={() => setModal(null)}>
          <div className="alert-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal__header">
              <div
                className="alert-modal__icon"
                style={{ color: typeMeta[modal.type ?? 'info'].color, background: typeMeta[modal.type ?? 'info'].bg }}
              >
                {typeMeta[modal.type ?? 'info'].icon}
              </div>
              <h3>{modal.title}</h3>
            </div>
            <p className="alert-modal__message">{modal.message}</p>
            <div className="alert-modal__actions">
              <button className="button" onClick={() => setModal(null)}>{modal.cancelText ?? 'Cancel'}</button>
              {modal.mode === 'confirm' ? (
                <button
                  className="button button--primary"
                  onClick={() => {
                    modal.onConfirm?.()
                    setModal(null)
                  }}
                >
                  {modal.confirmText ?? 'Confirm'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AlertContext.Provider>
  )
}

export const useAlert = () => {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider')
  }
  return context
}
