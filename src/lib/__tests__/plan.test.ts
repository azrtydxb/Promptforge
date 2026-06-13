// plan.ts imports @/lib/db (Prisma); mock it so importing the pure helper doesn't
// construct a PrismaClient (which needs DATABASE_URL, absent in the test env).
jest.mock("@/lib/db", () => ({ db: {} }));

import { highestRole } from "../plan";

describe("highestRole", () => {
  it("returns null for no memberships", () => {
    expect(highestRole([])).toBeNull();
  });

  it("picks OWNER over ADMIN/MEMBER/VIEWER", () => {
    expect(highestRole(["VIEWER", "OWNER", "MEMBER"])).toBe("OWNER");
  });

  it("picks ADMIN over MEMBER and VIEWER", () => {
    expect(highestRole(["MEMBER", "ADMIN", "VIEWER"])).toBe("ADMIN");
  });

  it("picks MEMBER over VIEWER", () => {
    expect(highestRole(["VIEWER", "MEMBER"])).toBe("MEMBER");
  });
});
