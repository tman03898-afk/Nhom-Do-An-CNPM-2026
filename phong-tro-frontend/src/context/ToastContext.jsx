import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md
              animate-in slide-in-from-right-full duration-300
              ${toast.type === 'success' ? 'bg-[#F2FCFD]/90 border-[#14B8A6]/30 text-[#0F3A40]' : 'bg-red-50/90 border-red-200 text-red-900'}
            `}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#14B8A6]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            
            <p className="text-[14px] font-bold pr-2">{toast.message}</p>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-[#0F3A40]/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#82ABB0]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
