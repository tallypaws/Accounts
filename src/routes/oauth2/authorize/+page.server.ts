
import { verifyCookies } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import { applicationDB } from '$lib/applications';
import { ScopeBitField } from '$lib/utils';
import { identityDB } from '$lib/identity';
import { verifyOAuthParams } from '$lib/oauth-sign';

export const load: import('./$types').PageServerLoad = async ({ cookies, url }) => {
   const refreshToken = cookies.get('session_token');
   const client_id = url.searchParams.get('client_id');
   const redirect_uri = url.searchParams.get('redirect_uri');
   const scope = url.searchParams.get('scope');
   const sig = url.searchParams.get('sig');
   const state = url.searchParams.get('state');
   const params = { client_id, redirect_uri, state, scope };
   const paramString = encodeURIComponent(JSON.stringify(params));

   const cookieResult = await verifyCookies(cookies);
   if ('error' in cookieResult || !cookieResult.account) {
	   throw redirect(302, `/login?redirect=/oauth2/authorize&params=${paramString}`);
   }

   const account = cookieResult.account;
   if (!client_id || !redirect_uri || !scope || !sig) {
	   return {
		   error: 'Invalid parameters'
	   };
   }
   if (!verifyOAuthParams(redirect_uri, scope, client_id, sig)) {
	   return {
		   error: 'Invalid or tampered parameters'
	   };
   }
   const client = await applicationDB.getById(client_id);
   if (!client) {
	   return {
		   error: 'Invalid client'
	   };
   }
   if (client.redirectUris && !client.redirectUris.includes(redirect_uri)) {
	   return {
		   error: 'Invalid redirect_uri'
	   };
   }
   const scopeBitField = ScopeBitField.fromBitmap(BigInt(scope));

   const identities = await identityDB.getAllForAccount(account.id);
   const linkedProviders = new Set(identities.map(i => i.provider));

   return {
	   scopeBitField,
	   application: {
		   name: client.name,
		   id: client.id,
		   iconHash: client.iconHash,
		   description: client.description
	   },
	   user: {
		   id: account.id,
		   username: account.username,
		   avatarHash: account.avatarHash,
		   displayName: account.displayName
	   },
	   linkedProviders: Array.from(linkedProviders)
   };
};
