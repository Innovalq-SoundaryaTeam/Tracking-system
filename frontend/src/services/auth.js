export const getToken = () => localStorage.getItem('token');
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  const token = getToken();
  const user = getUser();
  return !!(token && user);
};

export const hasRole = (requiredRole) => {
  const user = getUser();
  return user && user.role?.toLowerCase() === requiredRole.toLowerCase();
};


export const isAdmin = () => hasRole('admin');
export const isSeller = () => hasRole('seller');
export const isDriver = () => hasRole('driver');
