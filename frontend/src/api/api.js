import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Products
export const getProducts    = ()         => api.get('/products');
export const createProduct  = (data)     => api.post('/products', data);
export const updateProduct  = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct  = (id)       => api.delete(`/products/${id}`);

// Sales
export const getSales       = (params)   => api.get('/sales', { params });
export const createSale     = (data)     => api.post('/sales', data);
export const deleteSale     = (id)       => api.delete(`/sales/${id}`);

// Customers
export const getCustomers   = ()         => api.get('/customers');
export const getCustomer    = (id)       => api.get(`/customers/${id}`);
export const createCustomer = (data)     => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id)       => api.delete(`/customers/${id}`);

// Udhaar
export const getUdhaar      = (params)   => api.get('/udhaar', { params });
export const createUdhaar   = (data)     => api.post('/udhaar', data);
export const deleteUdhaar   = (id)       => api.delete(`/udhaar/${id}`);

// Reports
export const getDailyReport   = (date)          => api.get('/reports/daily',   { params: { date } });
export const getMonthlyReport = (year, month)   => api.get('/reports/monthly', { params: { year, month } });

// AI
export const getAIInsights  = ()         => api.get('/ai/insights');

// Expenses
export const getExpenses    = ()         => api.get('/expenses');
export const createExpense  = (data)     => api.post('/expenses', data);
export const deleteExpense  = (id)       => api.delete(`/expenses/${id}`);

export default api;
