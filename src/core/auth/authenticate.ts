import { verifyPassword } from "./password";
import { createSessionToken } from "./session";

export type AuthUser = {
  id: string;
  tenantId: string;
  passwordHash: string;
  isActive: boolean;
};

export async function authenticate(
  user: AuthUser | null,
  password: string,
) {
  if (!user?.isActive) throw new Error("INVALID_CREDENTIALS");
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return {
    userId: user.id,
    tenantId: user.tenantId,
    ...createSessionToken(),
  };
}