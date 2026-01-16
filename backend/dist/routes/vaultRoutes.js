import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { query } from '../db.js';
import { decryptJsonWithUserKey, unwrapUserKey, encryptJsonWithUserKey } from '../crypto.js';
import { authRequired } from '../middleware/authRequired.js';
const router = Router();
const credentialSchema = z.object({
    id: z.string().optional(),
    username: z.string().default(''),
    password: z.string().default(''),
});
const entrySchema = z.object({
    title: z.string().min(1),
    type: z.enum(['Application', 'Server']),
    urls: z.array(z.string()).default([]),
    ips: z.array(z.string()).default([]),
    serverType: z.enum(['VM', 'Bare Metal', 'Docker Container', 'CT', 'Systemd-Nspawn']).optional(),
    credentials: z.array(credentialSchema).default([]),
    notes: z.string().default(''),
    category: z.string().min(1).default('General'),
});
async function getUserKey(userId) {
    const res = await query('SELECT key_ciphertext, key_nonce, key_tag, key_alg FROM app_user WHERE id = $1', [userId]);
    if (res.rows.length === 0)
        throw new Error('User not found');
    const wrapped = {
        ciphertext: res.rows[0].key_ciphertext,
        nonce: res.rows[0].key_nonce,
        tag: res.rows[0].key_tag,
        alg: 'aes-256-gcm',
    };
    return unwrapUserKey(wrapped);
}
function normalizeCredentials(creds) {
    return creds.map((c) => ({
        id: c.id && c.id.length > 0 ? c.id : crypto.randomUUID(),
        username: c.username ?? '',
        password: c.password ?? '',
    }));
}
router.get('/', authRequired, async (req, res) => {
    const userId = req.user.id;
    const userKey = await getUserKey(userId);
    const items = await query(`SELECT id, title, type, category, icon_kind, icon_url, icon_ref, icon_mime, enc_ciphertext, enc_nonce, enc_tag, created_at, updated_at
     FROM vault_item
     WHERE user_id = $1
     ORDER BY updated_at DESC`, [userId]);
    const out = items.rows.map((row) => {
        const blob = { ciphertext: row.enc_ciphertext, nonce: row.enc_nonce, tag: row.enc_tag, alg: 'aes-256-gcm' };
        const payload = decryptJsonWithUserKey(userKey, blob);
        return {
            id: row.id,
            title: row.title,
            type: row.type,
            category: row.category,
            iconKind: row.icon_kind,
            iconUrl: row.icon_url,
            iconRef: row.icon_ref,
            iconMime: row.icon_mime,
            urls: payload.urls ?? [],
            ips: payload.ips ?? [],
            serverType: payload.serverType,
            credentials: payload.credentials ?? [],
            notes: payload.notes ?? '',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    });
    return res.json(out);
});
router.post('/', authRequired, async (req, res) => {
    const userId = req.user.id;
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    const data = parsed.data;
    const userKey = await getUserKey(userId);
    const id = crypto.randomUUID();
    const payload = {
        urls: data.urls,
        ips: data.ips,
        serverType: data.serverType,
        credentials: normalizeCredentials(data.credentials),
        notes: data.notes,
    };
    const enc = encryptJsonWithUserKey(userKey, payload);
    const inserted = await query(`INSERT INTO vault_item (id, user_id, title, type, category, enc_ciphertext, enc_nonce, enc_tag, enc_alg)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING created_at, updated_at`, [id, userId, data.title, data.type, data.category, enc.ciphertext, enc.nonce, enc.tag, enc.alg]);
    return res.json({
        id,
        title: data.title,
        type: data.type,
        category: data.category,
        urls: payload.urls,
        ips: payload.ips,
        serverType: payload.serverType,
        credentials: payload.credentials,
        notes: payload.notes,
        createdAt: inserted.rows[0].created_at,
        updatedAt: inserted.rows[0].updated_at,
    });
});
router.put('/:id', authRequired, async (req, res) => {
    const userId = req.user.id;
    const id = req.params.id;
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
    const data = parsed.data;
    const userKey = await getUserKey(userId);
    const payload = {
        urls: data.urls,
        ips: data.ips,
        serverType: data.serverType,
        credentials: normalizeCredentials(data.credentials),
        notes: data.notes,
    };
    const enc = encryptJsonWithUserKey(userKey, payload);
    const updated = await query(`UPDATE vault_item
     SET title = $1, type = $2, category = $3,
         enc_ciphertext = $4, enc_nonce = $5, enc_tag = $6, enc_alg = $7
     WHERE id = $8 AND user_id = $9
     RETURNING created_at, updated_at`, [data.title, data.type, data.category, enc.ciphertext, enc.nonce, enc.tag, enc.alg, id, userId]);
    if (updated.rows.length === 0)
        return res.status(404).json({ error: 'Not found' });
    return res.json({
        id,
        title: data.title,
        type: data.type,
        category: data.category,
        urls: payload.urls,
        ips: payload.ips,
        serverType: payload.serverType,
        credentials: payload.credentials,
        notes: payload.notes,
        createdAt: updated.rows[0].created_at,
        updatedAt: updated.rows[0].updated_at,
    });
});
router.delete('/:id', authRequired, async (req, res) => {
    const userId = req.user.id;
    const id = req.params.id;
    const del = await query('DELETE FROM vault_item WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (del.rows.length === 0)
        return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
});
export default router;
