import { JWTPayload } from '../lib/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        tenantId: string | null; // Can be null for system admin (deprecated, use currentCooperativeId)
        isSystemAdmin?: boolean;
      };
      // Current cooperative context (extracted from subdomain, header, or JWT)
      currentCooperativeId?: string | null;
      // Current user's role in the cooperative context
      currentRole?: string | null;
      // Validated request data (set by validate middleware)
      validated?: any;
      validatedQuery?: any;
      validatedParams?: any;
    }
  }
}
