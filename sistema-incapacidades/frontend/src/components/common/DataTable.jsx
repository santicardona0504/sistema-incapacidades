import { EmptyState, Loading } from './States.jsx';

export function DataTable({
  columnas,
  filas,
  cargando,
  total = 0,
  pagina = 1,
  totalPaginas = 1,
  onPagina,
  acciones,
  vacio = 'No hay registros para mostrar'
}) {
  if (cargando) return <Loading />;

  return (
    <>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              {columnas.map((columna) => (
                <th key={columna.clave ?? columna.titulo} scope="col" className="text-uppercase small text-muted fw-semibold">
                  {columna.titulo}
                </th>
              ))}
              {acciones && <th scope="col" className="text-end text-uppercase small text-muted fw-semibold">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={columnas.length + (acciones ? 1 : 0)}><EmptyState mensaje={vacio} /></td>
              </tr>
            ) : filas.map((fila, indice) => (
              <tr key={fila.id ?? indice}>
                {columnas.map((columna) => (
                  <td key={columna.clave ?? columna.titulo}>
                    {columna.render ? columna.render(fila) : (fila[columna.clave] ?? '—')}
                  </td>
                ))}
                {acciones && <td className="text-end"><div className="btn-group btn-group-sm">{acciones(fila)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && onPagina && (
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 p-3 border-top">
          <small className="text-muted">
            Página {pagina} de {totalPaginas} · {total} registros
          </small>
          <div className="btn-group btn-group-sm">
            <button type="button" className="btn btn-outline-secondary" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
              Anterior
            </button>
            <button type="button" className="btn btn-outline-secondary" disabled={pagina >= totalPaginas} onClick={() => onPagina(pagina + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      )}
    </>
  );
}
