export function StatCard({ titulo, valor, subtitulo, icono, variante = 'primary' }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card stat-card border-0 shadow-sm h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div className={`stat-icon bg-${variante} bg-opacity-10 text-${variante}`}>
            <span aria-hidden="true">{icono ?? '◆'}</span>
          </div>
          <div className="min-width-0">
            <p className="text-muted small text-uppercase fw-semibold mb-1">{titulo}</p>
            <h3 className="h4 mb-0 fw-bold text-dark">{valor}</h3>
            {subtitulo && <small className="text-muted">{subtitulo}</small>}
          </div>
        </div>
      </div>
    </div>
  );
}
