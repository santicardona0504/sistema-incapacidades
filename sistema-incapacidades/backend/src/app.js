import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { failure } from './utils/api-response.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { usuarioRoutes } from './modules/usuarios/usuario.routes.js';
import { empleadoRoutes } from './modules/empleados/empleado.routes.js';
import { incapacidadRoutes } from './modules/incapacidades/incapacidad.routes.js';
import { radicacionRoutes } from './modules/radicaciones/radicacion.routes.js';
import { historialRoutes } from './modules/historial/historial.routes.js';
import { documentoRoutes } from './modules/documentos/documento.routes.js';
import { entidadRoutes } from './modules/entidades/entidad.routes.js';
import { cobroRoutes } from './modules/cobros/cobro.routes.js';
import { pagoRoutes } from './modules/pagos/pago.routes.js';
import { conciliacionRoutes } from './modules/conciliaciones/conciliacion.routes.js';
import { alertaRoutes } from './modules/alertas/alerta.routes.js';
import { reporteRoutes } from './modules/reportes/reporte.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { auditoriaRoutes } from './modules/auditoria/auditoria.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => failure(res, 429, 'Demasiadas solicitudes. Intenta nuevamente más tarde.')
});

app.use('/api', apiLimiter);
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', rolesRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/incapacidades', incapacidadRoutes);
app.use('/api/radicaciones', radicacionRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/entidades', entidadRoutes);
app.use('/api/cobros', cobroRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/conciliaciones', conciliacionRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auditoria', auditoriaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
