import axios from "axios";
import type { User } from "@/types";

const AUTH_BASE = "/api/auth";

export const authApi = {
  login: (): void => {
    window.location.href = `${AUTH_BASE}/login`;
  },

  logout: async (): Promise<void> => {
    await axios.post(`${AUTH_BASE}/logout`, {}, { withCredentials: true });
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data } = await axios.get<User>(`${AUTH_BASE}/me`, {
        withCredentials: true,
      });
      return data;
    } catch {
      return null;
    }
  },
};
