export interface AuthResult {
  subject: string;
}

export interface AuthPort {
  verify(token: string, poolId: string, action: "append" | "read"): Promise<AuthResult>;
}
