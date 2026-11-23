import { prisma } from '../../utils/prisma.js';

export async function registrarAuditoria({
  usuarioId,
  accion,
  entidad,
  entidadId,
  detalles,
  req,
  client = prisma
}) {
  const direccionIp = req?.ip || req?.socket?.remoteAddress;

  return client.bitacoraAuditoria.create({
    data: {
      usuarioId,
      accion,
      entidad,
      entidadId,
      detalles,
      direccionIp: direccionIp ? direccionIp.slice(0, 45) : null
    }
  });
}
