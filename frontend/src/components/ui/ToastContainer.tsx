import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgba(10,31,68,0.1)] border backdrop-blur-md min-w-[280px] animate-in slide-in-from-right-4 fade-in duration-300`}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : toast.type === 'success' ? 'rgba(0, 201, 167, 0.4)' : 'rgba(111, 216, 240, 0.4)',
          }}
        >
          {toast.type === 'error' && <AlertCircle className="text-red-500" size={20} />}
          {toast.type === 'success' && <CheckCircle className="text-[#00c9a7]" size={20} />}
          {toast.type === 'info' && <Info className="text-[#6fd8f0]" size={20} />}
          
          <span className="text-sm font-medium text-[#0a1f44] flex-1">{toast.message}</span>
          
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-[#0a1f44] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
