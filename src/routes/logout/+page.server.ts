import { clearSessionToken, verifyCookies } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { accountDB } from '$lib/accounts';
import { success } from 'zod';

export const load = (async ({ cookies }) => {
	const cookieResult = await verifyCookies(cookies);

	if ('error' in cookieResult || !cookieResult.account) {
		redirect(302, '/login');
	}

	const { account, session } = cookieResult;

	delete account.sessions?.[session?.id || ''];

	clearSessionToken(cookies);
	await accountDB.setById(account.id, account);
	return { success: true };
}) satisfies PageServerLoad;
