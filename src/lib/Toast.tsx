import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 inset-x-0 z-[60] flex justify-center pointer-events-none px-4">
        {msg && <div className="pointer-events-auto px-4 py-2.5 rounded-xl bg-[#111512] border border-[#39E477]/40 text-sm text-[#F6F8F6] shadow-xl">{msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
};
