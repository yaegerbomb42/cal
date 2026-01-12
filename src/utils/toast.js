// Toast notification system
class ToastService {
  constructor() {
    this.toasts = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(message, type = 'info', duration = 3000) {
    const toast = {
      id: Date.now() + Math.random(),
      message,
      type,
      duration
    };
    
    this.toasts.push(toast);
    this.listeners.forEach(listener => listener([...this.toasts]));
    
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }
    
    return toast.id;
  }

  success(message, duration = 3000) {
    return this.notify(message, 'success', duration);
  }

  error(message, duration = 5000) {
    return this.notify(message, 'error', duration);
  }

  warning(message, duration = 4000) {
    return this.notify(message, 'warning', duration);
  }

  info(message, duration = 3000) {
    return this.notify(message, 'info', duration);
  }

  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  clear() {
    this.toasts = [];
    this.listeners.forEach(listener => listener([]));
  }
}

export const toastService = new ToastService();
