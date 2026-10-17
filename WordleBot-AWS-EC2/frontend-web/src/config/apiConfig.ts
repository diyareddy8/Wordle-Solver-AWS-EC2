const DEFAULT_BASE_URL = 'https://wordlebotapp.onrender.com';

export const ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL,
  healthEndpoint: '/health',
  nextGuessEndpoint: '/wordle/next-guess',
} as const;
