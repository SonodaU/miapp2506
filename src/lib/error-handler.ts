import { ApiError } from './api-client';

export interface ErrorDetails {
  message: string;
  code?: string;
  status?: number;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function handleApiError(error: unknown): ErrorDetails {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return {
      message: getErrorMessage(error.status),
      status: error.status,
      code: getErrorCode(error.status),
    };
  }

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || '予期しないエラーが発生しました',
      code: 'UNKNOWN_ERROR',
    };
  }

  return {
    message: '予期しないエラーが発生しました',
    code: 'UNKNOWN_ERROR',
  };
}

function getErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '入力データが正しくありません';
    case 401:
      return 'ログインが必要です';
    case 403:
      return 'アクセス権限がありません';
    case 404:
      return 'リソースが見つかりません';
    case 429:
      return 'リクエストが多すぎます。しばらく待ってから再試行してください';
    case 500:
      return 'サーバーエラーが発生しました';
    case 502:
    case 503:
    case 504:
      return 'サービスが一時的に利用できません';
    default:
      return '予期しないエラーが発生しました';
  }
}

function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 504:
      return 'GATEWAY_TIMEOUT';
    default:
      return 'UNKNOWN_ERROR';
  }
}

