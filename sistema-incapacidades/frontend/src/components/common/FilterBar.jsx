export function FilterBar({ campos, valores, onChange, onBuscar, onLimpiar }) {
  const actualizar = (clave, valor) => onChange({ ...valores, [clave]: valor });

  return (
    <form
      className="row g-2 align-items-end mb-3"
      onSubmit={(evento) => { evento.preventDefault(); onBuscar(); }}
    >
      {campos.map((campo) => (
        <div key={campo.clave} className="col-12 col-sm-6 col-lg-3">
          <label className="form-label small text-muted mb-1" htmlFor={`filtro-${campo.clave}`}>
            {campo.etiqueta}
          </label>
          {campo.tipo === 'select' ? (
            <select
              id={`filtro-${campo.clave}`}
              className="form-select form-select-sm"
              value={valores[campo.clave] ?? ''}
              onChange={(evento) => actualizar(campo.clave, evento.target.value)}
            >
              <option value="">Todos</option>
              {(campo.opciones ?? []).map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
              ))}
            </select>
          ) : (
            <input
              id={`filtro-${campo.clave}`}
              type={campo.tipo ?? 'text'}
              className="form-control form-control-sm"
              placeholder={campo.placeholder}
              value={valores[campo.clave] ?? ''}
              onChange={(evento) => actualizar(campo.clave, evento.target.value)}
            />
          )}
        </div>
      ))}
      <div className="col-12 col-sm-6 col-lg-3 d-flex gap-2">
        <button type="submit" className="btn btn-sm btn-primary flex-fill">Buscar</button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onLimpiar}>Limpiar</button>
      </div>
    </form>
  );
}
