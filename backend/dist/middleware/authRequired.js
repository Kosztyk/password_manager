import { verifyToken } from '../auth.js';
export function authRequired(req, res, next) {
    const header = req.header('authorization') || '';
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m)
        return res.status(401).json({ error: 'Missing bearer token' });
    try {
        const payload = verifyToken(m[1]);
        // Backward compatibility: older tokens (pre-role support) won't have role.
        const role = payload.role === 'admin' ? 'admin' : 'user';
        req.user = { id: payload.sub, email: payload.email, role };
        return next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
