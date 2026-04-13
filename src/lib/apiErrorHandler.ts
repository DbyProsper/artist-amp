/**
 * API Error Handler Utility
 * Provides user-friendly error messages and proper error handling for CORS and network issues
 */

export class APIError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    message?: string
  ) {
    super(message || userMessage);
    this.name = 'APIError';
  }
}

export function getErrorMessage(error: any): string {
  // Network errors
  if (error instanceof TypeError) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Server unreachable or blocked by CORS. Please check your internet connection and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. The server took too long to respond. Please try again.';
    }
  }

  // Custom API errors
  if (error instanceof APIError) {
    return error.userMessage;
  }

  // Generic error messages
  if (error?.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('cors')) {
      return 'Server unreachable or blocked by CORS. The API may not be configured properly.';
    }
    if (msg.includes('ssl') || msg.includes('certificate')) {
      return 'SSL certificate error. Please check the server configuration.';
    }
    if (msg.includes('not found')) {
      return 'API endpoint not found. Please check the server URL.';
    }
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Wraps fetch requests with proper error handling
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit,
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new APIError(
        `HTTP_${response.status}`,
        `Server error: ${response.statusText}${text ? ` - ${text}` : ''}`,
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if ((error as any).name === 'AbortError') {
      throw new APIError(
        'REQUEST_TIMEOUT',
        'Request timed out. The server took too long to respond.',
        'Request timeout after ' + timeout + 'ms'
      );
    }

    const errorMsg = (error as Error).message;

    if (errorMsg.includes('Failed to fetch')) {
      throw new APIError(
        'CORS_OR_NETWORK_ERROR',
        'Server unreachable or blocked by CORS. Please check your internet connection and API endpoint.',
        'Network error: ' + errorMsg
      );
    }

    throw new APIError(
      'NETWORK_ERROR',
      'Network error. Please check your internet connection.',
      errorMsg
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse JSON response with error handling
 */
export async function parseJSONResponse(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch (error) {
    throw new APIError(
      'INVALID_JSON',
      'Invalid response from server. The server may be having issues.',
      'Failed to parse JSON: ' + (error as Error).message
    );
  }
}

/**
 * Comprehensive API call wrapper with full error handling
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<T> {
  try {
    const response = await fetchWithErrorHandling(url, options, timeout);
    const data = await parseJSONResponse(response);
    return data as T;
  } catch (error) {
    console.error('[API] Error:', error);
    throw error;
  }
}

/**
 * Check if API is reachable
 */
export async function checkAPIHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetchWithErrorHandling(`${baseUrl}/health`, {}, 5000);
    return response.ok;
  } catch (_error) {
    return false;
  }
}
