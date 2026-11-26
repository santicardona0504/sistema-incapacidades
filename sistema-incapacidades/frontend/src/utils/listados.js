/**
 * Obtiene todas las páginas de un listado para que los selectores muestren
 * todos los registros creados por el usuario. La API acepta como máximo 100
 * registros por página, así que se recorre con paginación.
 */
export async function listarTodo(fnListar, filtros = {}, clave) {
  const limite = 100;
  const resultados = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const respuesta = await fnListar({ ...filtros, pagina, limite });
    const datos = respuesta.data ?? {};
    resultados.push(...(datos[clave] ?? []));
    totalPaginas = Number(datos.totalPaginas ?? 1);
    pagina += 1;
  } while (pagina <= totalPaginas);

  return {
    data: {
      [clave]: resultados,
      total: resultados.length,
      pagina: 1,
      limite,
      totalPaginas: 1
    }
  };
}
