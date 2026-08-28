import { apiRequest } from '../../../api/client'

type ForgotPasswordPayload = {
  email: string
}

type ChangePasswordPayload = {
  current_password: string
  new_password: string
  confirm_password: string
}

export const requestPasswordReset = async (payload: ForgotPasswordPayload) => {
  await apiRequest('/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const changePassword = async (payload: ChangePasswordPayload) => {
  await apiRequest('/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
