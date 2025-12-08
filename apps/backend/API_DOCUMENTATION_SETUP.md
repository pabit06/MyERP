# API Documentation Setup (OpenAPI/Swagger)

## Overview

OpenAPI 3.0 API documentation has been set up using Swagger UI and swagger-jsdoc. The documentation is automatically generated from JSDoc comments in route files.

## Accessing the Documentation

### Swagger UI (Interactive)

- **URL**: `http://localhost:3001/api-docs`
- Interactive interface for exploring and testing API endpoints
- Includes "Try it out" functionality

### OpenAPI JSON Specification

- **URL**: `http://localhost:3001/api-docs.json`
- Raw OpenAPI 3.0 specification in JSON format
- Can be imported into Postman, Insomnia, or other API tools

## Configuration

### Files Created/Modified

1. **`apps/backend/src/config/swagger.ts`**
   - Swagger/OpenAPI configuration
   - Defines API metadata, servers, security schemes, and common schemas
   - Configures JSDoc parsing from route files

2. **`apps/backend/src/routes/swagger.ts`**
   - Routes for serving Swagger UI and OpenAPI JSON
   - No authentication required (public documentation)

3. **`apps/backend/src/index.ts`**
   - Added Swagger routes
   - Added import for health routes (was missing)

## Adding Documentation to Routes

To document a route, add JSDoc comments with Swagger annotations:

```typescript
/**
 * @swagger
 * /savings/products:
 *   get:
 *     summary: Get all saving products
 *     description: Retrieve paginated list of saving products
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PaginationPage'
 *       - $ref: '#/components/parameters/PaginationLimit'
 *     responses:
 *       200:
 *         description: List of saving products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/products', ...);
```

## Available Components

### Common Schemas

- `Error` - Standard error response
- `PaginatedResponse` - Paginated list response

### Common Parameters

- `PaginationPage` - Page number parameter
- `PaginationLimit` - Items per page parameter
- `PaginationSortBy` - Sort field parameter
- `PaginationSortOrder` - Sort order parameter
- `SearchQuery` - Search term parameter

### Security Schemes

- `bearerAuth` - JWT Bearer token authentication

## Tags

Routes are organized by tags:

- Authentication
- Members
- Savings
- Loans
- Shares
- HRM
- Accounting
- Compliance
- Governance
- Reports
- Notifications
- Health

## Example Annotations

### Authentication Endpoint

```typescript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 */
```

### Paginated Endpoint

```typescript
/**
 * @swagger
 * /members:
 *   get:
 *     summary: Get all members
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PaginationPage'
 *       - $ref: '#/components/parameters/PaginationLimit'
 *       - $ref: '#/components/parameters/SearchQuery'
 *     responses:
 *       200:
 *         description: Paginated list of members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
```

## Next Steps

1. **Add annotations to all routes** - Currently only a few routes are documented
2. **Add request/response schemas** - Define detailed schemas for request bodies and responses
3. **Add examples** - Include example requests and responses
4. **Add descriptions** - Provide detailed descriptions for all endpoints
5. **Document error codes** - Document all possible error responses

## Dependencies

- `swagger-jsdoc` - Generates OpenAPI spec from JSDoc comments
- `swagger-ui-express` - Serves Swagger UI interface
- `@types/swagger-jsdoc` - TypeScript types
- `@types/swagger-ui-express` - TypeScript types

## Production Considerations

1. **Disable in production** (optional) - Consider disabling Swagger UI in production for security
2. **Authentication** (optional) - Add authentication to Swagger routes if needed
3. **Rate limiting** - Swagger routes are currently not rate-limited (consider adding if needed)

## Testing

1. Start the backend server: `pnpm dev`
2. Navigate to `http://localhost:3001/api-docs`
3. Explore the documented endpoints
4. Use "Try it out" to test endpoints (requires authentication token)

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
