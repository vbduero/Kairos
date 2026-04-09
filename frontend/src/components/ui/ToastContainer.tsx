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
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] border backdrop-blur-md min-w-[280px] animate-in slide-in-from-right-4 fade-in duration-300`}
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.85)',
            borderColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : toast.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)',
          }}
        >
          {toast.type === 'error' && <AlertCircle className="text-red-400" size={20} />}
          {toast.type === 'success' && <CheckCircle className="text-emerald-400" size={20} />}
          {toast.type === 'info' && <Info className="text-indigo-400" size={20} />}
          
          <span className="text-sm font-medium text-gray-100 flex-1">{toast.message}</span>
          
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
