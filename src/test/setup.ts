import '@testing-library/jest-dom'

// Mock Capacitor plugins used by hooks — not available in jsdom
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}))

vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })), removeAllListeners: vi.fn() },
}))

// Reset localStorage between tests
beforeEach(() => {
  localStorage.clear()
})

// jsdom has no layout engine; components call scrollIntoView on open.
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
