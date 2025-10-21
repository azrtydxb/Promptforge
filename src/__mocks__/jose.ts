// Mock for jose library used by next-auth
// This avoids ESM/Browser build issues in Jest tests

export const compactDecrypt = jest.fn()
export const CompactEncrypt = jest.fn()
export const jwtVerify = jest.fn()
export const SignJWT = jest.fn(() => ({
  setProtectedHeader: jest.fn().mockReturnThis(),
  setIssuedAt: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  sign: jest.fn().mockResolvedValue('mock-jwt-token'),
}))
export const importJWK = jest.fn()
export const importSPKI = jest.fn()
export const importPKCS8 = jest.fn()
export const generateKeyPair = jest.fn()
