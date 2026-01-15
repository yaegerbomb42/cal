import clsx from 'clsx';

export const cn = (...classes) => {
  return clsx(classes);
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const formatDuration = (start, end) => {
  const duration = new Date(end) - new Date(start);
  const minutes = Math.floor(duration / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};

export const getEventColor = (category) => {
  const colors = {
    work: '#3b82f6',
    personal: '#10b981',
    fun: '#ec4899',
    hobby: '#8b5cf6',
    task: '#f59e0b',
    todo: '#22c55e',
    event: '#ef4444',
    appointment: '#06b6d4',
    default: '#6b7280'
  };
  
  return colors[category] || colors.default;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

export const sanitizeHtml = (html) => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};
