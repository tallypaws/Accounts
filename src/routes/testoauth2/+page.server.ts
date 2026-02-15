import { applicationDB } from '$lib/applications';
import { accountDB } from '$lib/accounts';
import { identityDB } from '$lib/identity';
import { generateOAuthAccessToken } from '$lib/auth';
import { ScopeBitField } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load = (async ({ request, url }) => {
	const code = url.searchParams.get('code');
	const redirectUri = url.searchParams.get('redirect_uri') || 'http://localhost:5173/testoauth2';
	
	if (!code) {
		return { 
			error: 'No authorization code provided',
			code: null,
			tokenExchange: null,
			userInfo: null
		};
	}

	const app = await applicationDB.getById('1jhd8su1ffa62d2cc');
	if (!app) {
		return { 
			error: 'App not found',
			code,
			tokenExchange: null,
			userInfo: null
		};
	}

	const authCode = app.authCodes?.[code];
	if (!authCode) {
		return { 
			error: 'Invalid authorization code',
			code,
			tokenExchange: null,
			userInfo: null
		};
	}

	if (authCode.redirectUri !== redirectUri) {
		return { 
			error: `Invalid redirect URI. Expected: ${authCode.redirectUri}, Got: ${redirectUri}`,
			code,
			tokenExchange: null,
			userInfo: null
		};
	}

	if (authCode.exp && Date.now() > authCode.exp) {
		return { 
			error: 'Authorization code expired',
			code,
			tokenExchange: null,
			userInfo: null
		};
	}

	const user = await accountDB.getById(authCode.userId);
	if (!user) {
		return { 
			error: 'User not found',
			code,
			tokenExchange: null,
			userInfo: null
		};
	}

	const { token: accessToken, expiresIn } = generateOAuthAccessToken({
		userId: authCode.userId,
		clientId: app.id,
		scope: authCode.scope,
		expiresInSeconds: 3600
	});

	const tokenExchange = {
		access_token: accessToken,
		token_type: 'Bearer',
		expires_in: expiresIn,
		scope: authCode.scope
	};

	const scopeBitmap = BigInt(authCode.scope ?? '0');
	const requestedScopes = ScopeBitField.fromBitmap(scopeBitmap);

	const userInfo: any = {
		active: true,
		scope: authCode.scope ?? '',
		client_id: app.id,
		user_id: authCode.userId,
		username: user.username,
		displayName: user.displayName,
		avatarHash: user.avatarHash,
		pronouns: user.pronouns,
		bio: user.bio
	};

	if (requestedScopes.has('discord') || requestedScopes.has('github') || requestedScopes.has('google')) {
		const identities = await identityDB.getAllForAccount(authCode.userId);
		const linkedIdentities: Record<string, any> = {};

		for (const identity of identities) {
			if (identity.provider === 'discord' && requestedScopes.has('discord')) {
				linkedIdentities.discord = {
					id: identity.providerId,
					username: identity.data.username,
					avatarHash: identity.data.avatarHash
				};
			} else if (identity.provider === 'github' && requestedScopes.has('github')) {
				linkedIdentities.github = {
					id: identity.providerId,
					username: identity.data.username,
					avatarUrl: identity.data.avatarUrl
				};
			} else if (identity.provider === 'google' && requestedScopes.has('google')) {
				linkedIdentities.google = {
					id: identity.providerId,
					email: identity.data.email,
					fullName: identity.data.fullName,
					avatarUrl: identity.data.avatarUrl
				};
			}
		}

		if (Object.keys(linkedIdentities).length > 0) {
			userInfo.linked_identities = linkedIdentities;
		}
	}

	return { 
		error: null,
		code,
		tokenExchange,
		userInfo
	};
}) satisfies PageServerLoad;