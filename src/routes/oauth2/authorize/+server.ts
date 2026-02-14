import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'node:crypto';
import { verifyOAuthParams } from '$lib/oauth-sign';
import { accountDB } from '$lib/accounts';
import { verifyCookies, verifySessionToken } from '$lib/auth';
import { applicationDB } from '$lib/applications';
import { ScopeBitField } from '$lib/utils';
import { json } from '@sveltejs/kit';
import { scheduleInternalEvent } from '$lib/scheduler';
import { m } from '@thetally/toolbox';

function genAuthCode() {
	return crypto.randomBytes(20).toString('hex');
}

export const POST: RequestHandler = async ({ request, getClientAddress, cookies }) => {
	console.log(getClientAddress());

	const body = await request.json();


	const { client_id, redirect_uri, state, scope, sig } = body;

	const params = { client_id, redirect_uri, state, scope };
	const paramString = encodeURIComponent(JSON.stringify(params));

	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const account = cookieResult.account
	if (!client_id || !redirect_uri || !scope || !sig) {
		return json({
			error: 'Invalid parameters'
		});
	}
	if (!verifyOAuthParams(redirect_uri, scope, client_id, sig)) {
		return json({
			error: 'Invalid or tampered parameters'
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
	const expiresAt = Date.now() + m(5).toMs()

	client.authCodes ??= {};

	client.authCodes[authCode] = {
		userId: account.id,
		createdAt: Date.now(),
		exp: expiresAt,
		scope: scope,
		redirectUri: redirect_uri
	};

	scheduleInternalEvent('deleteAuthCode', expiresAt, { clientId: client_id, code: authCode }).catch(e => {
		console.error(`Failed to schedule auth code cleanup for ${authCode}:`, e);
	});

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
