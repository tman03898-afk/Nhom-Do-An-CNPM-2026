import { useEffect } from 'react';
import { X } from 'lucide-react';
import LoginForm from './LoginForm';

export default function LoginModal({ open, onClose, onSuccess }) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F3A40]/45 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Đăng nhập"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[460px] max-h-[calc(100vh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-10 h-10 rounded-2xl bg-white/90 text-nest-text-secondary hover:text-nest-primary hover:bg-white shadow-lg border border-nest-primary/10 flex items-center justify-center transition-colors"
          aria-label="Đóng đăng nhập"
        >
          <X className="w-5 h-5" />
        </button>

        <LoginForm
          onSuccess={onSuccess}
          onForgotPassword={onClose}
          className="max-w-full"
        />
      </div>
    </div>
  );
}
