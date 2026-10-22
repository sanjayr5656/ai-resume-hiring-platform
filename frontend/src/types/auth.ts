export type Role = 'candidate' | 'recruiter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  company?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
