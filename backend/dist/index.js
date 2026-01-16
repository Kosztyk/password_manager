import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { migrate } from './migrate.js';
import { pool } from './db.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import authRoutes from './routes/authRoutes.js';
import vaultRoutes from './routes/vaultRoutes.js';
import iconsRoutes from './routes/iconsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { authRequired } from './middleware/authRequired.js';
async function main() {
    await migrate();
    const app = express();
    // Store icons in PostgreSQL (vault_icon.data BYTEA). Use in-memory uploads.
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 1024 * 1024 },
    });
    app.disable('x-powered-by');
    app.use(helmet());
    app.use(express.json({ limit: '1mb' }));
    if (config.corsOrigin) {
        app.use(cors({ origin: config.corsOrigin, credentials: true }));
    }
    app.get('/api/health', (_req, res) => {
        res.json({ ok: true, version: config.appVersion });
    });
    // Icon import (download from URL and store in DB)
    app.post('/api/icons/import/:vaultId', authRequired, async (req, res) => {
        const userId = req.user?.id;
        const vaultId = req.params.vaultId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const url = String(req.body?.url || '').trim();
        if (!url)
            return res.status(400).json({ error: 'Missing url' });
        let parsed;
        try {
            parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol))
                throw new Error('bad protocol');
        }
        catch {
            return res.status(400).json({ error: 'Invalid url' });
        }
        // Download with size limit
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        let resp;
        try {
            resp = await fetch(url, { signal: controller.signal });
        }
        catch {
            clearTimeout(t);
            return res.status(400).json({ error: 'Failed to fetch icon' });
        }
        finally {
            clearTimeout(t);
        }
        if (!resp.ok)
            return res.status(400).json({ error: 'Failed to fetch icon' });
        const ct = (resp.headers.get('content-type') || '').toLowerCase();
        const allowed = ct.startsWith('image/');
        if (!allowed)
            return res.status(400).json({ error: 'Unsupported content-type' });
        const MAX = 2 * 1024 * 1024; // 2 MiB
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length > MAX)
            return res.status(400).json({ error: 'Icon too large' });
        // Determine extension
        let ext = '';
        if (ct.includes('svg'))
            ext = '.svg';
        else if (ct.includes('png'))
            ext = '.png';
        else if (ct.includes('jpeg') || ct.includes('jpg'))
            ext = '.jpg';
        else if (ct.includes('webp'))
            ext = '.webp';
        else if (ct.includes('gif'))
            ext = '.gif';
        else
            ext = path.extname(parsed.pathname).slice(0, 12) || '.img';
        const iconRef = crypto.randomBytes(16).toString('hex') + ext;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const updated = await client.query(`UPDATE vault_item
           SET icon_kind = 'upload', icon_ref = $1, icon_mime = $2, icon_url = NULL, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING id, icon_kind, icon_url, icon_ref, icon_mime`, [iconRef, ct, vaultId, userId]);
            if (updated.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Not found' });
            }
            await client.query(`INSERT INTO vault_icon (vault_item_id, user_id, icon_ref, content_type, data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (vault_item_id)
         DO UPDATE SET icon_ref = EXCLUDED.icon_ref,
                       content_type = EXCLUDED.content_type,
                       data = EXCLUDED.data,
                       updated_at = NOW()`, [vaultId, userId, iconRef, ct, buf]);
            await client.query('COMMIT');
            return res.json({
                id: updated.rows[0].id,
                iconKind: updated.rows[0].icon_kind,
                iconUrl: updated.rows[0].icon_url,
                iconRef: updated.rows[0].icon_ref,
                iconMime: updated.rows[0].icon_mime,
            });
        }
        catch (e) {
            try {
                await client.query('ROLLBACK');
            }
            catch {
                // ignore
            }
            console.error('Icon import failed:', e);
            return res.status(500).json({ error: 'Failed to save icon' });
        }
        finally {
            client.release();
        }
    });
    // Icon upload: multipart form-data field name "icon" (stored in DB)
    app.post('/api/icons/upload/:vaultId', authRequired, upload.single('icon'), async (req, res) => {
        const userId = req.user?.id;
        const vaultId = req.params.vaultId;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        const iconMime = req.file.mimetype;
        const original = String(req.file.originalname || '');
        const ext = path.extname(original).slice(0, 12);
        const iconRef = crypto.randomBytes(16).toString('hex') + (ext || '');
        const buf = req.file.buffer;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const updated = await client.query(`UPDATE vault_item
           SET icon_kind = 'upload', icon_ref = $1, icon_mime = $2, icon_url = NULL, updated_at = NOW()
         WHERE id = $3 AND user_id = $4
         RETURNING id, icon_kind, icon_url, icon_ref, icon_mime`, [iconRef, iconMime, vaultId, userId]);
            if (updated.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Not found' });
            }
            await client.query(`INSERT INTO vault_icon (vault_item_id, user_id, icon_ref, content_type, data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (vault_item_id)
         DO UPDATE SET icon_ref = EXCLUDED.icon_ref,
                       content_type = EXCLUDED.content_type,
                       data = EXCLUDED.data,
                       updated_at = NOW()`, [vaultId, userId, iconRef, iconMime, buf]);
            await client.query('COMMIT');
            return res.json({
                id: updated.rows[0].id,
                iconKind: updated.rows[0].icon_kind,
                iconUrl: updated.rows[0].icon_url,
                iconRef: updated.rows[0].icon_ref,
                iconMime: updated.rows[0].icon_mime,
            });
        }
        catch (e) {
            try {
                await client.query('ROLLBACK');
            }
            catch {
                // ignore
            }
            console.error('Icon upload failed:', e);
            return res.status(500).json({ error: 'Failed to save icon' });
        }
        finally {
            client.release();
        }
    });
    app.use('/api/auth', authRoutes);
    app.use('/api/vault', vaultRoutes);
    app.use('/api/icons', iconsRoutes);
    app.use('/api/users', userRoutes);
    app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
    const server = app.listen(config.port, () => {
        console.log(`Password Manager API listening on :${config.port}`);
    });
    const shutdown = async () => {
        console.log('Shutting down...');
        server.close(() => console.log('HTTP server closed'));
        await pool.end();
        process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
main().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
});
