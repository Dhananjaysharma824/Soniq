// Production & Development API Configuration
// If VITE_API_URL is specified (e.g. backend hosted on Render / Railway), it will prefix API requests.
// When omitted or deployed fullstack on the same domain, relative path is used.
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

