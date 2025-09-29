/**
 * Tests for useWallet hook
 */

import { renderHook, act } from '@testing-library/react';
import { useWallet } from './useWallet';
import { setupEthereumMock, mockLocalStorage, cleanupMocks } from '@/lib/test-utils';

// Mock the contract utils
jest.mock('@/lib/contractUtils', () => ({
  isMetaMaskAvailable: jest.fn(() => true),
  getCurrentChainId: jest.fn(() => Promise.resolve(1)),
  switchNetwork: jest.fn(() => Promise.resolve()),
}));

describe('useWallet', () => {
  beforeEach(() => {
    setupEthereumMock();
    mockLocalStorage();
    cleanupMocks();
  });

  afterEach(() => {
    cleanupMocks();
  });

  it('should initialize with no account when MetaMask is not available', () => {
    // Mock MetaMask not available
    jest.doMock('@/lib/contractUtils', () => ({
      isMetaMaskAvailable: jest.fn(() => false),
    }));

    const { result } = renderHook(() => useWallet());

    expect(result.current.account).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.hasProvider).toBe(false);
    expect(result.current.error).toBe('MetaMask not found. Please install MetaMask to continue.');
  });

  it('should connect wallet successfully', async () => {
    const mockAccounts = ['0x1234567890123456789012345678901234567890'];
    const mockChainId = '0x1';

    mockEthereum.request
      .mockResolvedValueOnce(mockAccounts) // eth_requestAccounts
      .mockResolvedValueOnce(mockChainId); // eth_chainId

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.account).toBe(mockAccounts[0]);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle connection errors', async () => {
    mockEthereum.request.mockRejectedValue(new Error('User rejected'));

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      try {
        await result.current.connect();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.account).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('User rejected');
  });

  it('should disconnect wallet', () => {
    const { result } = renderHook(() => useWallet());

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.account).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(localStorage.getItem('wallet:manuallyDisconnected')).toBe('1');
  });

  it('should handle account changes', () => {
    const { result } = renderHook(() => useWallet());

    act(() => {
      // Simulate account change event
      const handleAccountsChanged = mockEthereum.on.mock.calls.find(
        call => call[0] === 'accountsChanged'
      )?.[1];
      
      if (handleAccountsChanged) {
        handleAccountsChanged(['0x1234567890123456789012345678901234567890']);
      }
    });

    expect(result.current.account).toBe('0x1234567890123456789012345678901234567890');
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle chain changes', () => {
    const { result } = renderHook(() => useWallet());

    act(() => {
      // Simulate chain change event
      const handleChainChanged = mockEthereum.on.mock.calls.find(
        call => call[0] === 'chainChanged'
      )?.[1];
      
      if (handleChainChanged) {
        handleChainChanged('0x2');
      }
    });

    expect(result.current.chainId).toBe('0x2');
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => useWallet());

    // Set an error first
    act(() => {
      result.current.connect().catch(() => {
        // Ignore the error
      });
    });

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should retry connection with exponential backoff', async () => {
    mockEthereum.request
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.retryConnection();
    });

    // Should eventually succeed
    expect(result.current.account).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should stop retrying after max attempts', async () => {
    mockEthereum.request.mockRejectedValue(new Error('Persistent error'));

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.retryConnection();
    });

    expect(result.current.error).toBe('Maximum reconnection attempts reached');
  });
});




