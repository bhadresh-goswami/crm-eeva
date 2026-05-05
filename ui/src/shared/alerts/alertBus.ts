export type AlertType = 'success' | 'error' | 'warning' | 'info'

export type ToastPayload = {
  type: AlertType
  message: string
  title?: string
  durationMs?: number
}

export type ModalPayload = {
  type?: AlertType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
}

type Bridge = {
  showToast: (payload: ToastPayload) => void
  showAlert: (payload: ModalPayload) => void
  showConfirm: (payload: ModalPayload) => void
}

let bridge: Bridge | null = null

export const registerAlertBridge = (nextBridge: Bridge | null) => {
  bridge = nextBridge
}

export const alertBus = {
  showToast: (payload: ToastPayload) => bridge?.showToast(payload),
  showAlert: (payload: ModalPayload) => bridge?.showAlert(payload),
  showConfirm: (payload: ModalPayload) => bridge?.showConfirm(payload),
}
