// Mock for @panva/hkdf library used by next-auth
// This avoids ESM module loading issues in Jest tests

export default jest.fn().mockResolvedValue(Buffer.from('mock-derived-key'))
