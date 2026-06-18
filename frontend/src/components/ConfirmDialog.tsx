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
        className="bg-[#24283b] border border-[#292e42] rounded-lg shadow-xl w-full max-w-md p-6 mx-4"
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-[#c0caf5] mb-2">
          {title}
        </h2>
        <p id="confirm-message" className="text-sm text-[#a9b1d6] mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-[#3b4261] hover:bg-[#565f89] rounded transition-colors"
            autoFocus
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-[#7aa2f7] hover:bg-[#89b4fa] text-[#1a1b26] rounded transition-colors"
          >
            Substituir
          </button>
        </div>
      </div>
    </div>
  )
}
