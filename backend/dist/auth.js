import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function signToken(payload) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
}
export function verifyToken(token) {
    return jwt.verify(token, config.jwtSecret);
}
