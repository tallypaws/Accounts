import { verifyCookies } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	const cookieResult = await verifyCookies(cookies);
    if ('error' in cookieResult || !cookieResult.account) {
        throw redirect(302, '/login');
    }
	throw redirect(302, '/@me');
}) satisfies PageServerLoad;


