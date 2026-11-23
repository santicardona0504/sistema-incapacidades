import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { failure } from '../../utils/api-response.js';
import { requireAuth, optionalAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { loginSchema } from './auth.validation.js';
import * as controller from './auth.controller.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => failure(res, 429, 'Demasiados intentos. Intenta nuevamente más tarde.')
});

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, validate(loginSchema), controller.login);
authRoutes.get('/me', requireAuth, controller.me);
authRoutes.post('/logout', optionalAuth, controller.logout);
