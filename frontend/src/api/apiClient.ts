const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

export const apiClient = async (endpoint: string, options: RequestOptions = {}) => {
  const token = localStorage.getItem('bookhive_accessToken');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as any || {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // Auto-logout on token expiration if refresh fails or unauthorized
    if (response.status === 401 && endpoint !== '/auth/login') {
      // Attempt refresh token
      const refreshToken = localStorage.getItem('bookhive_refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem('bookhive_accessToken', data.accessToken);
            // Retry initial request
            headers['Authorization'] = `Bearer ${data.accessToken}`;
            const retryRes = await fetch(`${API_URL}${endpoint}`, { ...config, headers });
            return await handleResponse(retryRes);
          }
        } catch (err) {
          // Fall through to logout
        }
      }
      
      localStorage.removeItem('bookhive_user');
      localStorage.removeItem('bookhive_accessToken');
      localStorage.removeItem('bookhive_refreshToken');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    return await handleResponse(response);
  } catch (error: any) {
    loggerError(error.message || 'API request failed');
    throw error;
  }
};

async function handleResponse(response: Response) {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { message: text };
  }

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP error! status: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

function loggerError(msg: string) {
  console.error(`[API Client Error]: ${msg}`);
}
