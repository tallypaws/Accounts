import z from 'zod';
import { DBMap } from './db';
import crypto from 'node:crypto';
import { applicationDB } from './applications';
import { generateOAuthAccessToken } from './auth';
import { d } from '@thetally/toolbox';
import { scheduleInternalEvent } from './scheduler';

const refreshSchema = z.object({
    clientId: z.string(),
    userId: z.string(),
    scope: z.string().optional(),
    createdAt: z.number(),
    expiresAt: z.number()
});

export const refreshTokenDB = new DBMap('oauth_refresh_tokens', refreshSchema, null);

export async function createRefreshToken(clientId: string, userId: string, scope?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + d(30).toMs()
    await refreshTokenDB.set(token, { clientId, userId, scope, createdAt: now, expiresAt });
    
    scheduleInternalEvent('deleteRefreshToken', expiresAt, { token }).catch(e => {
        console.error(`Failed to schedule refresh token cleanup for ${token}:`, e);
    });
    
    return token;
}

export async function rotateRefreshToken(oldToken: string, clientId: string) {
    const data = await refreshTokenDB.get(oldToken);
    if (!data) return null;
    if (data.clientId !== clientId) return null;
    if (Date.now() > data.expiresAt) {
        await refreshTokenDB.delete(oldToken);
        return null;
    }

    await refreshTokenDB.delete(oldToken);

    const newToken = await createRefreshToken(clientId, data.userId, data.scope);

    const access = generateOAuthAccessToken({ userId: data.userId, clientId, scope: data.scope });

    return { access, refresh_token: newToken, scope: data.scope };
}

export async function getRefreshTokenOwner(token: string) {
    return await refreshTokenDB.get(token);
}
