import { verifyCookies, genId, hash } from '$lib/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { identityDB } from '$lib/identity';
import z from 'zod';

const addSchema = z.object({
    password: z.string().min(8).max(128)
});

export const GET: RequestHandler = async ({ cookies }) => {
    const cookieResult = await verifyCookies(cookies);
    if ('error' in cookieResult || !cookieResult.account) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    return new Response();
};

export const POST: RequestHandler = async ({ cookies, request }) => {
    const cookieResult = await verifyCookies(cookies);
    if ('error' in cookieResult || !cookieResult.account) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) {
        return json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const { password } = parsed.data;

    const existing = await identityDB.getByProvider('password', cookieResult.account.id);
    if (existing) {
        return json({ error: 'Password identity already exists' }, { status: 409 });
    }

    const identity = {
        id: genId(),
        accountId: cookieResult.account.id,
        provider: 'password' as const,
        providerId: cookieResult.account.id,
        data: {
            passwordHash: await hash(password),
            totp: undefined
        },
        createdAt: Date.now()
    };

    await identityDB.setById(identity.id, identity);

    return json({ success: true });
};