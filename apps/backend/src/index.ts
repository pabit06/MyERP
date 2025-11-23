import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { initializeAmlMonitoring } from './services/aml/monitor.js';
import { registerAccountingHooks } from './hooks/accounting-hooks.js';
import { registerLoansHooks } from './hooks/loans-hooks.js';
import { registerSavingsHooks } from './hooks/savings-hooks.js';
import { registerDefaultWorkflows } from './lib/workflow-engine.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Routes
app.use(`${API_PREFIX}/saas`, saasRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/onboarding`, onboardingRoutes);
app.use(`${API_PREFIX}/members`, membersRoutes);
app.use(`${API_PREFIX}/member-workflow`, memberWorkflowRoutes);
app.use(`${API_PREFIX}/savings`, savingsRoutes);
app.use(`${API_PREFIX}/loans`, loansRoutes);
app.use(`${API_PREFIX}/shares`, sharesRoutes);
app.use(`${API_PREFIX}/dms`, dmsRoutes);
app.use(`${API_PREFIX}/darta`, dartaRoutes);
app.use(`${API_PREFIX}/patra-chalani`, patraChalaniRoutes);
app.use(`${API_PREFIX}/hrm`, hrmRoutes);
app.use(`${API_PREFIX}/governance`, governanceRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/compliance`, complianceRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);
app.use(`${API_PREFIX}/subscription`, subscriptionRoutes);
app.use(`${API_PREFIX}/accounting`, accountingRoutes);
app.use(`${API_PREFIX}/cbs/day-book`, dayBookRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use(`${API_PREFIX}/workflow`, workflowRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize hooks system
registerAccountingHooks();
registerLoansHooks();
registerSavingsHooks();

// Initialize workflow engine
registerDefaultWorkflows();

// Initialize AML monitoring
initializeAmlMonitoring();

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}${API_PREFIX}`);
});
