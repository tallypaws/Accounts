import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import z from 'zod';
import { applicationDB } from '$lib/applications';
import { matchHash } from '$lib/auth';
import { rotateRefreshToken, getRefreshTokenOwner } from '$lib/oauth';

const Schema = z.object({
    client_id: z.string().optional(),
    clientSecret: z.string().optional(),
    client_secret: z.string().optional(),
    refresh_token: z.string().optional(),
    refreshToken: z.string().optional()
});

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    const parsed = Schema.parse(body);

    const clientId = parsed.client_id ?? (body as any).clientId;
    const clientSecret = parsed.client_secret ?? parsed.clientSecret ?? (body as any).clientSecret;
    const refreshToken = parsed.refresh_token ?? parsed.refreshToken ?? (body as any).refreshToken;

    if (!clientId || !clientSecret || !refreshToken) {
        return json({ error: 'Invalid request' }, { status: 400 });
    }

    const client = await applicationDB.getById(clientId);
    if (!client) return json({ error: 'Invalid client' }, { status: 401 });
    if (!(await matchHash(clientSecret, client.secretHash))) return json({ error: 'Invalid client credentials' }, { status: 401 });

    const owner = await getRefreshTokenOwner(refreshToken);
    if (!owner || owner.clientId !== clientId) return json({ error: 'Invalid refresh token' }, { status: 400 });

    const rotated = await rotateRefreshToken(refreshToken, clientId);
    if (!rotated) return json({ error: 'Invalid or expired refresh token' }, { status: 400 });

    const { access, refresh_token, scope } = rotated;

    return json({
        access_token: access.token,
        token_type: 'Bearer',
        expires_in: access.expiresIn,
        refresh_token,
        scope: scope ?? ''
    });
};
