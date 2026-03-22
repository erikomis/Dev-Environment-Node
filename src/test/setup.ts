/// <reference types="vitest/globals" />
import "@testing-library/jest-dom";

// Mock Tauri IPC — não existe no jsdom
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock Tauri events — não existe no jsdom
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Limpa mocks e storage entre testes para evitar vazamento
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
