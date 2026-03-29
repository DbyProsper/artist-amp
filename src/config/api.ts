// API base URL configuration via Vite environment variable.
// Set VITE_API_BASE_URL in .env or .env.local (e.g., http://127.0.0.1:8000 or https://your-ngrok-id.ngrok.io)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
