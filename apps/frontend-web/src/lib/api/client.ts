/**
 * Centralized API Client
 *
 * Provides a single source of truth for all API calls with:
 * - Automatic token management
 * - Consistent error handling
 * - Request/response interceptors
 * - TypeScript support
 */

import { toast } from 'react-hot-toast';

/**
 * Custom API Error class with status code
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API Response wrapper
 * @deprecated Use types from @myerp/shared-types instead
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
  [key: string]: unknown; // Allow additional properties from backend
}

/**
 * Request options extending native Fetch API options
 */
export interface RequestOptions extends RequestInit {
  skipAuth?: boolean; // Skip adding auth token
  skipErrorToast?: boolean; // Skip showing error toast
}

/**
 * Centralized API Client
 */
class ApiClient {
  private baseURL: string;
  private tokenGetter: (() => string | null) | null = null;
  private onUnauthorized: (() => void) | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }

  /**
   * Set token getter function (called from AuthContext)
   */
  setTokenGetter(getter: () => string | null) {
    this.tokenGetter = getter;
  }

  /**
   * Set unauthorized handler (called from AuthContext)
   */
  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  /**
   * Get current auth token
   */
  private getToken(): string | null {
    if (this.tokenGetter) {
      return this.tokenGetter();
    }
    // Fallback to localStorage if no getter is set
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  /**
   * Handle unauthorized responses
   */
  private handleUnauthorized() {
    if (this.onUnauthorized) {
      this.onUnauthorized();
    } else {
      // Fallback: clear token and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  }

  /**
   * Core request method
   */
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, skipErrorToast = false, ...fetchOptions } = options;
    // skipAuth is used in the condition below

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    // Add auth token if not skipped
    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Build full URL
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Parse response
      let data: ApiResponse<T>;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (e.g., file downloads)
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          // If not JSON, return text as data
          return text as unknown as T;
        }
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage =
          data.error || data.message || `Request failed with status ${response.status}`;
        const error = new ApiError(errorMessage, response.status, data.code || 'API_ERROR', data);

        // Show error toast unless skipped
        if (!skipErrorToast && response.status >= 400) {
          // Don't show toast for 401 (handled above) or 404 (might be expected)
          if (response.status !== 401 && response.status !== 404) {
            toast.error(errorMessage);
          }
        }

        throw error;
      }

      // Return data (handle both { data: T } and direct T responses)
      return (data.data !== undefined ? data.data : data) as T;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        const networkError = new ApiError(
          'Network error: Unable to connect to server',
          0,
          'NETWORK_ERROR'
        );
        if (!skipErrorToast) {
          toast.error('Unable to connect to server. Please check your connection.');
        }
        throw networkError;
      }

      // Handle unknown errors
      const unknownError = new ApiError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        500,
        'UNKNOWN_ERROR'
      );
      if (!skipErrorToast) {
        toast.error('An unexpected error occurred');
      }
      throw unknownError;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};

    if (token && !options?.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (browser will set it with boundary)
    const { skipAuth, skipErrorToast, ...fetchOptions } = options || {};
    const fetchHeaders = fetchOptions.headers as Record<string, string> | undefined;
    if (fetchHeaders && 'Content-Type' in fetchHeaders) {
      delete fetchHeaders['Content-Type'];
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method: 'POST',
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
        body: formData,
      });

      if (response.status === 401) {
        this.handleUnauthorized();
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.error || data.message || `Upload failed with status ${response.status}`;
        const error = new ApiError(errorMessage, response.status, data.code);
        if (!skipErrorToast) {
          toast.error(errorMessage);
        }
        throw error;
      }

      return (data.data !== undefined ? data.data : data) as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Upload failed',
        500,
        'UPLOAD_ERROR'
      );
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export default for convenience
export default apiClient;
