import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { applicationDB } from '$lib/applications';
import { verifySessionToken } from '$lib/auth';
import { accountDB } from '$lib/accounts';
import { ScopeBitField } from '$lib/utils';

export const load = (async ({ cookies, url }) => {
	const refreshToken = cookies.get('session_token');
	const client_id = url.searchParams.get('client_id');
	const redirect_uri = url.searchParams.get('redirect_uri');
	const scope = url.searchParams.get('scope');
	const state = url.searchParams.get('state');
	const params = { client_id, redirect_uri, state, scope };
	const paramString = encodeURIComponent(JSON.stringify(params));
	console.log(paramString);
	if (!refreshToken) {
		throw redirect(302, `/login?redirect=/oauth2/authorize&params=${paramString}`);
	}
	const payload: any = verifySessionToken(refreshToken);
	const { sub: userId, jti } = payload;
	console.log(payload);
	const account = await accountDB.getById(userId);
	if (!account || !account.sessions?.[jti]) {
		throw redirect(302, `/login?redirect=/oauth2/authorize&params=${paramString}`);
	}

	const session = account.sessions?.[jti];
	if (!session) {
		// return json({ error: 'Session not found' }, { status: 404 });
		throw redirect(302, `/login?redirect=/oauth2/authorize&params=${paramString}`);
	}

	if (Date.now() > session.expiresAt) {
		delete account.sessions[jti];
		await accountDB.setById(account.id, account);
		cookies.delete('refresh', { path: '/', domain: 'accounts.tally.gay' });
		// return json({ error: 'Refresh token expired' }, { status: 401 });
		throw redirect(302, `/login?redirect=/oauth2/authorize&params=${paramString}`);
	}
	if (!client_id || !redirect_uri || !scope) {
		return {
			error: 'Invalid parameters'
		};
	}
	const client = await applicationDB.getById(client_id);
	if (!client) {
		return {
			error: 'Invalid client'
		};
	}
	if (client.redirectUris && !client.redirectUris.includes(redirect_uri)) {
		return {
			error: 'Invalid redirect_uri'
		};
	}
	const scopeBitField = ScopeBitField.fromBitmap(BigInt(scope));
	return {
		scopeBitField,
		application: {
			name: client.name,
			id: client.id,
			iconHash: client.iconHash,
			description: client.description
		},
		user: {
			id: userId,
			username: account.username,
			avatarHash: account.avatarHash,
			displayName: account.displayName
		}
	};
}) satisfies PageServerLoad;
