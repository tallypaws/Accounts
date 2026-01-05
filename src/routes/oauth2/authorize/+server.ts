import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { accountDB } from '$lib/accounts';
import { verifySessionToken } from '$lib/auth';
import { applicationDB } from '$lib/applications';
import { ScopeBitField } from '$lib/utils';
import { json } from '@sveltejs/kit';

function genAuthCode() {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const POST: RequestHandler = async ({ request, getClientAddress, cookies }) => {
	console.log(getClientAddress());

	const body = await request.json();

	console.log(body);

	const refreshToken = cookies.get('session_token');
	const { client_id, redirect_uri, state, scope } = body;

	const params = { client_id, redirect_uri, state, scope };
	const paramString = encodeURIComponent(JSON.stringify(params));

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
		return json({
			error: 'Invalid parameters'
		});
	}
	const client = await applicationDB.getById(client_id);
	if (!client) {
		return json({
			error: 'Invalid client'
		});
	}
	if (client.redirectUris && !client.redirectUris.includes(redirect_uri)) {
		return json({
			error: 'Invalid redirect_uri'
		});
	}

	const authCode = genAuthCode();

	client.authCodes ??= {};

	client.authCodes[authCode] = {
		userId: userId,
		createdAt: Date.now(),
		exp: Date.now() + 1000 * 60 * 5,
		scope: scope,
		redirectUri: redirect_uri
	};

	account.authorizedApps ??= {};
	account.authorizedApps[client_id] = true;
	await accountDB.setById(account.id, account);

	await applicationDB.setById(client_id, client);

	// throw redirect(302, `${redirect_uri}?code=${authCode}${state ? `&state=${state}` : ''}`);
	return json({
		code: authCode,
		redirect: `${redirect_uri}?code=${authCode}${state ? `&state=${state}` : ''}`
	});
};
