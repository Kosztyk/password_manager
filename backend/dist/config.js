import 'dotenv/config';
function required(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing required env: ${name}`);
    return v;
}
export const config = {
    port: Number(process.env.PORT ?? '3000'),
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET'),
    masterKeyB64: required('APP_MASTER_KEY'), // base64, 32 bytes recommended
    // Optional recovery key used for a "forgot password" flow.
    // Set APP_RECOVERY_KEY to a long random string (recommended: 32+ chars).
    // If unset, password recovery is disabled.
    recoveryKey: process.env.APP_RECOVERY_KEY ?? '',
    corsOrigin: process.env.CORS_ORIGIN ?? '',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    appVersion: process.env.APP_VERSION ?? '0.1.0',
};
