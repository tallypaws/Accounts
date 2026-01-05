import { applicationDB } from '$lib/applications';
import { matchHash } from '$lib/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { accountDB } from '$lib/accounts';

export const GET: RequestHandler = async ({ request, params }) => {
	const headers = request.headers;
	const authHeader = headers.get('Authorization');
	if (!authHeader) {
		return new Response('Unauthorized', { status: 401 });
	}

	const header = authHeader.split(' ');
	if (header.length !== 2 || header[0] !== 'App') {
		return new Response('Unauthorized', { status: 401 });
	}

	const [id, secret] = header[1].split(';');

	const app = await applicationDB.getById(id);

	if (!app || (await matchHash(secret, app.secretHash))) {
		return json({ error: 'Invalid client credentials' }, { status: 401 });
	}

	const account = await accountDB.getById(params.username);

	if (!account) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	if (!account.authorizedApps?.[app.id]) {
		return json({ error: 'App not authorized by user' }, { status: 403 });
	}

	return json({
		id: account.id,
		username: account.username,
		displayName: account.displayName,
		avatarHash: account.avatarHash,
		pronouns: account.pronouns,
		bio: account.bio
	});
};
