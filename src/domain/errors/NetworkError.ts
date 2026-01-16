import { ApiError } from './ApiError';

export class NetworkError extends ApiError {
  constructor(
    message: string,
    public networkCode: string,
    provider?: string,
    originalError?: unknown
  ) {
    super(message, 'NETWORK_ERROR', undefined, provider, originalError);
    this.name = 'NetworkError';
  }

  static isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
  }

  get isTimeout(): boolean {
    return this.networkCode === 'ECONNABORTED' || this.networkCode === 'ETIMEDOUT';
  }

  get isConnectionRefused(): boolean {
    return this.networkCode === 'ECONNREFUSED';
  }

  get isDnsError(): boolean {
    return this.networkCode === 'ENOTFOUND';
  }

  toJSON() {
    return {
      ...super.toJSON(),
      networkCode: this.networkCode,
      isTimeout: this.isTimeout,
      isConnectionRefused: this.isConnectionRefused,
      isDnsError: this.isDnsError,
    };
  }
}
