import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The console screens are heavy (the payment page mounts the sandbox drawer), so
// the default one-second async timeout is too tight on slower CI/jsdom machines.
configure({ asyncUtilTimeout: 5_000 });

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
