import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { query } from '../db.js';
import { authRequired } from '../middleware/authRequired.js';
import { generateUserKey, wrapUserKey } from '../crypto.js';
import { hashPassword, verifyPassword } from '../auth.js';
const router = Router();
async function loadRole(userId) {
    const r = await query('SELECT role FROM app_user WHERE id = $1', [userId]);
    return r.rows[0]?.role || null;
}
async function countAdmins() {
    const r = await query("SELECT COUNT(*)::int AS count FROM app_user WHERE role = 'admin'");
    return Number(r.rows[0]?.count ?? 0);
}
async function requireAdmin(req, res) {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    const role = await loadRole(req.user.id);
    if (!role) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    // Keep req.user.role in sync (important for older JWTs that did not include role).
    req.user.role = role;
    if (role !== 'admin') {
        res.status(403).json({ error: 'Admin privileges required' });
        return false;
    }
    return true;
}
const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['admin', 'user']).optional(),
});
const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
/**
 * User management endpoints.
 *
 * Notes:
 * - This app started as single-user (self-register once).
 * - After first user exists, additional users are managed by authenticated users.
 * - We explicitly disallow deleting the currently-authenticated user.
 */
router.get('/me', authRequired, async (req, res) => {
    const role = (await loadRole(req.user.id)) || 'user';
    return res.json({ id: req.user.id, email: req.user.email, role });
});
router.get('/', authRequired, async (req, res) => {
    const role = (await loadRole(req.user.id)) || 'user';
    req.user.role = role;
    // Admin can view all users; regular users can only view themselves.
    if (role === 'admin') {
        const r = await query('SELECT id::text AS id, email, role, created_at::text, updated_at::text FROM app_user ORDER BY created_at ASC');
        return res.json({
            users: r.rows.map((u) => ({
                id: u.id,
                email: u.email,
                role: u.role || 'user',
                createdAt: u.created_at,
                updatedAt: u.updated_at,
            })),
        });
    }
    const r = await query('SELECT id::text AS id, email, role, created_at::text, updated_at::text FROM app_user WHERE id = $1', [req.user.id]);
    const u = r.rows[0];
    return res.json({
        users: u
            ? [
                {
                    id: u.id,
                    email: u.email,
                    role: u.role || 'user',
                    createdAt: u.created_at,
                    updatedAt: u.updated_at,
                },
            ]
            : [],
    });
});
router.post('/', authRequired, async (req, res) => {
    if (!(await requireAdmin(req, res)))
        return;
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    const { email, password, role } = parsed.data;
    const existing = await query('SELECT id FROM app_user WHERE email = $1', [email]);
    if (existing.rows.length > 0)
        return res.status(409).json({ error: 'Email already registered' });
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const userKey = generateUserKey();
    const wrapped = wrapUserKey(userKey);
    await query(`INSERT INTO app_user (id, email, password_hash, role, key_ciphertext, key_nonce, key_tag, key_alg)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [userId, email, passwordHash, role || 'user', wrapped.ciphertext, wrapped.nonce, wrapped.tag, wrapped.alg]);
    return res.json({ id: userId, email, role: role || 'user' });
});
router.delete('/:id', authRequired, async (req, res) => {
    if (!(await requireAdmin(req, res)))
        return;
    const targetId = String(req.params.id || '').trim();
    if (!targetId)
        return res.status(400).json({ error: 'Missing id' });
    if (targetId === req.user.id) {
        return res.status(403).json({ error: 'You cannot delete the user you are currently signed in as' });
    }
    const del = await query('DELETE FROM app_user WHERE id = $1 RETURNING id::text AS id', [targetId]);
    if (del.rows.length === 0)
        return res.status(404).json({ error: 'User not found' });
    return res.json({ id: del.rows[0].id });
});
router.patch('/:id/role', authRequired, async (req, res) => {
    if (!(await requireAdmin(req, res)))
        return;
    const targetId = String(req.params.id || '').trim();
    if (!targetId)
        return res.status(400).json({ error: 'Missing id' });
    if (targetId === req.user.id)
        return res.status(400).json({ error: 'You cannot change your own role' });
    const bodySchema = z.object({ role: z.enum(['admin', 'user']) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    const found = await query('SELECT id::text AS id, role FROM app_user WHERE id = $1', [targetId]);
    if (found.rows.length === 0)
        return res.status(404).json({ error: 'User not found' });
    const currentRole = (found.rows[0].role || 'user');
    const nextRole = parsed.data.role;
    // Prevent removing the last admin.
    if (currentRole === 'admin' && nextRole !== 'admin') {
        const admins = await countAdmins();
        if (admins <= 1)
            return res.status(403).json({ error: 'Cannot demote the last admin' });
    }
    await query('UPDATE app_user SET role = $1 WHERE id = $2', [nextRole, targetId]);
    return res.json({ id: targetId, role: nextRole });
});
router.post('/:id/reset-password', authRequired, async (req, res) => {
    if (!(await requireAdmin(req, res)))
        return;
    const targetId = String(req.params.id || '').trim();
    if (!targetId)
        return res.status(400).json({ error: 'Missing id' });
    if (targetId === req.user.id)
        return res.status(400).json({ error: 'Use change password for your own account' });
    const bodySchema = z.object({ newPassword: z.string().min(8, 'New password must be at least 8 characters') });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    const found = await query('SELECT id::text AS id FROM app_user WHERE id = $1', [targetId]);
    if (found.rows.length === 0)
        return res.status(404).json({ error: 'User not found' });
    const nextHash = await hashPassword(parsed.data.newPassword);
    await query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [nextHash, targetId]);
    return res.json({ ok: true });
});
router.post('/me/change-password', authRequired, async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    const { currentPassword, newPassword } = parsed.data;
    const found = await query('SELECT password_hash FROM app_user WHERE id = $1', [req.user.id]);
    if (found.rows.length === 0)
        return res.status(404).json({ error: 'User not found' });
    const ok = await verifyPassword(currentPassword, found.rows[0].password_hash);
    if (!ok)
        return res.status(401).json({ error: 'Current password is incorrect' });
    const nextHash = await hashPassword(newPassword);
    await query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [nextHash, req.user.id]);
    return res.json({ ok: true });
});
export default router;
