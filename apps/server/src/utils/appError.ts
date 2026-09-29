import { ErrorCode, USER_FRIENDLY_ERRORS } from '@reelrush/shared';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, statusCode = 400, customMessage?: string) {
    super(customMessage || USER_FRIENDLY_ERRORS[code]);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
