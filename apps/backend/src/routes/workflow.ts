import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { WorkflowEngine } from '../lib/workflow-engine.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireTenant);

/**
 * POST /api/workflow/:workflowName/transition
 * Execute a workflow transition
 */
router.post('/:workflowName/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { workflowName } = req.params;
    const { entityId, entityType, toState, metadata } = req.body;

    if (!entityId || !entityType || !toState) {
      return res.status(400).json({
        error: 'Missing required fields: entityId, entityType, toState',
      });
    }

    const result = await WorkflowEngine.transition(workflowName, entityId, entityType, toState, {
      userId,
      tenantId,
      metadata,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Workflow transition error:', error);
    res.status(400).json({ error: error.message || 'Failed to execute workflow transition' });
  }
});

/**
 * GET /api/workflow/:workflowName/transitions
 * Get available transitions for current state
 */
router.get('/:workflowName/transitions', async (req: Request, res: Response) => {
  try {
    const { workflowName } = req.params;
    const { currentState } = req.query;

    if (!currentState) {
      return res.status(400).json({ error: 'currentState query parameter is required' });
    }

    const transitions = WorkflowEngine.getAvailableTransitions(workflowName, currentState as string);

    res.json({ transitions });
  } catch (error: any) {
    console.error('Get transitions error:', error);
    res.status(500).json({ error: error.message || 'Failed to get transitions' });
  }
});

/**
 * GET /api/workflow/:workflowName
 * Get workflow definition
 */
router.get('/:workflowName', async (req: Request, res: Response) => {
  try {
    const { workflowName } = req.params;
    const workflow = WorkflowEngine.getWorkflow(workflowName);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ workflow });
  } catch (error: any) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workflow' });
  }
});

/**
 * GET /api/workflow
 * Get all registered workflows
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // This would require exposing the registry, for now return empty
    // TODO: Expose workflow registry
    res.json({ workflows: [] });
  } catch (error: any) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workflows' });
  }
});

export default router;

