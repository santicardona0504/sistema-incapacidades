import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { toEmpleadoDto } from './empleado.dto.js';

const includeEmpleado = {
  _count: { select: { incapacidades: true } }
};

function construirFiltros(filtros) {
  const where = {};

  if (filtros.activo !== undefined) {
    where.activo = filtros.activo === 'true';
  }

  if (filtros.area) {
    where.area = { contains: filtros.area, mode: 'insensitive' };
  }

  if (filtros.buscar) {
    where.OR = [
      { identificacion: { contains: filtros.buscar, mode: 'insensitive' } },
      { nombres: { contains: filtros.buscar, mode: 'insensitive' } },
      { apellidos: { contains: filtros.buscar, mode: 'insensitive' } }
    ];
  }

  return where;
}

export async function listarEmpleados(filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, empleados] = await prisma.$transaction([
    prisma.empleado.count({ where }),
    prisma.empleado.findMany({
      where,
      include: includeEmpleado,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { apellidos: 'asc' }
    })
  ]);

  return {
    empleados: empleados.map(toEmpleadoDto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function obtenerEmpleado(id) {
  const empleado = await prisma.empleado.findUnique({
    where: { id },
    include: {
      ...includeEmpleado,
      incapacidades: {
        take: 5,
        orderBy: { creadoEn: 'desc' },
        select: {
          id: true,
          codigo: true,
          estado: true,
          fechaInicio: true,
          fechaFin: true,
          entidad: { select: { id: true, nombre: true, tipo: true } }
        }
      }
    }
  });

  if (!empleado) {
    throw new AppError(404, 'Empleado no encontrado');
  }

  return {
    ...toEmpleadoDto(empleado),
    incapacidadesRecientes: empleado.incapacidades
  };
}

export async function historialIncapacidades(empleadoId) {
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: { id: true, nombres: true, apellidos: true }
  });

  if (!empleado) {
    throw new AppError(404, 'Empleado no encontrado');
  }

  const incapacidades = await prisma.incapacidad.findMany({
    where: { empleadoId },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      origen: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      dias: true,
      fechaRecepcion: true,
      entidad: { select: { id: true, nombre: true, tipo: true } }
    },
    orderBy: { fechaRecepcion: 'desc' }
  });

  return {
    empleado: {
      id: empleado.id,
      nombreCompleto: `${empleado.nombres} ${empleado.apellidos}`
    },
    incapacidades
  };
}

async function validarIdentificacionDisponible(identificacion, idExcluido) {
  const existente = await prisma.empleado.findUnique({ where: { identificacion } });

  if (existente && existente.id !== idExcluido) {
    throw new AppError(409, 'La identificación ya está registrada');
  }
}

export async function crearEmpleado(datos, req) {
  await validarIdentificacionDisponible(datos.identificacion);

  const empleado = await prisma.$transaction(async (tx) => {
    const creado = await tx.empleado.create({ data: datos, include: includeEmpleado });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'EMPLEADO_CREAR',
      entidad: 'EMPLEADO',
      entidadId: creado.id,
      req,
      client: tx
    });

    return creado;
  });

  return toEmpleadoDto(empleado);
}

export async function editarEmpleado(id, datos, req) {
  const empleado = await prisma.empleado.findUnique({ where: { id } });

  if (!empleado) {
    throw new AppError(404, 'Empleado no encontrado');
  }

  if (datos.identificacion) {
    await validarIdentificacionDisponible(datos.identificacion, id);
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.empleado.update({
      where: { id },
      data: datos,
      include: includeEmpleado
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'EMPLEADO_EDITAR',
      entidad: 'EMPLEADO',
      entidadId: id,
      detalles: { campos: Object.keys(datos) },
      req,
      client: tx
    });

    return resultado;
  });

  return toEmpleadoDto(actualizado);
}

export async function cambiarEstadoEmpleado(id, activo, req) {
  const empleado = await prisma.empleado.findUnique({ where: { id } });

  if (!empleado) {
    throw new AppError(404, 'Empleado no encontrado');
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.empleado.update({
      where: { id },
      data: { activo },
      include: includeEmpleado
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: activo ? 'EMPLEADO_ACTIVAR' : 'EMPLEADO_DESACTIVAR',
      entidad: 'EMPLEADO',
      entidadId: id,
      req,
      client: tx
    });

    return resultado;
  });

  return toEmpleadoDto(actualizado);
}
