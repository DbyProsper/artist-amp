// API base URL configuration via Vite environment variable
// Production: https://musicinsta-api-973497466485.us-central1.run.app
// Local dev: http://127.0.0.1:8000
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Timeout configuration for different endpoints (in milliseconds)
export const API_TIMEOUTS = {
  default: 30000,      // 30 seconds - standard requests (image, lyrics)
  music: 120000,       // 120 seconds - music generation (45-60s typical)
  song: 300000,        // 300 seconds - complete song (90-150s typical)
  health: 10000,       // 10 seconds - health check
};

// User tier for API requests
export const DEFAULT_USER_TIER = 'free' as const;
