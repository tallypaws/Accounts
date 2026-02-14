import type { PageServerLoad } from './$types';

import { admins, verifyCookies } from '$lib/auth';
import { error, redirect } from '@sveltejs/kit';
import { applicationDB } from '../../lib/applications';

export const load = (async ({ cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	console.log('cookieResult', cookieResult);
	if ('error' in cookieResult || !cookieResult.account) {
		redirect(302, '/login?redirect=/apps');
	}
	if (!admins.has(cookieResult.account.username)) {
		error(403, 'no. shoo shoo! go away! i dont want you here! >:(');
	}
	// my l is normal
	const allKeys = await applicationDB.getAllKeys();
	const apps = (await Promise.all(allKeys.map((key) => applicationDB.getById(key))))
		.filter(Boolean)
		.map((app) => {
			if (!app) throw 'Should never happen typescript please shut the hell up';

			const safeApp = {
				id: app.id,
				name: app.name,
				description: app.description,
				iconHash: app.iconHash,
				redirectUris: app.redirectUris
			};
			return safeApp;
		});

	return {
		account: {
			id: cookieResult.account.id,
			username: cookieResult.account.username,
			displayName: cookieResult.account.displayName,
			avatarHash: cookieResult.account.avatarHash,
			pronouns: cookieResult.account.pronouns,
			bio: cookieResult.account.bio
		},
		apps
	};
}) satisfies PageServerLoad;
