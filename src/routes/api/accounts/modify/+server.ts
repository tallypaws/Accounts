import { verifyCookies } from '$lib/auth';
import z from 'zod';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { accountDB } from '$lib/accounts';

const schema = z.object({
	displayName: z.string().min(2).max(100).or(z.string().length(0)).or(z.undefined()),
    bio: z.string().max(10200).or(z.undefined()),
    pronouns: z.string().max(100).or(z.undefined())
});

export const PATCH: RequestHandler = async ({ cookies, request }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();

	const account = await accountDB.getById(cookieResult.account.id);
	if (!account) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return json({ error: 'Invalid input' }, { status: 400 });
	}

	account.displayName = parsed.data.displayName || undefined;
    account.bio = parsed.data.bio || undefined;
    account.pronouns = parsed.data.pronouns || undefined;
	await accountDB.setById(account.id, account);

	return json({ success: true });
};
