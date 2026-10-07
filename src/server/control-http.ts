import { authJson } from "./auth-http";

export class ControlFailure extends Error {
  constructor(public code:
    | "AUTH_REQUIRED"
    | "PERMISSION_DENIED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INVALID_ROLE"
    | "INVALID_PERMISSION"
    | "SYSTEM_ROLE_IMMUTABLE"
    | "SELF_PROTECTION"
    | "ALREADY_PROVISIONED"
    | "BOOTSTRAP_NOT_CONFIGURED"
    | "BOOTSTRAP_FORBIDDEN"
  ) { super(code); }
}

export function controlError(error: unknown) {
  const code = error instanceof ControlFailure ? error.code :
    error instanceof Error ? error.message : "SERVICE_UNAVAILABLE";
  const status =
    code === "AUTH_REQUIRED" ? 401 :
    code === "PERMISSION_DENIED" || code === "BOOTSTRAP_FORBIDDEN" ? 403 :
    code === "NOT_FOUND" ? 404 :
    code === "CONFLICT" || code === "ALREADY_PROVISIONED" ? 409 :
    code === "INVALID_ROLE" || code === "INVALID_PERMISSION" ||
    code === "SYSTEM_ROLE_IMMUTABLE" || code === "SELF_PROTECTION" ? 400 :
    code === "BOOTSTRAP_NOT_CONFIGURED" ? 503 : 503;
  const exposed = status < 500 ? code : "SERVICE_UNAVAILABLE";
  return authJson({ error: exposed }, status);
}
