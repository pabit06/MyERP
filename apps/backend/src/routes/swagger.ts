/**
 * Swagger/OpenAPI Documentation Routes
 * 
 * Serves Swagger UI and OpenAPI JSON specification
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger.js';

const router = Router();

/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: Swagger UI documentation
 *     description: Interactive API documentation interface
 *     tags: [Documentation]
 */
router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MyERP API Documentation',
  customfavIcon: '/favicon.ico',
}));

/**
 * @swagger
 * /api-docs.json:
 *   get:
 *     summary: OpenAPI JSON specification
 *     description: Returns the OpenAPI 3.0 specification in JSON format
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
