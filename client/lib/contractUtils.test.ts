/**
 * Tests for contract utilities
 */

import {
  parseAmount,
  formatAmount,
  isValidAddress,
  validateContractConfig,
  pad32,
  toHexAmount,
  encodeMintData,
  parseContractError,
  CONTRACT_ERRORS,
} from './contractUtils';

describe('contractUtils', () => {
  describe('parseAmount', () => {
    it('should parse valid amounts correctly', () => {
      expect(parseAmount('100', 18).toString()).toBe('100000000000000000000');
      expect(parseAmount('100.5', 18).toString()).toBe('100500000000000000000');
      expect(parseAmount('0.001', 18).toString()).toBe('1000000000000000');
      expect(parseAmount('1000000', 6).toString()).toBe('1000000000000');
    });

    it('should handle edge cases', () => {
      expect(parseAmount('0', 18).toString()).toBe('0');
      expect(parseAmount('1', 0).toString()).toBe('1');
    });

    it('should throw on invalid inputs', () => {
      expect(() => parseAmount('', 18)).toThrow(CONTRACT_ERRORS.INVALID_AMOUNT);
      expect(() => parseAmount('abc', 18)).toThrow(CONTRACT_ERRORS.INVALID_AMOUNT);
      expect(() => parseAmount('-1', 18)).toThrow(CONTRACT_ERRORS.INVALID_AMOUNT);
      expect(() => parseAmount('1.2.3', 18)).toThrow(CONTRACT_ERRORS.INVALID_AMOUNT);
    });

    it('should handle decimal precision correctly', () => {
      expect(parseAmount('1.123456789', 6).toString()).toBe('1123456');
      expect(parseAmount('1.123456789', 18).toString()).toBe('1123456789000000000');
    });
  });

  describe('formatAmount', () => {
    it('should format amounts correctly', () => {
      expect(formatAmount(BigInt('100000000000000000000'), 18)).toBe('100');
      expect(formatAmount(BigInt('100500000000000000000'), 18)).toBe('100.5');
      expect(formatAmount(BigInt('1000000000000000'), 18)).toBe('0.001');
      expect(formatAmount(BigInt('1000000000000'), 6)).toBe('1000000');
    });

    it('should handle zero amounts', () => {
      expect(formatAmount(BigInt('0'), 18)).toBe('0');
    });

    it('should trim trailing zeros', () => {
      expect(formatAmount(BigInt('100000000000000000000'), 18)).toBe('100');
      expect(formatAmount(BigInt('100100000000000000000'), 18)).toBe('100.1');
    });
  });

  describe('isValidAddress', () => {
    it('should validate correct addresses', () => {
      expect(isValidAddress('0x1234567890123456789012345678901234567890')).toBe(true);
      expect(isValidAddress('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('0x')).toBe(false);
      expect(isValidAddress('0x123')).toBe(false);
      expect(isValidAddress('1234567890123456789012345678901234567890')).toBe(false);
      expect(isValidAddress('0x123456789012345678901234567890123456789g')).toBe(false);
    });
  });

  describe('validateContractConfig', () => {
    it('should validate correct configs', () => {
      const config = {
        address: '0x1234567890123456789012345678901234567890',
        decimals: 18,
        symbol: 'TEST',
        name: 'Test Token',
      };

      const result = validateContractConfig(config);
      expect(result).toEqual({
        ...config,
        address: config.address.toLowerCase(),
        gasLimit: '200000',
      });
    });

    it('should reject invalid configs', () => {
      expect(() => validateContractConfig({})).toThrow('Invalid contract address');
      expect(() => validateContractConfig({ address: 'invalid' })).toThrow('Invalid contract address');
      expect(() => validateContractConfig({ address: '0x1234567890123456789012345678901234567890', decimals: -1 })).toThrow('Invalid decimals');
      expect(() => validateContractConfig({ address: '0x1234567890123456789012345678901234567890', decimals: 19 })).toThrow('Invalid decimals');
      expect(() => validateContractConfig({ address: '0x1234567890123456789012345678901234567890', decimals: 18, symbol: '' })).toThrow('Symbol is required');
      expect(() => validateContractConfig({ address: '0x1234567890123456789012345678901234567890', decimals: 18, symbol: 'TEST', name: '' })).toThrow('Name is required');
    });
  });

  describe('pad32', () => {
    it('should pad hex strings to 32 bytes', () => {
      expect(pad32('0x1234')).toBe('0000000000000000000000000000000000000000000000000000000000001234');
      expect(pad32('1234')).toBe('0000000000000000000000000000000000000000000000000000000000001234');
    });
  });

  describe('toHexAmount', () => {
    it('should convert BigInt to hex', () => {
      expect(toHexAmount(BigInt('100'))).toBe('0x64');
      expect(toHexAmount(BigInt('0'))).toBe('0x0');
      expect(toHexAmount(BigInt('255'))).toBe('0xff');
    });
  });

  describe('encodeMintData', () => {
    it('should encode mint data correctly', () => {
      const to = '0x1234567890123456789012345678901234567890';
      const amount = BigInt('100000000000000000000');
      const data = encodeMintData(to, amount);
      
      expect(data).toMatch(/^0x40c10f19/); // mint function selector
      expect(data).toHaveLength(138); // 4 + 32 + 32 = 68 bytes = 136 hex chars + 0x
    });
  });

  describe('parseContractError', () => {
    it('should parse string errors', () => {
      expect(parseContractError('User rejected')).toBe('User rejected');
      expect(parseContractError('Insufficient funds')).toBe('Insufficient ETH for gas fees');
    });

    it('should parse error objects', () => {
      const error = { message: 'User rejected transaction' };
      expect(parseContractError(error)).toBe('Transaction rejected by user');
    });

    it('should handle unknown errors', () => {
      expect(parseContractError({})).toBe('Unknown error occurred');
      expect(parseContractError(null)).toBe('Unknown error occurred');
    });
  });
});




