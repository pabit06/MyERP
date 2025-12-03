import express from 'express';
import cors from 'cors';
import saasRoutes from './routes/saas.js';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import membersRoutes from './routes/members.js';
import memberWorkflowRoutes from './routes/member-workflow.js';
import savingsRoutes from './routes/savings.js';
import loansRoutes from './routes/loans.js';
import sharesRoutes from './routes/shares.js';
import dmsRoutes from './routes/dms.js';
import dartaRoutes from './routes/darta.js';
import patraChalaniRoutes from './routes/patra-chalani.js';
import hrmRoutes from './routes/hrm.js';
import governanceRoutes from './routes/governance.js';
import inventoryRoutes from './routes/inventory.js';
import complianceRoutes from './routes/compliance.js';
import publicRoutes from './routes/public.js';
import subscriptionRoutes from './routes/subscription.js';
import accountingRoutes from './routes/accounting.js';
import dayBookRoutes from './routes/cbs/day-book.js';
import reportsRoutes from './routes/reports.js';
import workflowRoutes from './routes/workflow.js';
import notificationsRoutes from './routes/notifications.js';
import systemAdminRoutes from './routes/system-admin.js';
import { initializeAmlMonitoring } from './services/aml/monitor.js';
import { registerAccountingHooks } from './hooks/accounting-hooks.js';
import { registerLoansHooks } from './hooks/loans-hooks.js';
import { registerSavingsHooks } from './hooks/savings-hooks.js';
import { registerDefaultWorkflows } from './lib/workflow-engine.js';
import { env, logger } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import {
  helmetConfig,
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  requestSizeLimit,
  trustProxy,
} from './middleware/security.js';

const app = express();
const PORT = env.PORT;
const API_PREFIX = env.API_PREFIX;

// Trust proxy (important for rate limiting behind reverse proxies)
if (trustProxy) {
  app.set('trust proxy', 1);
  logger.info('Trust proxy enabled (for production behind reverse proxy)');
}

// Security headers (must be early in middleware chain)
app.use(helmetConfig);

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Request size limits
app.use(express.json({ limit: requestSizeLimit.json }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimit.urlencoded }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check (no rate limiting)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Routes with rate limiting
// Auth routes with stricter rate limiting
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);

// All other API routes with general rate limiting
app.use(`${API_PREFIX}/saas`, apiLimiter, saasRoutes);
app.use(`${API_PREFIX}/onboarding`, apiLimiter, onboardingRoutes);
app.use(`${API_PREFIX}/members`, apiLimiter, membersRoutes);
app.use(`${API_PREFIX}/member-workflow`, apiLimiter, memberWorkflowRoutes);
app.use(`${API_PREFIX}/savings`, apiLimiter, savingsRoutes);
app.use(`${API_PREFIX}/loans`, apiLimiter, loansRoutes);
app.use(`${API_PREFIX}/shares`, apiLimiter, sharesRoutes);
app.use(`${API_PREFIX}/dms`, apiLimiter, dmsRoutes);
app.use(`${API_PREFIX}/darta`, apiLimiter, dartaRoutes);
app.use(`${API_PREFIX}/patra-chalani`, apiLimiter, patraChalaniRoutes);
app.use(`${API_PREFIX}/hrm`, apiLimiter, hrmRoutes);
app.use(`${API_PREFIX}/governance`, apiLimiter, governanceRoutes);
app.use(`${API_PREFIX}/inventory`, apiLimiter, inventoryRoutes);
app.use(`${API_PREFIX}/compliance`, apiLimiter, complianceRoutes);
app.use(`${API_PREFIX}/public`, apiLimiter, publicRoutes);
app.use(`${API_PREFIX}/subscription`, apiLimiter, subscriptionRoutes);
app.use(`${API_PREFIX}/accounting`, apiLimiter, accountingRoutes);
app.use(`${API_PREFIX}/cbs/day-book`, apiLimiter, dayBookRoutes);
app.use(`${API_PREFIX}/reports`, apiLimiter, reportsRoutes);
app.use(`${API_PREFIX}/workflow`, apiLimiter, workflowRoutes);
app.use(`${API_PREFIX}/notifications`, apiLimiter, notificationsRoutes);
app.use(`${API_PREFIX}/system-admin`, apiLimiter, systemAdminRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize hooks system
registerAccountingHooks();
registerLoansHooks();
registerSavingsHooks();

// Initialize workflow engine
registerDefaultWorkflows();

// Initialize AML monitoring
initializeAmlMonitoring();

app.listen(PORT, () => {
  logger.info(`🚀 Backend server running on port ${PORT}`);
  logger.info(`📡 API available at http://localhost:${PORT}${API_PREFIX}`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});
