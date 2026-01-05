import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import { applicationDB } from '$lib/applications';
import { matchHash } from '$lib/auth';
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
	const parsed = POSTSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Invalid request', details: parsed.error }, { status: 400 });
	}

	const client = await applicationDB.getById(parsed.data.clientId);
	if (!client || (await matchHash(parsed.data.clientSecret, client.secretHash))) {
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

	const user = accountDB.getById(authCode.userId);
	if (!user) {
		delete client.authCodes?.[code];
		await applicationDB.setById(client.id, client);
		return json({ error: 'User not found' }, { status: 400 });
	}

	delete client.authCodes?.[code];
	await applicationDB.setById(client.id, client);


    // scope literally does nothing rn
	return json({
		userId: authCode.userId,
		scope: authCode.scope
	});
};
