import { X } from 'lucide-react';

/**
 * Hộp thoại trong app (không dùng window.confirm / prompt → tránh "localhost says").
 */
export default function AppDialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  busy = false,
  variant = 'default',
  hideCancel = false,
}) {
  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
      : variant === 'warning'
        ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
        : 'bg-[#14B8A6] hover:bg-[#0da090] shadow-[#14B8A6]/20';

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-[#0F3A40]/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[28px] shadow-2xl max-w-md w-full border border-white p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 id="app-dialog-title" className="text-lg font-bold text-[#0F3A40] leading-snug pr-2">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-xl hover:bg-[#F2FCFD] text-[#4A787C] shrink-0 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {description ? (
          <p className="text-[14px] text-[#4A787C] leading-relaxed mb-4">{description}</p>
        ) : null}

        {children}

        <div className={`flex flex-col-reverse sm:flex-row gap-3 ${children ? 'mt-5' : 'mt-2'}`}>
          {!hideCancel ? (
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 py-3 rounded-2xl border border-[#BCE1E5] text-[#4A787C] font-bold text-[14px] hover:bg-[#F2FCFD] disabled:opacity-50"
            >
              {cancelText}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 py-3 rounded-2xl text-white font-bold text-[14px] shadow-lg disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? 'Đang xử lý…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
