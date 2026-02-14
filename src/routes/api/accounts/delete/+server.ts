
import { verifyCookies } from '$lib/auth';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { accountDB, avatarHandler } from '$lib/accounts';
import { identityDB } from '$lib/identity';
import { applicationDB, appIconHandler } from '$lib/applications';

export const DELETE: RequestHandler = async ({ cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const account = cookieResult.account;

	await accountDB.deleteById(account.id);

	return json({ success: true });
};
