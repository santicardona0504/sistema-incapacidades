import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [mensajes, setMensajes] = useState([]);

  const notificar = useCallback((mensaje, variante = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setMensajes((actuales) => [...actuales, { id, mensaje, variante }]);
    window.setTimeout(() => {
      setMensajes((actuales) => actuales.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const valor = useMemo(() => ({
    notificar,
    exito: (mensaje) => notificar(mensaje, 'success'),
    error: (mensaje) => notificar(mensaje, 'danger'),
    aviso: (mensaje) => notificar(mensaje, 'warning')
  }), [notificar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3">
        {mensajes.map((item) => (
          <div key={item.id} className={`toast show align-items-center text-bg-${item.variante} border-0`} role="status">
            <div className="d-flex">
              <div className="toast-body">{item.mensaje}</div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Cerrar"
                onClick={() => setMensajes((actuales) => actuales.filter((mensaje) => mensaje.id !== item.id))}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast debe usarse dentro de ToastProvider');
  return contexto;
}
