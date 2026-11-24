export function PageHeader({ titulo, subtitulo, acciones }) {
  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h1 className="h3 fw-bold text-dark mb-1">{titulo}</h1>
        {subtitulo && <p className="text-muted mb-0 small">{subtitulo}</p>}
      </div>
      {acciones && <div className="d-flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}
