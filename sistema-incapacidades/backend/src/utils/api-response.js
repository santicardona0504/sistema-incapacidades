export class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function success(res, data, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    message,
    data
  });
}

export function failure(res, statusCode, message, details) {
  return res.status(statusCode).json({
    ok: false,
    message,
    ...(details ? { details } : {})
  });
}
