import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiError } from '@/lib/api';

function errorWith(response: { status: number; data: unknown }): AxiosError {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    { headers: new AxiosHeaders() },
    undefined,
    {
      status: response.status,
      statusText: '',
      data: response.data,
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}

describe('apiError', () => {
  it('prefers the first field-level validation message', () => {
    const error = errorWith({
      status: 422,
      data: {
        message: 'The given data was invalid.',
        errors: { email: ['Enter a valid email address like name@example.com'] },
      },
    });

    expect(apiError(error)).toBe('Enter a valid email address like name@example.com');
  });

  it('falls back to the top-level message when there are no field errors', () => {
    const error = errorWith({
      status: 403,
      data: { message: 'Only the primary tenant administrator can change roles.' },
    });

    expect(apiError(error)).toBe('Only the primary tenant administrator can change roles.');
  });

  it('falls back to the transport message when the response carries no body', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');

    expect(apiError(error)).toBe('Network Error');
  });

  it('returns a generic message for a non-axios throw', () => {
    expect(apiError(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(apiError('nope')).toBe('Something went wrong. Please try again.');
  });
});
