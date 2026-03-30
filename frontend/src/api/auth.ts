import { apiClient } from './client';
import { User, AuthTokens } from '@/types';

export const authApi = {
  async login(email: string, password: string): Promise<AuthTokens> {
    return apiClient.post<AuthTokens>('/auth/login', { email, password });
  },

  async register(
    email: string,
    password: string,
    display_name?: string
  ): Promise<User> {
    return apiClient.post<User>('/auth/register', {
      email,
      password,
      display_name,
    });
  },

  async getMe(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },
};
