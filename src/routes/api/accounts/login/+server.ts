import z from 'zod';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { accountDB } from '$lib/accounts';
import {
	decryptSecret,
	generateSessionToken,
	matchHash,
	setSessionToken,
	verifyTOTP
} from '$lib/auth';
import { identityDB } from '$lib/identity';
import { generateSession, sessionDB } from '$lib/sessions';

const verifySchema = z.object({
	username: z.string(),
	password: z.string(),
	totp: z.string().optional()
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const parsed = verifySchema.safeParse(body);
	if (!parsed.success) {
		return json(
			{
				error: 'Invalid input',
				details: parsed.error
			},
			{ status: 400 }
		);
	}
	const { username, password, totp } = parsed.data;
	const account = await accountDB.getByUsername(username);
	if (!account) {
		return json({ error: 'Invalid Username or Password' }, { status: 401 });
	}
	const identity = await identityDB.getByProvider('password', account.id);
	if (!identity) {
		return json({ error: 'Invalid Username or Password' }, { status: 401 });
	}

	if (!account || !(await matchHash(password, identity.data.passwordHash))) {
		return json(
			{
				error: 'Invalid Username or Password'
			},
			{ status: 401 }
		);
	}

	if (identity.data.totp) {
		if (!totp) {
			return json({ success: true, requiresTOTP: true });
		}
		const decryptedSecret = decryptSecret(identity.data.totp.secret);
		if (!verifyTOTP(totp, decryptedSecret)) {
			return json({ error: 'Invalid TOTP' }, { status: 400 });
		}
	} else if (totp) {
		return json({ error: 'TOTP not enabled' }, { status: 400 });
	}

	const session = generateSession(account.id, identity.id);

	await sessionDB.set(session.id, session);
	setSessionToken(cookies, generateSessionToken({ userId: account.id, jti: session.id }));

	identity.lastUsedAt = Date.now();
	await identityDB.setById(identity.id, identity);
	
	return json({
		success: true
	});
};
