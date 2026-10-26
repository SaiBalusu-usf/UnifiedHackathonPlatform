import { toast as notify } from 'sonner'

// Adapter for the existing form API, using the installed Sonner notification UI.
const toast = ({ title, description, variant } = {}) => {
  const options = { description }
  const id = variant === 'destructive' ? notify.error(title, options) : notify(title, options)
  return { id, dismiss: () => notify.dismiss(id) }
}
export const useToast = () => ({ toast, dismiss: notify.dismiss })
export { toast }
