/**
 * Configuration constants for the application
 * Centralizes magic numbers and configuration values
 */

// Image Processing
export const IMAGE_PROCESSING = {
  MAX_DISPLAY_WIDTH: 1200,
  MAX_FILE_SIZE_MB: 20,
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024,
  MAX_PIXELS: 4096 * 4096, // 16 megapixels max
  WORKER_TIMEOUT_MS: 35000,
  WORKER_MAX_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes cap
  WORKER_TIMEOUT_PER_MEGAPIXEL_MS: 20000,
  WORKER_IDLE_TIMEOUT_MS: 60000, // 1 minute
} as const;

// Cache
export const CACHE = {
  LRU_SIZE: 10,
  MAX_CACHE_ITEMS: 50,
} as const;

// UI
export const UI = {
  CONFETTI_DURATION_MS: 5000,
  CONFETTI_PIECES: 500,
  CONFETTI_GRAVITY: 0.3,
  TOAST_DEFAULT_DURATION_MS: 5000,
} as const;

// Canvas
export const CANVAS = {
  ZOOM_MIN: 0.1,
  ZOOM_MAX: 5,
  ZOOM_STEP: 0.1,
  WHEEL_ZOOM_SENSITIVITY: 0.001,
} as const;

// Export
export const EXPORT = {
  PNG_FILENAME: 'paint-by-numbers.png',
  JSON_FILENAME: 'paint-by-numbers-data.json',
} as const;
