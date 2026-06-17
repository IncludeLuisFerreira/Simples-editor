interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-[#1a1a2e] border border-[#0f3460] rounded-lg shadow-xl w-full max-w-md p-6 mx-4"
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-gray-200 mb-2">
          {title}
        </h2>
        <p id="confirm-message" className="text-sm text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            autoFocus
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 rounded transition-colors"
          >
            Substituir
          </button>
        </div>
      </div>
    </div>
  )
}
