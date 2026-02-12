import { verifyCookies } from '$lib/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { identityDB } from '$lib/identity';

export const DELETE: RequestHandler = async ({ cookies, params }) => {
	
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const identities = await identityDB.getAllForAccount(cookieResult.account.id);

	if (identities.length <= 1) {
		return json({ error: 'Cannot delete the only identity' }, { status: 400 });
	}

	const identityId = params.id;
	if (!identityId) {
		return json({ error: 'Missing identity ID' }, { status: 400 });
	}

	identityDB.deleteById(identityId);
	return new Response();
};
