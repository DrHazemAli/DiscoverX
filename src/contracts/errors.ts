/**
 * ============================================================================
 * DISCOVER: Error Schemas
 * Description: Standardized error shapes for API responses
 * ============================================================================
 */

import { z } from 'zod';
import type { ErrorCode } from '@/server/security/types';

// ============================================================================
// ERROR RESPONSE SCHEMA
// ============================================================================

export const apiErrorSchema = z.object({
  code: z.enum([
    'BAD_REQUEST',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'METHOD_NOT_ALLOWED',
    'CONFLICT',
    'UNPROCESSABLE_ENTITY',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
    'VALIDATION_ERROR',
    'AUTHENTICATION_ERROR',
    'AUTHORIZATION_ERROR',
  ]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string(),
  timestamp: z.string().datetime(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

// ============================================================================
// VALIDATION ERROR
// ============================================================================

export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export type ValidationError = z.infer<typeof validationErrorSchema>;

export const validationErrorResponseSchema = apiErrorSchema.extend({
  code: z.literal('VALIDATION_ERROR'),
  details: z.object({
    errors: z.array(validationErrorSchema),
  }),
});

export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;

// ============================================================================
// RATE LIMIT ERROR
// ============================================================================

export const rateLimitErrorSchema = apiErrorSchema.extend({
  code: z.literal('RATE_LIMITED'),
  details: z.object({
    limit: z.number(),
    remaining: z.number(),
    reset: z.number(),
    retryAfter: z.number(),
  }),
});

export type RateLimitError = z.infer<typeof rateLimitErrorSchema>;

// ============================================================================
// HTTP STATUS MAPPING
// ============================================================================

export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
};

// ============================================================================
// ERROR FACTORY
// ============================================================================

export function createApiError(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
}

export function createValidationError(
  errors: ValidationError[],
  requestId: string
): ValidationErrorResponse {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    requestId,
    timestamp: new Date().toISOString(),
    details: { errors },
  };
}

export function createRateLimitError(
  requestId: string,
  limit: number,
  remaining: number,
  reset: number,
  retryAfter: number
): RateLimitError {
  return {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    requestId,
    timestamp: new Date().toISOString(),
    details: { limit, remaining, reset, retryAfter },
  };
}

// ============================================================================
// ERROR MESSAGES (User-friendly, no internal details)
// ============================================================================

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'The request was invalid or malformed',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to access this resource',
  NOT_FOUND: 'The requested resource was not found',
  METHOD_NOT_ALLOWED: 'This HTTP method is not supported',
  CONFLICT: 'The request conflicts with the current state',
  UNPROCESSABLE_ENTITY: 'The request could not be processed',
  RATE_LIMITED: 'Too many requests. Please try again later',
  INTERNAL_ERROR: 'An unexpected error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  VALIDATION_ERROR: 'Input validation failed',
  AUTHENTICATION_ERROR: 'Authentication failed',
  AUTHORIZATION_ERROR: 'You are not authorized to perform this action',
};

// ============================================================================
// EXPORTS
// ============================================================================

export const errorSchemas = {
  apiError: apiErrorSchema,
  validationError: validationErrorSchema,
  validationErrorResponse: validationErrorResponseSchema,
  rateLimitError: rateLimitErrorSchema,
};
