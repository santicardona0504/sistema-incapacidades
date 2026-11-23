import { AppError } from '../utils/api-response.js';

export function validate(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse({
      body: req.body ?? {},
      params: req.params ?? {},
      query: req.query ?? {}
    });

    if (!resultado.success) {
      const detalles = resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.') || 'general',
        mensaje: issue.message
      }));

      return next(new AppError(400, 'Datos inválidos', detalles));
    }

    req.validated = resultado.data;
    return next();
  };
}
