import crypto from 'crypto';
import { config } from './config.js';
function normalizeMasterKey() {
    const raw = config.masterKeyB64.trim();
    let buf;
    try {
        buf = Buffer.from(raw, 'base64');
    }
    catch {
        buf = Buffer.from(raw, 'utf8');
    }
    if (buf.length === 32)
        return buf;
    // Derive a 32-byte key deterministically
    return crypto.createHash('sha256').update(buf).digest();
}
const MASTER_KEY = normalizeMasterKey();
export function encryptBytes(key, plaintext, aad) {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    if (aad)
        cipher.setAAD(aad);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        ciphertext: enc.toString('base64'),
        nonce: nonce.toString('base64'),
        tag: tag.toString('base64'),
        alg: 'aes-256-gcm',
    };
}
export function decryptBytes(key, blob, aad) {
    const nonce = Buffer.from(blob.nonce, 'base64');
    const tag = Buffer.from(blob.tag, 'base64');
    const ciphertext = Buffer.from(blob.ciphertext, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    if (aad)
        decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return dec;
}
export function generateUserKey() {
    return crypto.randomBytes(32);
}
export function wrapUserKey(userKey) {
    return encryptBytes(MASTER_KEY, userKey);
}
export function unwrapUserKey(wrapped) {
    return decryptBytes(MASTER_KEY, wrapped);
}
export function encryptJsonWithUserKey(userKey, payload) {
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    return encryptBytes(userKey, plaintext);
}
export function decryptJsonWithUserKey(userKey, blob) {
    const plaintext = decryptBytes(userKey, blob);
    return JSON.parse(plaintext.toString('utf8'));
}
