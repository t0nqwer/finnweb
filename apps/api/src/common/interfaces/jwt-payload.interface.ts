export interface JwtPayload {
  sub: string;
  email: string;
  sessionId?: string;
  jti?: string;
  type: "access" | "refresh";
}
