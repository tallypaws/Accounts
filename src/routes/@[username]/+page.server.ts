import { accountDB } from '$lib/accounts';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const account = await accountDB.getByUsername(params.username);
	if (!account) {
		error(404, 'Account not found');
	}
	return {
		account: {
			id: account.id,
			username: account.username,
			displayName: account.displayName,
			avatarHash: account.avatarHash,
			pronouns: account.pronouns,
			bio: account.bio
		}
	};
}) satisfies PageServerLoad;
