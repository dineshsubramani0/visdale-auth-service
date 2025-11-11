export interface EnvInterface {
  NODE_ENV: string; // 'development' | 'production'
  APP_PORT: string;
  APPLICATION: string;

  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SCHEMA: string;
  DB_SYNC: boolean;
  DB_LOG: boolean;

  ENCRYPTION_SECRET_KEY: string;

  JWT_SECRET_KEY: string;
  JWT_EXPIRES_IN_MILLISECOND: number;
  JWT_REFRESH_EXPIRES_IN_MILLISECOND: number;

  MAIL_HOST: string;
  MAIL_PORT: number;
  MAIL_USER: string;
  MAIL_PASSWORD: string;
  MAIL_SENDER: string;

  OTP_LENGTH: number;
  OTP_EXPIRES_IN_MINUTES: number;

  FRONTEND_URL: string;
}
