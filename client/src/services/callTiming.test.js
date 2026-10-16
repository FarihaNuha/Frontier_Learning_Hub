import { incomingLifetime } from './callTiming';
test('server-relative ringing survives phones with incorrect dates', () => {
  jest.spyOn(Date, 'now').mockReturnValue(9000000000000);
  expect(incomingLifetime({ expiresAt: 1045000, serverTime: 1000000 })).toBe(45000);
  expect(incomingLifetime({ expiresAt: 1045000, ringForMs: 32000 })).toBe(32000);
  expect(incomingLifetime({ ringForMs: 0 })).toBe(0);
  expect(incomingLifetime({ ringForMs: 999999 })).toBe(45000);
  Date.now.mockRestore();
});
