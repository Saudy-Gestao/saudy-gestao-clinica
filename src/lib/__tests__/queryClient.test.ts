import { describe, expect, it } from 'vitest';
import { queryClient } from '../queryClient';

describe('queryClient', () => {
  it('has expected default query options', () => {
    const defaults = queryClient.getDefaultOptions().queries;

    expect(defaults?.staleTime).toBe(15_000);
    expect(defaults?.gcTime).toBe(5 * 60_000);
    expect(defaults?.refetchOnWindowFocus).toBe(true);
    expect(defaults?.retry).toBe(1);
  });
});
