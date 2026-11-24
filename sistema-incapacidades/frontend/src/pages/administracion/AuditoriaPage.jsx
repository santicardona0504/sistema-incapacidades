import { useMemo, useState } from 'react';
import { auditoriaService } from '../../services/gestion.service.js';
import { ManagePage } from '../../components/common/ManagePage.jsx';
import { formatoFechaHora } from '../../utils/formato.js';

const servicio = { listar: (filtros) => auditoriaService.listar(filtros) };

export function AuditoriaPage() {
  const [detalle, setDetalle] = useState(null);

  const columnas = useMemo(() => [
    { titulo: 'Fecha', clave: 'creadoEn', render: (fila) => formatoFechaHora(fila.creadoEn) },
    { titulo: 'Acción', clave: 'accion', render: (fila) => <span className="badge bg-light text-dark border">{fila.accion}</span> },
    { titulo: 'Entidad', clave: 'entidad', render: (fila) => `${fila.entidad} #${fila.entidadId ?? '—'}` },
    { titulo: 'Usuario', clave: 'usuario', render: (fila) => fila.usuario?.nombre ?? 'Sistema' },
    { titulo: 'Dirección IP', clave: 'direccionIp', render: (fila) => fila.direccionIp ?? '—' }
  ], []);

  const filtrosCampos = useMemo(() => [
    { clave: 'accion', etiqueta: 'Acción', placeholder: 'Ej. LOGIN' },
    { clave: 'entidad', etiqueta: 'Entidad', placeholder: 'Ej. COBRO' },
    { clave: 'entidadId', etiqueta: 'ID entidad', placeholder: 'Ej. 12' },
    { clave: 'usuarioId', etiqueta: 'ID usuario', placeholder: 'Ej. 1' },
    { clave: 'fechaDesde', etiqueta: 'Desde', tipo: 'date' },
    { clave: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date' }
  ], []);

  return (
    <>
      <ManagePage
        titulo="Auditoría"
        subtitulo="Registro de acciones y eventos del sistema"
        permisoVer="AUDITORIA_VER"
        servicio={servicio}
        coleccion="eventos"
        columnas={columnas}
        filtrosCampos={filtrosCampos}
        accionesFila={(fila) => (
          <button type="button" className="btn btn-outline-primary" onClick={() => setDetalle(fila)}>Detalle</button>
        )}
        textoVacio="No hay eventos de auditoría"
      />

      {detalle && (
        <div className="modal d-block" role="dialog" aria-modal="true">
          <div className="modal-backdrop show" style={{ opacity: 0.45 }} onClick={() => setDetalle(null)} />
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">{detalle.accion} · {detalle.entidad}</h5>
                <button type="button" className="btn-close" onClick={() => setDetalle(null)} />
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6"><p className="detail-label">Fecha</p><p className="detail-value">{formatoFechaHora(detalle.creadoEn)}</p></div>
                  <div className="col-md-6"><p className="detail-label">Usuario</p><p className="detail-value">{detalle.usuario?.nombre ?? 'Sistema'} · {detalle.usuario?.correo ?? '—'}</p></div>
                </div>
                <p className="detail-label">Detalles</p>
                <pre className="bg-light border rounded p-3 small">{JSON.stringify(detalle.detalles, null, 2) ?? 'Sin detalles'}</pre>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
