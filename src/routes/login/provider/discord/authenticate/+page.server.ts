import { m, TimedMap } from '@thetally/toolbox';
import type { PageServerLoad } from './$types';
import { genId, verifyCookies } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

type OAuthIntent =
	| {
			type: 'login';
			redirectTo: string;
	  }
	| {
			type: 'link';
			accountId: string;
			redirectTo: string;
	  }
	| {
			type: 'create';
			redirectTo: string;
	  };

const states = new TimedMap<
	string,
	{
		intent: OAuthIntent;
		state?: string;
		discordRedirectUri: string;
	}
>(m(10).toMs());

export { states as _states };

export const load = (async ({ url, cookies }) => {
	const originalState = url.searchParams.get('state');
	const redirectTo = url.searchParams.get('redirectTo') || '/';
	console.log(redirectTo)
	const intent = (url.searchParams.get('intent') ?? 'login') as OAuthIntent['type'];

	//https://discord.com/oauth2/authorize?client_id=1464088781924860046&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Flogin%2Fprovider%2Fdiscord%2Fcallback&scope=identify
	const discordAuthUrl = new URL('https://discord.com/oauth2/authorize');
	discordAuthUrl.searchParams.set('client_id', '1464088781924860046');
	discordAuthUrl.searchParams.set('response_type', 'code');
	const discordRedirectUri = `${url.origin}/login/provider/discord/callback`;
	discordAuthUrl.searchParams.set('redirect_uri', discordRedirectUri);
	discordAuthUrl.searchParams.set('scope', 'identify');

	console.log({
		intent
	});

	const stateId = genId();
	// states.set(stateId, { redirectTo, state: originalState ?? undefined, discordRedirectUri });
	if (intent === 'login') {
		states.set(stateId, {
			intent: { type: 'login', redirectTo },
			state: originalState ?? undefined,
			discordRedirectUri
		});
	} else if (intent === 'link') {
		const cookieResult = await verifyCookies(cookies);
		if ('error' in cookieResult || !cookieResult.account) {
			redirect(302, '/login?redirectTo=' + encodeURIComponent(url.pathname + url.search));
		}

		const accountId = cookieResult.account.id;
		states.set(stateId, {
			intent: { type: 'link', accountId, redirectTo },
			state: originalState ?? undefined,
			discordRedirectUri
		});
	} else if (intent === 'create') {
		states.set(stateId, {
			intent: { type: 'create', redirectTo },
			state: originalState ?? undefined,
			discordRedirectUri
		});

	}
	discordAuthUrl.searchParams.set('state', stateId);
	// redirect(302, discordAuthUrl.toString());
	return {
		discordAuthUrl: discordAuthUrl.toString()
	};
}) satisfies PageServerLoad;
