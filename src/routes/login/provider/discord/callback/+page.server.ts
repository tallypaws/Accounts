import { generateSessionToken, genId, setSessionToken } from '$lib/auth';
import { exchangeDiscordCode, getDiscordUser } from '$lib/discord';
import { identityDB, identityLookup, type DiscordIdentity } from '$lib/identity';
import { generateSession, sessionDB } from '$lib/sessions';
import { m, TimedMap } from '@thetally/toolbox';
import { _states as states } from '../authenticate/+page.server';
import type { PageServerLoad } from './$types';
import { error as kitError } from '@sveltejs/kit';
import { accountDB } from '$lib/accounts';

const discordCreationReferrals = new TimedMap<
	string,
	{
		discordId: string;
		discordUsername: string;
		discordAvatar: string | null;
		redirectTo: string | undefined;
		createdAt: number;
	}
>(m(30).toMs());

export { discordCreationReferrals as _discordCreationReferrals };

const h = (s: string) => {
	let parts = s.split('_');
	parts = parts.map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase());
	return parts.join(' ');
};

export const load = (async ({ request, url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = state ? states.get(state) : null;
	if (!state || !storedState || !code) {
		kitError(400, { message: 'Invalid, expired or missing state parameter' });
	}
	const error = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');
	7;

	console.log({
		code,
		state,
		error,
		errorDescription,
		storedState
	});

	const token = await exchangeDiscordCode(code, storedState.discordRedirectUri).catch((e) => {
		kitError(400, { message: 'Failed to exchange code for token: ' + e.message });
	});
	const accessToken = token.access_token;
	const tokenType = token.token_type;

	console.log({ token, accessToken, tokenType });

	const discordUser = await getDiscordUser(accessToken).catch((e) => {
		kitError(400, { message: 'Failed to fetch user info: ' + e.message });
	});

	console.log({ user: discordUser });

	const identity = await identityDB.getByProvider('discord', discordUser.id);

	console.log({ identity });
	if (storedState.intent) {
		if (storedState.intent.type === 'login') {
			if (!identity) {
				// ask to create account
				console.log({
					loggedIn: false,
					action: 'prompt_create_account',
					username: `${discordUser.username}`,
					avatar: discordUser.avatar
						? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}`
						: null,
					provider: 'discord',
					providerId: discordUser.id,
					redirectTo: storedState.intent.redirectTo
				});

				const discordCreationReferralCode = genId();

				discordCreationReferrals.set(discordCreationReferralCode, {
					discordId: discordUser.id,
					discordUsername: discordUser.username,
					discordAvatar: discordUser.avatar,
					redirectTo: storedState.intent.redirectTo,
					createdAt: Date.now()
				});

				return {
					creationReferralCode: discordCreationReferralCode,
					action: 'create_account',
					username: `${discordUser.username}`,
					avatar: discordUser.avatar
						? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}`
						: null,
					provider: 'discord',
					providerId: discordUser.id,
					redirectTo: storedState.intent.redirectTo,
				};
			}

			console.log('Logging in user with identity ID:', identity.id);
			const session = generateSession(identity.accountId, identity.id);
			await sessionDB.set(session.id, session);
			setSessionToken(
				cookies,
				generateSessionToken({ userId: identity.accountId, jti: session.id })
			);

			const account = await accountDB.getById(identity.accountId);
			// redirect(302, storedState.intent.redirectTo ?? '/');
			return {
				provider: 'discord',
				username: identity.data.username,
				avatarHash: identity.data.avatarHash,
				accountId: identity.accountId,
				redirectTo: storedState.intent.redirectTo,
				action: 'login_success',
				account
			};
		} else if (storedState.intent.type === 'link') {
			if (identity) {
				// kitError(400, { message: 'This Discord account is already linked to another account' });
				// test code: delete existing identity
				await identityDB.deleteById(identity.id);
			}
			const newIdentity: DiscordIdentity = {
				id: genId(),
				accountId: storedState.intent.accountId,
				provider: 'discord',
				createdAt: Date.now(),
				providerId: discordUser.id,
				data: {
					avatarHash: discordUser.avatar,
					username: `${discordUser.username}`
				}
			};
			await identityDB.setById(newIdentity.id, newIdentity);

			const account = await accountDB.getById(storedState.intent.accountId);

			console.log('Linked Discord account to user ID:', storedState.intent.accountId);
			return {
				linked: true,
				provider: 'discord',
				providerId: discordUser.id,
				username: newIdentity.data.username,
				avatarHash: newIdentity.data.avatarHash,
				accountId: newIdentity.accountId,
				redirectTo: storedState.intent.redirectTo,
				action: 'link_success',
				account
			};
		} else if (storedState.intent.type === 'create') {
			if (identity) {
				kitError(400, { message: 'This Discord account is already linked to another account' });
			}

			const discordCreationReferralCode = genId();

			discordCreationReferrals.set(discordCreationReferralCode, {
				discordId: discordUser.id,
				discordUsername: discordUser.username,
				discordAvatar: discordUser.avatar,
				redirectTo: storedState.intent.redirectTo,
				createdAt: Date.now()
			});

			return {
				creationReferralCode: discordCreationReferralCode,
				action: 'create_account',
				username: `${discordUser.username}`,
				avatar: discordUser.avatar
					? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}`
					: null,
				provider: 'discord',
				providerId: discordUser.id,
				redirectTo: storedState.intent.redirectTo,
			};
		}
	}

	states.delete(state);
	if (error) {
		kitError(400, { message: 'OAuth Error: ' + h(error) });
	}

	return {
	};
}) satisfies PageServerLoad;
