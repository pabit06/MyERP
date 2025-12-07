/**
 * Standard API Response wrapper
 * Used for consistent API responses across the application
 */
export interface ApiResponse<T> {
  status?: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

/**
 * Paginated API Response
 * Used for endpoints that return paginated data
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Authentication Response
 * Returned after successful login/authentication
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    cooperativeId?: string;
  };
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Error Response
 * Standard error response format from the API
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
  message?: string;
}

/**
 * Success Response
 * Standard success response format from the API
 */
export interface SuccessResponse<T = unknown> {
  data: T;
  message?: string;
}
