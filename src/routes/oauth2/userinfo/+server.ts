import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { verifyOAuthAccessToken } from '$lib/auth';
import { accountDB } from '$lib/accounts';
import { identityDB } from '$lib/identity';
import { ScopeBitField } from '$lib/utils';

export const GET: RequestHandler = async ({ request }) => {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
        return json({ error: 'Missing access token' }, { status: 401 });
    }

    const token = auth.substring('Bearer '.length).trim();
    let payload: any;
    try {
        payload = verifyOAuthAccessToken(token);
    } catch (e) {
        return json({ error: 'Invalid access token' }, { status: 401 });
    }

    const userId = payload.sub;
    const clientId = payload.aud;

    const account = await accountDB.getById(userId);
    if (!account) return json({ error: 'User not found' }, { status: 404 });

    if (!account.authorizedApps?.[clientId]) {
        return json({ error: 'App not authorized by user' }, { status: 403 });
    }

    const scopeBitmap = BigInt(payload.scope ?? '0');
    const requestedScopes = ScopeBitField.fromBitmap(scopeBitmap);

    const response: any = {
        active: true,
        scope: payload.scope ?? '',
        client_id: clientId,
        user_id: userId,
        username: account.username,
        displayName: account.displayName,
        avatarHash: account.avatarHash,
        pronouns: account.pronouns,
        bio: account.bio,
        exp: payload.exp
    };

    if (requestedScopes.has('discord') || requestedScopes.has('github') || requestedScopes.has('google')) {
        const identities = await identityDB.getAllForAccount(userId);
        const linkedIdentities: Record<string, any> = {};

        for (const identity of identities) {
            if (identity.provider === 'discord' && requestedScopes.has('discord')) {
                linkedIdentities.discord = {
                    id: identity.providerId,
                    username: identity.data.username,
                    avatarHash: identity.data.avatarHash
                };
            } else if (identity.provider === 'github' && requestedScopes.has('github')) {
                linkedIdentities.github = {
                    id: identity.providerId,
                    username: identity.data.username,
                    avatarUrl: identity.data.avatarUrl
                };
            } else if (identity.provider === 'google' && requestedScopes.has('google')) {
                linkedIdentities.google = {
                    id: identity.providerId,
                    email: identity.data.email,
                    fullName: identity.data.fullName,
                    avatarUrl: identity.data.avatarUrl
                };
            }
        }

        if (Object.keys(linkedIdentities).length > 0) {
            response.linked_identities = linkedIdentities;
        }
    }

    return json(response);
};
