import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import { applicationDB } from '$lib/applications';
import { matchHash, generateOAuthAccessToken } from '$lib/auth';
import { accountDB } from '$lib/accounts';

const POSTSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
	code: z.string(),
	redirectUri: z.string(),
	grantType: z.literal('authorization_code')
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const mapped = {
		clientId: (body as any).client_id ?? (body as any).clientId,
		clientSecret: (body as any).client_secret ?? (body as any).clientSecret,
		code: (body as any).code,
		redirectUri: (body as any).redirect_uri ?? (body as any).redirectUri,
		grantType: (body as any).grant_type ?? (body as any).grantType
	};

	const parsed = POSTSchema.safeParse(mapped);
	if (!parsed.success) {
		return json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
	}

	const client = await applicationDB.getById(parsed.data.clientId);
	if (!client || !(await matchHash(parsed.data.clientSecret, client.secretHash))) {
		return json({ error: 'Invalid client credentials' }, { status: 401 });
	}

	const code = parsed.data.code;
	if (!client.authCodes?.[code]) {
		return json({ error: 'Invalid authorization code' }, { status: 400 });
	}

	const authCode = client.authCodes[code];
	if (authCode.redirectUri !== parsed.data.redirectUri) {
		return json({ error: 'Invalid redirect URI' }, { status: 400 });
	}

	if (authCode.exp && Date.now() > authCode.exp) {
		delete client.authCodes?.[code];
		await applicationDB.setById(client.id, client);
		return json({ error: 'Invalid authorization code' }, { status: 400 });
	}

	const user = await accountDB.getById(authCode.userId);
	if (!user) {
		delete client.authCodes?.[code];
		await applicationDB.setById(client.id, client);
		return json({ error: 'User not found' }, { status: 400 });
	}

	delete client.authCodes?.[code];
	await applicationDB.setById(client.id, client);

	const { token, expiresIn } = generateOAuthAccessToken({
		userId: authCode.userId,
		clientId: client.id,
		scope: authCode.scope,
		expiresInSeconds: 3600
	});

	return json({
		access_token: token,
		token_type: 'Bearer',
		expires_in: expiresIn,
		scope: authCode.scope
	});
};
