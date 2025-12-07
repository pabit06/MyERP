import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { validateRequest } from '../middleware/validate-request.js';
import { loginSchema, memberLoginSchema } from '../validators/auth.js';
import { authController } from '../controllers/AuthController.js';

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     tags: [Authentication]
 */
router.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler((req, res) => authController.login(req, res))
);

/**
 * @swagger
 * /auth/member-login:
 *   post:
 *     summary: Member login
 *     description: Authenticate member and return JWT token
 *     tags: [Authentication]
 */
router.post(
  '/member-login',
  validateRequest(memberLoginSchema),
  asyncHandler((req, res) => authController.memberLogin(req, res))
);

/**
 * GET /auth/me
 * Get current user information (protected route)
 */
router.get(
  '/me',
  authenticate,
  asyncHandler((req, res) => authController.getMe(req, res))
);

export default router;
