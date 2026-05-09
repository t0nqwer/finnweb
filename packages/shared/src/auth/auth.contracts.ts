export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type AuthResponse = {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
};
