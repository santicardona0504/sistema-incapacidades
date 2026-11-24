export function Loading({ mensaje = 'Cargando información…' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-3" role="status">
      <div className="spinner-border text-primary" style={{ width: '2.2rem', height: '2.2rem' }} />
      <span className="text-muted small">{mensaje}</span>
    </div>
  );
}

export function EmptyState({ mensaje = 'No hay registros para mostrar' }) {
  return (
    <div className="text-center text-muted py-5">
      <div className="display-6 mb-2">∅</div>
      <p className="mb-0">{mensaje}</p>
    </div>
  );
}

export function ErrorState({ mensaje, onReintentar }) {
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
      <span>{mensaje}</span>
      {onReintentar && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
