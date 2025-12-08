import express from 'express';
import { memberAuthController } from '../controllers/MemberAuthController.js';
import { authenticateMember } from '../middleware/memberAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = express.Router();

// Public routes
router.post(
  '/auth/login',
  asyncHandler((req, res) => memberAuthController.login(req, res))
);

// Protected routes (require member token)
router.get(
  '/auth/me',
  authenticateMember,
  asyncHandler((req, res) => memberAuthController.getMe(req, res))
);
router.post(
  '/auth/change-password',
  authenticateMember,
  asyncHandler((req, res) => memberAuthController.changePassword(req, res))
);

// Future routes:
// router.get('/accounts', authenticateMember, ...);
// router.get('/loans', authenticateMember, ...);

export const memberPortalRouter = router;
