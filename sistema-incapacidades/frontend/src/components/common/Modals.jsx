import { useEffect } from 'react';

export function FormModal({ titulo, campos, valores, onChange, onSubmit, onClose, guardando, error, tamano = 'lg' }) {
  useEffect(() => {
    const manejarTecla = (evento) => { if (evento.key === 'Escape') onClose(); };
    document.addEventListener('keydown', manejarTecla);
    return () => document.removeEventListener('keydown', manejarTecla);
  }, [onClose]);

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal-backdrop show" style={{ opacity: 0.45 }} onClick={onClose} />
      <div className={`modal-dialog modal-${tamano} modal-dialog-centered modal-dialog-scrollable`}>
        <div className="modal-content border-0 shadow">
          <form onSubmit={(evento) => { evento.preventDefault(); onSubmit(); }}>
            <div className="modal-header bg-light">
              <h5 className="modal-title fw-bold">{titulo}</h5>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger small mb-3">{error}</div>}
              <div className="row g-3">
                {campos.map((campo) => {
                  const valor = valores[campo.clave] ?? (campo.tipo === 'checkbox' ? false : '');
                  const id = `campo-${campo.clave}`;
                  return (
                    <div key={campo.clave} className={`col-12 ${campo.ancho ?? 'col-md-6'}`}>
                      {campo.tipo !== 'checkbox' && (
                        <label className="form-label small fw-semibold" htmlFor={id}>
                          {campo.etiqueta}{campo.requerido ? ' *' : ''}
                        </label>
                      )}
                      {campo.tipo === 'select' ? (
                        <select
                          id={id}
                          className="form-select"
                          value={valor}
                          required={campo.requerido}
                          disabled={campo.deshabilitado}
                          onChange={(evento) => onChange(campo.clave, evento.target.value)}
                        >
                          <option value="">{campo.placeholder ?? 'Seleccione…'}</option>
                          {(campo.opciones ?? []).map((opcion) => (
                            <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
                          ))}
                        </select>
                      ) : campo.tipo === 'textarea' ? (
                        <textarea
                          id={id}
                          className="form-control"
                          rows="3"
                          value={valor}
                          required={campo.requerido}
                          disabled={campo.deshabilitado}
                          placeholder={campo.placeholder}
                          onChange={(evento) => onChange(campo.clave, evento.target.value)}
                        />
                      ) : campo.tipo === 'checkbox' ? (
                        <div className="form-check mt-4">
                          <input
                            id={id}
                            type="checkbox"
                            className="form-check-input"
                            checked={Boolean(valor)}
                            disabled={campo.deshabilitado}
                            onChange={(evento) => onChange(campo.clave, evento.target.checked)}
                          />
                          <label className="form-check-label" htmlFor={id}>{campo.etiqueta}</label>
                        </div>
                      ) : (
                        <input
                          id={id}
                          type={campo.tipo ?? 'text'}
                          step={campo.tipo === 'number' ? '0.01' : undefined}
                          className="form-control"
                          value={valor}
                          required={campo.requerido}
                          disabled={campo.deshabilitado}
                          placeholder={campo.placeholder}
                          onChange={(evento) => onChange(campo.clave, evento.target.value)}
                        />
                      )}
                      {campo.ayuda && <div className="form-text">{campo.ayuda}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ titulo, mensaje, onConfirmar, onCancelar, cargando, etiqueta = 'Confirmar' }) {
  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal-backdrop show" style={{ opacity: 0.45 }} onClick={onCancelar} />
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-body p-4">
            <h5 className="fw-bold">{titulo}</h5>
            <p className="text-muted mb-0">{mensaje}</p>
          </div>
          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>Cancelar</button>
            <button type="button" className="btn btn-danger" disabled={cargando} onClick={onConfirmar}>
              {cargando ? 'Procesando…' : etiqueta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
