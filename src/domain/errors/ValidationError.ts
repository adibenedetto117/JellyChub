import type { ZodIssue } from 'zod';
import { ApiError } from './ApiError';

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public issues: ZodIssue[],
    provider?: string,
    originalError?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', undefined, provider, originalError);
    this.name = 'ValidationError';
  }

  static isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }

  getFieldErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    return errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      issues: this.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      })),
    };
  }
}
