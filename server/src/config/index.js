import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from current working directory or server root
dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'newtonite_super_secret_jwt_key_2026_production_grade',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  MONGODB_URI: process.env.MONGODB_URI || null,
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 100,
  DB_STORAGE_PATH: path.join(__dirname, '..', '..', 'data', 'db')
};
