import { AxiosError } from 'axios';
import { ZodError } from 'zod';
import { ApiError } from './ApiError';
import { ValidationError } from './ValidationError';
import { NetworkError } from './NetworkError';

export interface ErrorContext {
  provider: string;
  operation: string;
  itemId?: string;
}

const NETWORK_ERROR_CODES = [
  'ECONNABORTED',
  'ERR_NETWORK',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
];

export function handleApiError(error: unknown, context: ErrorContext): ApiError {
  if (error instanceof ZodError) {
    if (__DEV__) {
      console.warn(
        `[${context.provider}] Schema validation failed for ${context.operation}:`,
        error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      );
    }
    return new ValidationError(
      `Invalid response from ${context.provider}`,
      error.issues,
      context.provider,
      error
    );
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const code = error.code;

    if (!error.response || NETWORK_ERROR_CODES.includes(code ?? '') || error.message === 'Network Error') {
      return new NetworkError(
        `Cannot reach ${context.provider} server`,
        code ?? 'NETWORK_ERROR',
        context.provider,
        error
      );
    }

    if (status === 401) {
      return new ApiError(
        `Authentication required for ${context.provider}`,
        'UNAUTHORIZED',
        status,
        context.provider,
        error
      );
    }

    if (status === 403) {
      return new ApiError(
        `Access denied for ${context.provider}`,
        'FORBIDDEN',
        status,
        context.provider,
        error
      );
    }

    if (status === 404) {
      return new ApiError(
        `Resource not found: ${context.itemId ?? context.operation}`,
        'NOT_FOUND',
        status,
        context.provider,
        error
      );
    }

    if (status && status >= 500) {
      return new ApiError(
        `${context.provider} server error`,
        'SERVER_ERROR',
        status,
        context.provider,
        error
      );
    }

    return new ApiError(
      error.response?.data?.message ?? error.message,
      'UNKNOWN',
      status,
      context.provider,
      error
    );
  }

  if (ApiError.isApiError(error)) {
    return error;
  }

  return new ApiError(
    error instanceof Error ? error.message : 'Unknown error',
    'UNKNOWN',
    undefined,
    context.provider,
    error
  );
}

export function isRetryableError(error: unknown): boolean {
  if (NetworkError.isNetworkError(error)) {
    return true;
  }
  if (ApiError.isApiError(error)) {
    return error.code === 'SERVER_ERROR' || error.code === 'TIMEOUT';
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (ApiError.isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}
