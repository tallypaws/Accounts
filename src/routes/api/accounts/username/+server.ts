import { verifyCookies } from '$lib/auth';
import z from 'zod';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { accountDB } from '$lib/accounts';

const schema = z.object({
	username: z.string().min(3).max(32)
});

export const PATCH: RequestHandler = async ({ cookies, request }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const account = cookieResult.account;

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Invalid input' }, { status: 400 });
	}

	const taken = await accountDB.getByUsername(parsed.data.username);
	if (taken && taken.id !== account.id) {
		return json({ error: 'Username already taken' }, { status: 409 });
	}

	account.username = parsed.data.username;
	await accountDB.setById(account.id, account);

	return json({ success: true });
};
