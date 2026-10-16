import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Deliberately no application imports here. Loading them from the setup file
// would cache the real modules before a test's `vi.mock('@/lib/api')` applies,
// so the store would keep the live axios instance and hit the network.
// Session state is reset per test from tests/support/session.ts instead.

// jsdom does not implement scrolling, and the router scrolls on navigation.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
