import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('p-2', 'text-ink')).toBe('p-2 text-ink');
  });

  it('drops falsy values so conditional classes are safe', () => {
    expect(cn('p-2', false && 'hidden', undefined, null, 'rounded')).toBe('p-2 rounded');
  });

  it('lets later utilities win over earlier ones of the same kind', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-muted', 'text-on-surface')).toBe('text-on-surface');
  });

  it('merges conflicting tailwind groups across arguments', () => {
    expect(cn('rounded-lg px-2', 'rounded-xl')).toBe('px-2 rounded-xl');
  });
});
