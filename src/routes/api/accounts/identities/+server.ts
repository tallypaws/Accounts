import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCookies } from '$lib/auth';
import { identityDB } from '$lib/identity';

export const GET: RequestHandler = async ({ cookies }) => {
    const cookieResult = await verifyCookies(cookies);
    if ('error' in cookieResult || !cookieResult.account) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }


    const identities = await identityDB.getAllForAccount(cookieResult.account.id);

    return json({
        identities
    })
};