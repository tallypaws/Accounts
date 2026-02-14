import { generateSessionToken, genId, setSessionToken } from '$lib/auth';
import { exchangeGitHubCode, getGitHubUser } from '$lib/github';
import { identityDB, identityLookup, type GithubIdentity } from '$lib/identity';
import { generateSession, sessionDB } from '$lib/sessions';
import { m, TimedMap, d } from '@thetally/toolbox';
import { _states as states } from '../authenticate/+page.server';
import type { PageServerLoad } from './$types';
import { error as kitError } from '@sveltejs/kit';
import { accountDB } from '$lib/accounts';
import { scheduleInternalEvent } from '$lib/scheduler';

const githubCreationReferrals = new TimedMap<
	string,
	{
		githubId: string;
		githubUsername: string;
		githubAvatar: string | null;
		redirectTo: string | undefined;
		createdAt: number;
		accessToken: string;
	}
>(m(30).toMs());

export { githubCreationReferrals as _githubCreationReferrals };

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


	const token = await exchangeGitHubCode(code).catch((e) => {
		kitError(400, { message: 'Failed to exchange code for token: ' + e.message });
	});
	const accessToken = token.access_token;
	const tokenType = token.token_type;


	const githubUser = await getGitHubUser(accessToken, tokenType).catch((e) => {
		kitError(400, { message: 'Failed to fetch user info: ' + e.message });
	});

	const identity = await identityDB.getByProvider('github', githubUser.id.toString());

	if (storedState.intent) {
		if (storedState.intent.type === 'login') {
			if (!identity) {
				console.log({
					loggedIn: false,
					action: 'prompt_create_account',
					username: `${githubUser.login}`,
					avatar: githubUser.avatar_url
						?? null,
					provider: 'github',
					providerId: githubUser.id,
					redirectTo: storedState.intent.redirectTo
				});

				const githubCreationReferralCode = genId();

				githubCreationReferrals.set(githubCreationReferralCode, {
					githubId: githubUser.id.toString(),
					githubUsername: githubUser.login,
					githubAvatar: githubUser.avatar_url ?? null,
					redirectTo: storedState.intent.redirectTo,
					createdAt: Date.now(),
					accessToken
				});

				return {
					creationReferralCode: githubCreationReferralCode,
					action: 'create_account',
					username: `${githubUser.login}`,
					avatar: githubUser.avatar_url

						?? null,
					provider: 'github',
					providerId: githubUser.id,
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
				provider: 'github',
				username: identity.data.username,
				avatarUrl: identity.data.avatarUrl,
				accountId: identity.accountId,
				redirectTo: storedState.intent.redirectTo,
				action: 'login_success',
				account
			};
		} else if (storedState.intent.type === 'link') {
			if (identity) {
				kitError(400, { message: 'This GitHub account is already linked to another account' });
				// test code: delete existing identity
				// await identityDB.deleteById(identity.id);
			}
			const newIdentity: GithubIdentity = {
				id: genId(),
				accountId: storedState.intent.accountId,
				provider: 'github',
				createdAt: Date.now(),
				providerId: githubUser.id.toString(),
				data: {
					avatarUrl: githubUser.avatar_url ?? null,
					username: `${githubUser.login}`
				},
				accessToken
			};
			await identityDB.setById(newIdentity.id, newIdentity);

			const firstRefreshTime = Date.now() + d(4).toMs();
			scheduleInternalEvent('refreshGitHubIdentity', firstRefreshTime, { identityId: newIdentity.id }).catch(e => {
				console.error(`Failed to schedule github identity refresh for ${newIdentity.id}:`, e);
			});

			const account = await accountDB.getById(storedState.intent.accountId);

			console.log('Linked github account to user ID:', storedState.intent.accountId);
			return {
				linked: true,
				provider: 'github',
				providerId: githubUser.id.toString(),
				username: newIdentity.data.username,
				avatarUrl: newIdentity.data.avatarUrl,
				accountId: newIdentity.accountId,
				redirectTo: storedState.intent.redirectTo,
				action: 'link_success',
				account
			};
		} else if (storedState.intent.type === 'create') {
			if (identity) {
				kitError(400, { message: 'This github account is already linked to another account' });
			}

			const githubCreationReferralCode = genId();

			githubCreationReferrals.set(githubCreationReferralCode, {
				githubId: githubUser.id.toString(),
				githubUsername: githubUser.login,
				githubAvatar: githubUser.avatar_url ?? null,
				redirectTo: storedState.intent.redirectTo,
				createdAt: Date.now(),
				accessToken
			});

			return {
				creationReferralCode: githubCreationReferralCode,
				action: 'create_account',
				username: `${githubUser.login}`,
				avatar: githubUser.avatar_url ?? null,
				provider: 'github',
				providerId: githubUser.id.toString(),
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
