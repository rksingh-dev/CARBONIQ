/**
 * Testing utilities and helpers
 * Provides mock implementations and test helpers for comprehensive testing
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Mock implementations for testing
export const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
  isConnected: () => true,
};

export const mockContractConfig = {
  address: '0x1234567890123456789012345678901234567890',
  decimals: 18,
  symbol: 'TEST',
  name: 'Test Token',
  gasLimit: '200000',
  gasPrice: '0x3b9aca00',
};

export const mockTicket = {
  id: 'test-ticket-1',
  walletAddress: '0x1234567890123456789012345678901234567890',
  reportCid: 'QmTestCid123456789',
  reportName: 'Test Report',
  analysis: {
    estimatedTokens: 100,
    confidence: 0.85,
    summary: 'Test analysis summary',
  },
  status: 'pending' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockGasEstimate = {
  gasLimit: '0x30d40',
  gasPrice: '0x3b9aca00',
  estimatedCost: '0.001',
  estimatedCostUSD: '2.50',
  priorityFee: '2.0 Gwei',
};

// Mock window.ethereum
export const setupEthereumMock = () => {
  Object.defineProperty(window, 'ethereum', {
    value: mockEthereum,
    writable: true,
  });
};

// Mock fetch
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  ) as jest.Mock;
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    },
    writable: true,
  });
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
      <Toaster />
    </BrowserRouter>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Test helpers
export const createMockError = (message: string, status?: number) => {
  const error = new Error(message);
  if (status) {
    (error as any).status = status;
  }
  return error;
};

export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockConsoleError = () => {
  const originalError = console.error;
  const mockError = jest.fn();
  console.error = mockError;
  
  return {
    mockError,
    restore: () => {
      console.error = originalError;
    },
  };
};

export const mockConsoleWarn = () => {
  const originalWarn = console.warn;
  const mockWarn = jest.fn();
  console.warn = mockWarn;
  
  return {
    mockWarn,
    restore: () => {
      console.warn = originalWarn;
    },
  };
};

// Mock API responses
export const mockApiResponses = {
  uploadReport: {
    cid: 'QmTestCid123456789',
    ipfsUrl: 'https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/QmTestCid123456789',
  },
  analyzeReport: {
    estimatedTokens: 100,
    confidence: 0.85,
    summary: 'Test analysis summary',
    model: 'test-model-v1',
  },
  createTicket: mockTicket,
  listTickets: {
    tickets: [mockTicket],
  },
  updateTicket: {
    ...mockTicket,
    status: 'approved' as const,
    txHash: '0xabcdef1234567890',
  },
  adminLogin: {
    token: 'test-admin-token',
    expiresAt: '2024-01-02T00:00:00Z',
  },
};

// Test data generators
export const generateMockTickets = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTicket,
    id: `test-ticket-${i + 1}`,
    reportName: `Test Report ${i + 1}`,
    status: ['pending', 'approved', 'rejected'][i % 3] as const,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }));
};

export const generateMockTransactions = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    hash: `0x${'0'.repeat(64 - i.toString(16).length)}${i.toString(16)}`,
    status: ['pending', 'confirmed', 'failed'][i % 3] as const,
    blockNumber: 1000000 + i,
    gasUsed: '0x30d40',
    gasPrice: '0x3b9aca00',
  }));
};

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  return {
    result,
    duration: end - start,
  };
};

export const mockPerformance = () => {
  const mockNow = jest.fn(() => Date.now());
  Object.defineProperty(performance, 'now', {
    value: mockNow,
    writable: true,
  });
  
  return mockNow;
};

// Cleanup helpers
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  
  if (global.fetch) {
    (global.fetch as jest.Mock).mockClear();
  }
  
  if (window.ethereum) {
    Object.keys(mockEthereum).forEach(key => {
      if (typeof mockEthereum[key as keyof typeof mockEthereum] === 'function') {
        (mockEthereum[key as keyof typeof mockEthereum] as jest.Mock).mockClear();
      }
    });
  }
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };




