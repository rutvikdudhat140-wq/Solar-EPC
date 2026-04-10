// CENTRAL API CLIENT — All API calls route through here. No direct fetch/axios in components.
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
const TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);

const shouldDebugLog = () => {
    const v = String(process.env.REACT_APP_PERMISSION_DEBUG_LOGS || process.env.REACT_APP_AUTH_DEBUG_LOGS || '').toLowerCase();
    return v === 'true';
};

const summarizePermissions = (perms) => {
    let modules = 0;
    let actions = 0;
    let granted = 0;

    if (!perms || typeof perms !== 'object') return { modules, actions, granted };

    Object.values(perms).forEach((modulePerms) => {
        modules += 1;
        if (!modulePerms || typeof modulePerms !== 'object') return;
        Object.values(modulePerms).forEach((v) => {
            actions += 1;
            if (v === true) granted += 1;
        });
    });

    return { modules, actions, granted };
};

export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
});

const getTenantIdFromToken = () => {
    try {
        const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.tenantId || null;
    } catch {
        return null;
    }
};

const getTenantId = () => {
    try {
        // TenantId stored separately (for pre-login requests)
        const storedTenantId = localStorage.getItem('tenantId');
        if (storedTenantId && storedTenantId !== 'default') {
            return storedTenantId;
        }
        // Try to get from JWT token
        const tokenTenantId = getTenantIdFromToken();
        if (tokenTenantId) {
            return tokenTenantId;
        }
        // Return null for superadmin or not logged in
        return null;
    } catch {
        return getTenantIdFromToken();
    }
};

// ── Request Interceptor: attach auth token ──
apiClient.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem('solar_token') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('token');
        if (shouldDebugLog()) {
            console.log(
                `[API_DEBUG] req method=${config.method?.toUpperCase()} url=${config.url} tokenPresent=${token ? 'true' : 'false'}`,
            );
        }
        if (token) config.headers.Authorization = `Bearer ${token}`;
        const tenantId = getTenantId();
        // Only add tenant header if tenantId exists (not for superadmin)
        if (tenantId) {
            config.headers['x-tenant-id'] = tenantId;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor: normalize errors ──
apiClient.interceptors.response.use(
    (response) => {
        if (shouldDebugLog()) {
            const url = response?.config?.url;
            const method = response?.config?.method?.toUpperCase();
            const status = response?.status;

            if (String(url || '').includes('/auth/me')) {
                const data = response?.data?.data || response?.data;
                const permSummary = summarizePermissions(data?.permissions);
                const scopeModules = data?.dataScope && typeof data?.dataScope === 'object' ? Object.keys(data.dataScope).length : 0;
                console.log(
                    `[API_DEBUG] res method=${method || ''} url=${url || ''} status=${status} permSummary=${JSON.stringify(permSummary)} scopeModules=${scopeModules}`,
                );
            } else {
                console.log(`[API_DEBUG] res method=${method || ''} url=${url || ''} status=${status}`);
            }
        }

        return response.data;
    },
    (error) => {
        const status = error?.response?.status;
        const responseData = error?.response?.data;
        const message =
            responseData?.message ||
            responseData?.error?.message ||
            error?.message ||
            'An unexpected error occurred';

        const url = error?.response?.config?.url;
        const method = error?.response?.config?.method?.toUpperCase();
        if (shouldDebugLog()) {
            console.log(`[API_DEBUG] err method=${method || ''} url=${url || ''} status=${status} message=${message}`);
        } else {
            console.log(`[API Error] ${method || ''} ${url || ''} Status: ${status}, Message: ${message}`, responseData);
        }
        
        if (status === 401) {
            console.warn('[API Error] 401 Unauthorized - clearing token and redirecting to login');
            localStorage.removeItem('solar_token');
            // Only redirect if not already on login page to avoid loops
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject({ status, message, data: responseData, raw: error });
    }
);

// ── Generic CRUD helpers ──
export const api = {
    get: (url, paramsOrConfig = {}) => {
        const cfg = paramsOrConfig || {};
        // Backwards compatible:
        // - api.get('/path', { a: 1 }) => treated as params
        // - api.get('/path', { params: {...}, headers: {...} }) => treated as full axios config
        const isAxiosConfig =
            typeof cfg === 'object' &&
            (Object.prototype.hasOwnProperty.call(cfg, 'params') ||
                Object.prototype.hasOwnProperty.call(cfg, 'headers') ||
                Object.prototype.hasOwnProperty.call(cfg, 'responseType') ||
                Object.prototype.hasOwnProperty.call(cfg, 'timeout'));

        return isAxiosConfig ? apiClient.get(url, cfg) : apiClient.get(url, { params: cfg });
    },
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    delete: (url, config = {}) => apiClient.delete(url, config),
};

export default apiClient;
