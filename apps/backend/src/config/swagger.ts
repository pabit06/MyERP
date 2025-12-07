/**
 * Swagger/OpenAPI Configuration
 * 
 * Generates OpenAPI 3.0 specification from JSDoc comments
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyERP API',
      version: '1.0.0',
      description: 'Modular Multi-Tenant SaaS ERP System API Documentation',
      contact: {
        name: 'MyERP Support',
        email: 'support@myerp.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
        description: 'Development server',
      },
      {
        url: `https://api.myerp.com${env.API_PREFIX}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details (development only)',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number',
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page',
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items',
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages',
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Whether there is a next page',
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Whether there is a previous page',
                },
              },
            },
          },
        },
      },
      parameters: {
        PaginationPage: {
          name: 'page',
          in: 'query',
          description: 'Page number (default: 1)',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        PaginationLimit: {
          name: 'limit',
          in: 'query',
          description: 'Items per page (default: 20, max: 100)',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        PaginationSortBy: {
          name: 'sortBy',
          in: 'query',
          description: 'Field to sort by',
          required: false,
          schema: {
            type: 'string',
          },
        },
        PaginationSortOrder: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
          },
        },
        SearchQuery: {
          name: 'search',
          in: 'query',
          description: 'Search term',
          required: false,
          schema: {
            type: 'string',
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Members',
        description: 'Member management operations',
      },
      {
        name: 'Savings',
        description: 'Savings accounts and products',
      },
      {
        name: 'Loans',
        description: 'Loan applications and products',
      },
      {
        name: 'Shares',
        description: 'Share capital management',
      },
      {
        name: 'HRM',
        description: 'Human Resource Management',
      },
      {
        name: 'Accounting',
        description: 'Accounting and financial operations',
      },
      {
        name: 'Compliance',
        description: 'Compliance and AML operations',
      },
      {
        name: 'Governance',
        description: 'Governance and meetings',
      },
      {
        name: 'Reports',
        description: 'Reports and analytics',
      },
      {
        name: 'Notifications',
        description: 'Notification management',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './src/index.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
