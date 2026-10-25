import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

const ToastContext = createContext(null);

const VARIANT_ICONS = {
  success: 'bi-check-circle-fill',
  danger: 'bi-exclamation-triangle-fill',
  warning: 'bi-exclamation-circle-fill',
  info: 'bi-info-circle-fill',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback((message, variant = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.slice(-3), { id, message, variant }]);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position="top-end" className="p-3 toast-stack" containerPosition="fixed">
        {toasts.map((t) => (
          <Toast key={t.id} onClose={() => remove(t.id)} delay={4500} autohide className={`toast-${t.variant}`}>
            <Toast.Body className="d-flex align-items-start gap-2" role={t.variant === 'danger' ? 'alert' : 'status'}>
              <i className={`bi ${VARIANT_ICONS[t.variant] || VARIANT_ICONS.info} mt-1`} aria-hidden="true" />
              <span className="flex-grow-1">{t.message}</span>
              <button type="button" className="btn-close btn-close-white ms-2" aria-label="Close" onClick={() => remove(t.id)} />
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
