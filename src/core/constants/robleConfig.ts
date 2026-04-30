export const RobleConfig = {
  dbName: process.env.EXPO_PUBLIC_ROBLE_DB_NAME ?? 'coeval_b65ae2515f',
  authBaseUrl:
    process.env.EXPO_PUBLIC_ROBLE_AUTH_URL ??
    'https://roble-api.openlab.uninorte.edu.co/auth',
  databaseBaseUrl:
    process.env.EXPO_PUBLIC_ROBLE_DATABASE_URL ??
    'https://roble-api.openlab.uninorte.edu.co/database',
};