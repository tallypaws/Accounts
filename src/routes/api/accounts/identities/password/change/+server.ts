import { decryptSecret, hash, matchHash, verifyCookies, verifyTOTP } from '$lib/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { identityDB } from '$lib/identity';
import z from 'zod';

const changeSchema = z.object({
	password: z.string(),
	newPassword: z.string(),
	totp: z.string().optional()
});

export const POST: RequestHandler = async ({ cookies, request }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const body = await request.json();
	const parsed = changeSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
	}
	const { password, newPassword, totp } = parsed.data;

	const passwordIdentity = await identityDB.getByProvider('password', cookieResult.account.id);
	if (!passwordIdentity) {
		return json({ error: 'Password identity not found' }, { status: 404 });
	}

	if (!(await matchHash(password, passwordIdentity.data.passwordHash))) {
		return json({ error: 'Current password is incorrect' }, { status: 401 });
	}

	if (passwordIdentity.data.totp) {
		if (!totp) {
			return json({ error: 'TOTP required' }, { status: 400 });
		}
		const decryptedSecret = decryptSecret(passwordIdentity.data.totp.secret);
		if (!verifyTOTP(totp, decryptedSecret)) {
			return json({ error: 'Invalid TOTP' }, { status: 400 });
		}
	}

	

	passwordIdentity.data.passwordHash = await hash(newPassword)
	passwordIdentity.lastEditedAt = Date.now();
	await identityDB.setById(passwordIdentity.id, passwordIdentity);

	return json({ success: true });
};
