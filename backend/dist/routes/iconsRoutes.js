import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { authRequired } from '../middleware/authRequired.js';
import { verifyToken } from '../auth.js';
const router = Router();
const DASHBOARD_ICONS_BASE = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons';
function kebabize(input) {
    return input
        .toLowerCase()
        .replace(/https?:\/\//g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
}
function hostToSlug(rawUrl) {
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.replace(/^www\./, '');
        // take first label for common cases: github.com -> github
        const first = host.split('.')[0];
        return kebabize(first);
    }
    catch {
        return null;
    }
}
async function headOk(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    }
    catch {
        return false;
    }
}
// GET /api/icons/suggest?title=...&url=...
router.get('/suggest', authRequired, async (req, res) => {
    const q = z
        .object({
        title: z.string().optional().default(''),
        url: z.string().optional().default(''),
    })
        .safeParse(req.query);
    if (!q.success)
        return res.status(400).json({ error: 'Invalid query' });
    const title = q.data.title.trim();
    const url = q.data.url.trim();
    const candidates = [];
    if (title)
        candidates.push({ slug: kebabize(title), reason: 'title' });
    if (url) {
        const fromHost = hostToSlug(url);
        if (fromHost)
            candidates.push({ slug: fromHost, reason: 'host' });
    }
    // a few heuristic expansions (split title words)
    if (title) {
        const parts = title.split(/\s+/).filter(Boolean);
        if (parts.length >= 2)
            candidates.push({ slug: kebabize(parts[0]), reason: 'first_word' });
        if (parts.length >= 2)
            candidates.push({ slug: kebabize(parts.slice(0, 2).join(' ')), reason: 'first_two_words' });
    }
    const seen = new Set();
    const uniq = candidates.filter((c) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)));
    const out = [];
    for (const c of uniq) {
        const svg = `${DASHBOARD_ICONS_BASE}/svg/${c.slug}.svg`;
        const png = `${DASHBOARD_ICONS_BASE}/png/${c.slug}.png`;
        if (await headOk(svg))
            out.push({ url: svg, source: 'dashboard-icons', slug: c.slug });
        if (await headOk(png))
            out.push({ url: png, source: 'dashboard-icons', slug: c.slug });
        if (out.length >= 12)
            break;
    }
    // Favicon fallback
    if (url) {
        try {
            const u = new URL(url);
            const origin = `${u.protocol}//${u.host}`;
            out.push({ url: `${origin}/favicon.ico`, source: 'favicon' });
            // Google S2 service as last-resort
            out.push({ url: `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`, source: 'google-s2' });
        }
        catch {
            // ignore
        }
    }
    res.json({ candidates: out });
});
// GET /api/icons/file/:iconRef?token=...
router.get('/file/:iconRef', async (req, res) => {
    const { iconRef } = req.params;
    const token = String(req.query.token || '');
    if (!token)
        return res.status(401).json({ error: 'Missing token' });
    let payload;
    try {
        payload = verifyToken(token);
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
    // Serve icon bytes from PostgreSQL (vault_icon.data). Ensure icon belongs to token user.
    const icon = await query(`SELECT vi.content_type, vi.data
       FROM vault_icon vi
       JOIN vault_item v ON v.id = vi.vault_item_id
      WHERE v.user_id = $1 AND vi.icon_ref = $2
      LIMIT 1`, [payload.sub, iconRef]);
    if (icon.rows.length === 0)
        return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', icon.rows[0].content_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(icon.rows[0].data);
});
export default router;
