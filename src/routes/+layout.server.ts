import { admins, verifyCookies } from '$lib/auth';
import { omit } from '@thetally/toolbox';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return { account: null, admin: false, loggedIn: false };
	}
	return {
		account: omit({ ...cookieResult.account }, ['authorizedApps']),
		admin: admins.has(cookieResult.account.username),
		loggedIn: true
	};
}) satisfies LayoutServerLoad;
