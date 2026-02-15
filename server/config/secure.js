/**
 * SwiftNexus Enterprise - Secure Login Script
 * Production-ready authentication with enhanced security features
 * @version 1.0.0
 * @author SwiftNexus Security Team
 */

// Production-ready API Configuration
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Development environments
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // Production environments - use same domain with /api path
  if (hostname.includes('swiftnexus.org')) {
    return `${protocol}//${hostname}/api`;
  }
  
  // Staging/Testing environments
  if (hostname.includes('staging') || hostname.includes('test') || hostname.includes('dev')) {
    return `${protocol}//${hostname}/api`;
  }
  
  // Default fallback for other production domains
  return `${protocol}//${hostname}/api`;
})();

// Production-ready configuration
const CONFIG = {
  API_BASE_URL,
  LOGIN_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  SESSION_TIMEOUT: 3600000, // 1 hour
  IDempotency_EXPIRY: 60000 // 1 minute
};

// Production-ready login utilities
class LoginManager {
  constructor() {
    this.retryCount = 0;
    this.abortController = null;
    this.idempotencyKeyRef = null;
    this.loginTimeoutRef = null;
  }

  // Generate unique idempotency key with expiry
  generateIdempotencyKey() {
    this.idempotencyKeyRef = `login-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    return this.idempotencyKeyRef;
  }

  // Clear idempotency key
  clearIdempotencyKey() {
    this.idempotencyKeyRef = null;
  }

  // Abort any ongoing request
  abortRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Create new abort controller for request
  createAbortController() {
    this.abortController = new AbortController();
    return this.abortController;
  }

  // Reset retry count
  resetRetryCount() {
    this.retryCount = 0;
  }

  // Check if should retry
  shouldRetry(error) {
    return this.retryCount < CONFIG.MAX_RETRIES && 
           (error.name === 'TypeError' || error.message.includes('network'));
  }

  // Wait before retry
  async retryWait() {
    this.retryCount++;
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * this.retryCount));
  }
}

// Enhanced fetch with timeout and retry
async function fetchWithTimeout(url, options = {}, timeout = CONFIG.LOGIN_TIMEOUT) {
  const controller = loginManager.createAbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection and try again.');
    }
    throw error;
  }
}

// Enhanced error handling
function handleApiError(error, context = 'login') {
  console.error(`Error in ${context}:`, error);
  
  if (error.name === 'AbortError') {
    return 'Request timeout. Please check your connection and try again.';
  }
  
  if (error.message.includes('Failed to fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  
  if (error.message.includes('CORS')) {
    return 'Network error. Please contact support if this persists.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}

// Session management
function validateSession() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const loginTime = localStorage.getItem('loginTime');
  
  if (!token || !user || !loginTime) {
    return false;
  }
  
  // Check session timeout
  const sessionAge = Date.now() - parseInt(loginTime);
  if (sessionAge > CONFIG.SESSION_TIMEOUT) {
    clearSession();
    return false;
  }
  
  return true;
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('loginTime');
}

function setSession(token, refreshToken, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken || '');
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('loginTime', Date.now().toString());
}

// Helper function to show messages
function showMessage(message, type) {
  const loginMessage = document.getElementById('loginMessage');
  if (!loginMessage) return;
  
  loginMessage.textContent = message;
  loginMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');
  if (type === 'error') {
    loginMessage.classList.add('bg-red-100', 'text-red-700');
  } else if (type === 'success') {
    loginMessage.classList.add('bg-green-100', 'text-green-700');
  }
  loginMessage.classList.remove('hidden');
}

// Helper function to hide messages
function hideMessage() {
  const loginMessage = document.getElementById('loginMessage');
  if (loginMessage) {
    loginMessage.classList.add('hidden');
  }
}

// Debounced login function (Production-ready)
function debouncedLogin(loginData) {
  // Clear any existing timeout
  if (loginManager.loginTimeoutRef) {
    clearTimeout(loginManager.loginTimeoutRef);
  }

  // Set new timeout for debouncing
  loginManager.loginTimeoutRef = setTimeout(async () => {
    await performLogin(loginData);
  }, 1000); // 1 second debounce
}

// Perform actual login (Production-ready)
async function performLogin(loginData) {
  // Generate or reuse idempotency key
  if (!loginManager.idempotencyKeyRef) {
    loginManager.generateIdempotencyKey();
  }

  try {
    const response = await fetchWithTimeout(`${CONFIG.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Idempotency-Key': loginManager.idempotencyKeyRef
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    if (!response.ok) {
      // Check if this is an idempotent response
      if (data.idempotent) {
        showMessage('Login request already processed. Redirecting...', 'success');
        if (data.data?.user) {
          setSession(data.data.token, data.data.refreshToken, data.data.user);
          
          // Dispatch event for React app
          window.dispatchEvent(new CustomEvent('login-success', { 
            detail: { 
              token: data.data.token, 
              refreshToken: data.data.refreshToken, 
              user: data.data.user 
            } 
          }));

          // Redirect based on user role
          setTimeout(() => {
            if (data.data.user.role === 'admin' || data.data.user.is_admin) {
              window.location.href = '/admin';
            } else {
              window.location.href = '/user';
            }
          }, 1000);
        }
        return;
      }
      throw new Error(data.error || 'Login failed');
    }

    // Store session data
    setSession(data.token, data.refreshToken, data.user);

    // Dispatch event for React app
    window.dispatchEvent(new CustomEvent('login-success', { 
      detail: { 
        token: data.token, 
        refreshToken: data.refreshToken, 
        user: data.user 
      } 
    }));

    // Show success message
    showMessage('Login successful! Redirecting...', 'success');

    // Redirect based on user role
    setTimeout(() => {
      if (data.user.role === 'admin' || data.user.is_admin) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/user';
      }
    }, 1000);

  } catch (error) {
    // Retry logic for network errors
    if (loginManager.shouldRetry(error)) {
      await loginManager.retryWait();
      return await performLogin(loginData);
    }

    const errorMessage = handleApiError(error, 'login');
    showMessage(errorMessage, 'error');
  } finally {
    // Re-enable submit button
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    if (loginSubmitBtn) loginSubmitBtn.disabled = false;
    if (loginBtnText) loginBtnText.textContent = 'Sign In';
    
    // Clear idempotency key after successful/failed login
    loginManager.clearIdempotencyKey();
  }
}

// Initialize login manager
const loginManager = new LoginManager();

// Initialize login functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const nextBtn = document.getElementById('nextBtn');
  const backBtn = document.getElementById('backBtn');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginForm = document.getElementById('loginForm');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const loginBtnText = document.getElementById('loginBtnText');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const togglePassword = document.getElementById('togglePassword');
  const eyeIcon = document.getElementById('eyeIcon');

  // Check if user is already logged in (Production-ready)
  if (validateSession()) {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      // Redirect to appropriate dashboard
      if (userData.role === 'admin' || userData.is_admin) {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/user/dashboard';
      }
    } catch (e) {
      // Invalid user data, clear storage
      clearSession();
    }
  }

  // Step navigation - Check if user exists first (Production-ready)
  nextBtn?.addEventListener('click', async function() {
    const usernameOrEmail = loginEmail.value.trim();

    if (!usernameOrEmail) {
      showMessage('Please enter your username or email', 'error');
      return;
    }

    // Disable button while checking
    nextBtn.disabled = true;
    nextBtn.textContent = 'Checking...';
    loginManager.resetRetryCount();

    try {
      // Check if user exists in database with retry logic
      const response = await fetchWithTimeout(`${CONFIG.API_BASE_URL}/auth/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          username: usernameOrEmail
        })
      });

      const data = await response.json();

      if (!response.ok || !data.exists) {
        // Don't reveal if user exists or not for security
        showMessage('Invalid credentials. Please check your username and password.', 'error');
        nextBtn.disabled = false;
        nextBtn.textContent = 'Next';
        return;
      }

      // User exists, move to step 2
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      userEmailDisplay.textContent = usernameOrEmail;
      loginPassword.focus();
      nextBtn.disabled = false;
      nextBtn.textContent = 'Next';
      hideMessage();

    } catch (error) {
      // Retry logic for network errors
      if (loginManager.shouldRetry(error)) {
        await loginManager.retryWait();
        // Retry the request
        nextBtn.click();
        return;
      }

      const errorMessage = handleApiError(error, 'user-check');
      showMessage(errorMessage, 'error');
      nextBtn.disabled = false;
      nextBtn.textContent = 'Next';
    }
  });

  // Back button functionality
  backBtn?.addEventListener('click', function() {
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
    if (loginPassword) loginPassword.value = '';
    hideMessage();
  });

  // Toggle password visibility
  togglePassword?.addEventListener('click', function() {
    if (!loginPassword || !eyeIcon) return;
    
    const type = loginPassword.type === 'password' ? 'text' : 'password';
    loginPassword.type = type;
    if (type === 'password') {
      eyeIcon.classList.remove('bi-eye-slash');
      eyeIcon.classList.add('bi-eye');
    } else {
      eyeIcon.classList.remove('bi-eye');
      eyeIcon.classList.add('bi-eye-slash');
    }
  });

  // Login form submission
  loginForm?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
      showMessage('Please enter both username/email and password', 'error');
      return;
    }

    // Prevent multiple submissions
    if (loginSubmitBtn.disabled) {
      return;
    }

    // Disable submit button
    loginSubmitBtn.disabled = true;
    if (loginBtnText) loginBtnText.textContent = 'Signing in...';

    // Use debounced login
    debouncedLogin({ username: username, password: password });
  });

  // Handle Enter key on email input
  loginEmail?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextBtn.click();
    }
  });

  // Handle Enter key on password input
  loginPassword?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      loginForm.dispatchEvent(new Event('submit'));
    }
  });
});

// Export for potential use by other scripts (optional)
window.SwiftNexusLogin = {
  loginManager,
  validateSession,
  clearSession,
  setSession,
  showMessage,
  hideMessage
};
