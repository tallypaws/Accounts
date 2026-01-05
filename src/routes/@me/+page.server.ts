import { accountDB } from '$lib/accounts';
import { verifyCookies, verifySessionToken } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	console.log('cookieResult', cookieResult);
	if ('error' in cookieResult || !cookieResult.account) {
		redirect(302, '/login');
	}
	return {
		account: {
			id: cookieResult.account.id,
			username: cookieResult.account.username,
			displayName: cookieResult.account.displayName,
			avatarHash: cookieResult.account.avatarHash,
			pronouns: cookieResult.account.pronouns,
			bio: cookieResult.account.bio
		}
	};
}) satisfies PageServerLoad;
