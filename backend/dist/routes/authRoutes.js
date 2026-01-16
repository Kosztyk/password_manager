import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { generateUserKey, wrapUserKey } from '../crypto.js';
import { hashPassword, signToken, verifyPassword } from '../auth.js';
import crypto from 'crypto';
import { config } from '../config.js';
const router = Router();
const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});
/**
 * Registration is intentionally single-user: the Register button should only appear
 * when there are no users in the database. We enforce this server-side as well.
 */
router.get('/registration-status', async (_req, res) => {
    const r = await query('SELECT COUNT(*)::int AS count FROM app_user');
    const count = Number(r.rows[0]?.count ?? 0);
    return res.json({ allowRegister: count === 0, userCount: count });
});
// Password recovery is controlled by APP_RECOVERY_KEY.
router.get('/recovery-status', async (_req, res) => {
    return res.json({ enabled: !!config.recoveryKey });
});
router.post('/recover', async (req, res) => {
    if (!config.recoveryKey)
        return res.status(503).json({ error: 'Password recovery is disabled' });
    const schema = z.object({
        email: z.string().email(),
        recoveryKey: z.string().min(1, 'Recovery key is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    // Constant-time compare to reduce key probing signals.
    const provided = Buffer.from(parsed.data.recoveryKey, 'utf8');
    const expected = Buffer.from(config.recoveryKey, 'utf8');
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        return res.status(403).json({ error: 'Invalid recovery key' });
    }
    const found = await query('SELECT id::text AS id FROM app_user WHERE email = $1', [parsed.data.email]);
    if (found.rows.length === 0)
        return res.status(404).json({ error: 'User not found' });
    const nextHash = await hashPassword(parsed.data.newPassword);
    await query('UPDATE app_user SET password_hash = $1 WHERE email = $2', [nextHash, parsed.data.email]);
    return res.json({ ok: true });
});
router.post('/register', async (req, res) => {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    // Allow registration only if no users exist.
    const c = await query('SELECT COUNT(*)::int AS count FROM app_user');
    const userCount = Number(c.rows[0]?.count ?? 0);
    if (userCount > 0)
        return res.status(403).json({ error: 'Registration is disabled' });
    const { email, password } = parsed.data;
    const existing = await query('SELECT id FROM app_user WHERE email = $1', [email]);
    if (existing.rows.length > 0)
        return res.status(409).json({ error: 'Email already registered' });
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const userKey = generateUserKey();
    const wrapped = wrapUserKey(userKey);
    await query(`INSERT INTO app_user (id, email, password_hash, role, key_ciphertext, key_nonce, key_tag, key_alg)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [userId, email, passwordHash, 'admin', wrapped.ciphertext, wrapped.nonce, wrapped.tag, wrapped.alg]);
    const token = signToken({ sub: userId, email, role: 'admin' });
    return res.json({ token });
});
router.post('/login', async (req, res) => {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    const { email, password } = parsed.data;
    const found = await query('SELECT id, password_hash, role FROM app_user WHERE email = $1', [email]);
    if (found.rows.length === 0)
        return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await verifyPassword(password, found.rows[0].password_hash);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ sub: found.rows[0].id, email, role: found.rows[0].role || 'user' });
    return res.json({ token });
});
export default router;
