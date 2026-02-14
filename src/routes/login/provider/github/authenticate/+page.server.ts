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
		// githubRedirectUri: string;
	}
>(m(10).toMs());

export { states as _states };

export const load = (async ({ url, cookies }) => {
	const originalState = url.searchParams.get('state');
	const redirectTo = url.searchParams.get('redirectTo') || '/';
	const intent = (url.searchParams.get('intent') ?? 'login') as OAuthIntent['type'];

	//https://github.com/login/oauth/authorize?scope=user:email&client_id=Ov23lieRXELuqpi5zZTS
	const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
	githubAuthUrl.searchParams.set('client_id', 'Ov23lieRXELuqpi5zZTS');
	// const githubRedirectUri = `${url.origin}/login/provider/github/callback`;
	githubAuthUrl.searchParams.set('scope', 'user:email');

	

	const stateId = genId();
	// states.set(stateId, { redirectTo, state: originalState ?? undefined, discordRedirectUri });
	if (intent === 'login') {
		states.set(stateId, {
			intent: { type: 'login', redirectTo },
			state: originalState ?? undefined,
			// githubRedirectUri
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
			// githubRedirectUri
		});
	} else if (intent === 'create') {
		states.set(stateId, {
			intent: { type: 'create', redirectTo },
			state: originalState ?? undefined,
			// githubRedirectUri
		});

		console.log('set create intent');
	}
	githubAuthUrl.searchParams.set('state', stateId);
	// redirect(302, githubAuthUrl.toString());
	return {
		githubAuthUrl: githubAuthUrl.toString()
	};
}) satisfies PageServerLoad;
