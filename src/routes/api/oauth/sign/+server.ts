import { json } from '@sveltejs/kit';
import { signOAuthParams } from '$lib/oauth-sign';
import { ScopeBitField } from '$lib/utils';
import { verifyCookies, admins } from '$lib/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
   const cookieResult = await verifyCookies(cookies);
      if ('error' in cookieResult || !cookieResult.account || !admins.has(cookieResult.account.username)) {
         return json({ error: 'Unauthorized' }, { status: 401 });
      }
   const { client_id, redirect_uri, scope } = await request.json();
   if (!client_id || !redirect_uri || !scope) {
	   return json({ error: 'Missing parameters' }, { status: 400 });
   }
   const signature = signOAuthParams(redirect_uri, scope, client_id);
   return json({ sig: signature });
};
