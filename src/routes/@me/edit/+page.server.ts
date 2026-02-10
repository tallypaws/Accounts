import type { PageServerLoad } from './$types';

import { verifyCookies } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import { identityDB } from '$lib/identity';

export const load = (async ({ cookies,parent }) => {
    const cookieResult = await verifyCookies(cookies);
    console.log('cookieResult', cookieResult);
    if ('error' in cookieResult || !cookieResult.account) {
        redirect(302, '/login');
    }


    const identities = await identityDB.getAllForAccount(cookieResult.account.id);

    return {
        identities,
        account: cookieResult.account
    };
}) satisfies PageServerLoad;
