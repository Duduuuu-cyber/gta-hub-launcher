
// API Configuration
// Vite automatically defines import.meta.env.DEV as true when running 'npm run dev'
// and false when building for production ('npm run build' / 'npm run electron:build').

const DEV_URL = 'http://localhost:3001';
const PROD_URL = 'http://samp.seoul-rp.net:3001';

// Set this to TRUE if you want to test with the VPS while running 'npm run dev'
const USE_VPS_IN_DEV = false;

export const API_BASE_URL = (import.meta.env.DEV && !USE_VPS_IN_DEV) ? DEV_URL : PROD_URL;

console.log(`[API] Configuration loaded. Mode: ${import.meta.env.DEV ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`[API] Base URL: ${API_BASE_URL}`);

export default API_BASE_URL;
