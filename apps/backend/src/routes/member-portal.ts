import express from 'express';
import { memberAuthController } from '../controllers/MemberAuthController.js';
import { memberPortalController } from '../controllers/MemberPortalController.js';
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

router.get(
  '/dashboard',
  authenticateMember,
  asyncHandler((req, res) => memberPortalController.getDashboardSummary(req, res))
);

router.get(
  '/accounts',
  authenticateMember,
  asyncHandler((req, res) => memberPortalController.getAccounts(req, res))
);

router.get(
  '/loans',
  authenticateMember,
  asyncHandler((req, res) => memberPortalController.getLoans(req, res))
);

router.get(
  '/notices',
  authenticateMember,
  asyncHandler((req, res) => memberPortalController.getNotices(req, res))
);

router.get(
  '/accounts/:accountId/statement',
  authenticateMember,
  asyncHandler((req, res) => memberPortalController.getStatements(req, res))
);

router.get(
  '/accounts/:accountId/qr',
  authenticateMember,
  asyncHandler((req, res) => memberPortalController.getQRCode(req, res))
);

export const memberPortalRouter = router;
