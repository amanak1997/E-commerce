import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─── Request interceptor — attach access token ────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — auto refresh on 401 ──────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        Cookies.set('accessToken', accessToken, { expires: 1/96 }); // 15min
        Cookies.set('refreshToken', newRefreshToken, { expires: 7 });

        original.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(original);
      } catch (err) {
        processQueue(err);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Typed API calls ──────────────────────────────────────────────────────────
export const authApi = {
  register: (data: object)               => api.post('/api/auth/register', data),
  login:    (data: object)               => api.post('/api/auth/login', data),
  logout:   (refreshToken: string)       => api.post('/api/auth/logout', { refreshToken }),
  refresh:  (refreshToken: string)       => api.post('/api/auth/refresh', { refreshToken }),
  me:       ()                           => api.get('/api/auth/me'),
  updateMe: (data: object)               => api.patch('/api/auth/me', data),
  changePassword: (data: object)         => api.patch('/api/auth/me/password', data),
};

export const productApi = {
  list:       (params?: object)          => api.get('/api/products', { params }),
  get:        (id: string)               => api.get(`/api/products/${id}`),
  featured:   ()                         => api.get('/api/products/featured'),
  categories: ()                         => api.get('/api/categories'),
  create:     (data: object)             => api.post('/api/products', data),
  update:     (id: string, data: object) => api.put(`/api/products/${id}`, data),
  delete:     (id: string)               => api.delete(`/api/products/${id}`),
  addReview:  (id: string, data: object) => api.post(`/api/products/${id}/reviews`, data),
  uploadImages: (id: string, form: FormData) =>
    api.post(`/api/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const orderApi = {
  create:     (data: object)             => api.post('/api/orders', data),
  list:       (params?: object)          => api.get('/api/orders', { params }),
  get:        (id: string)               => api.get(`/api/orders/${id}`),
  cancel:     (id: string, reason?: string) => api.patch(`/api/orders/${id}/cancel`, { reason }),
  adminList:  (params?: object)          => api.get('/api/admin/orders', { params }),
  adminUpdate:(id: string, data: object) => api.patch(`/api/admin/orders/${id}/status`, data),
  stats:      ()                         => api.get('/api/admin/orders/stats'),
};

export const paymentApi = {
  createIntent:  (data: object)          => api.post('/api/payments/create-intent', data),
  createSession: (data: object)          => api.post('/api/payments/checkout-session', data),
  getPayment:    (orderId: string)        => api.get(`/api/payments/order/${orderId}`),
  refund:        (data: object)          => api.post('/api/payments/refund', data),
};

export default api;
