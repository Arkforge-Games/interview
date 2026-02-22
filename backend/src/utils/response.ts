import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: SuccessResponse<T>['meta']
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code?: string,
  details?: Record<string, unknown>
): Response {
  const error: { message: string; code?: string; details?: Record<string, unknown> } = { message };
  if (code) error.code = code;
  if (details) error.details = details;

  const response: ErrorResponse = {
    success: false,
    error,
  };

  return res.status(statusCode).json(response);
}
