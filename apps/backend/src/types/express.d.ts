import { JWTPayload } from '../lib/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        tenantId: string;
      };
    }
  }
}
