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
import crypto from 'node:crypto';

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
	if (!account || !(await matchHash(password, account.passwordHash))) {
		return json(
			{
				error: 'Invalid Username or Password'
			},
			{ status: 401 }
		);
	}

	if (account.totp) {
		if (!totp) {
			return json({
				success: true,
				requiresTOTP: true
			});
		}
		const decryptedSecret = decryptSecret(account.totp.secret);
		if (!verifyTOTP(totp, decryptedSecret)) {
			return json(
				{
					error: 'Invalid TOTP'
				},
				{ status: 400 }
			);
		}
	} else if (totp) {
		return json(
			{
				error: 'TOTP not enabled'
			},
			{ status: 400 }
		);
	}

	const jti = crypto.randomBytes(16).toString('hex');

	account.sessions ??= {};
	account.sessions[jti] = {
		createdAt: Date.now(),
		expiresAt: Date.now() + 60 * 60 * 24 * 60 * 1000
	};
	await accountDB.setById(account.id, account);
	setSessionToken(cookies, generateSessionToken({ userId: account.id, jti }));

	return json({
		success: true
	});
};
