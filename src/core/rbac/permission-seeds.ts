import { PERMISSIONS } from "./permissions";

export const PERMISSION_SEEDS = PERMISSIONS.map(code => ({
  code,
  description: `A1 Mobi permission: ${code}`,
}));
