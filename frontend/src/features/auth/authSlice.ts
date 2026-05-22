import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('bookhive_user') || 'null'),
  accessToken: localStorage.getItem('bookhive_accessToken'),
  refreshToken: localStorage.getItem('bookhive_refreshToken'),
  loading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken?: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      localStorage.setItem('bookhive_user', JSON.stringify(action.payload.user));
      localStorage.setItem('bookhive_accessToken', action.payload.accessToken);
      if (action.payload.refreshToken) {
        localStorage.setItem('bookhive_refreshToken', action.payload.refreshToken);
      }
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('bookhive_user');
      localStorage.removeItem('bookhive_accessToken');
      localStorage.removeItem('bookhive_refreshToken');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setCredentials, logout, clearError } = authSlice.actions;

export default authSlice.reducer;
export type { User, AuthState };
