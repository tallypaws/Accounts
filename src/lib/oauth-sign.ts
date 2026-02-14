import { env } from '$env/dynamic/private';
import crypto from 'crypto';

const SIGN_SECRET = env.OAUTH_SIGN_SECRET || 'dev_secret';

export function signOAuthParams(redirectUri: string, scope: string, clientId: string): string {
	const hmac = crypto.createHmac('sha256', SIGN_SECRET);
	hmac.update(redirectUri + '|' + scope + '|' + clientId);
	return hmac.digest('hex');
}

export function verifyOAuthParams(redirectUri: string, scope: string, clientId: string, signature: string): boolean {
	const expected = signOAuthParams(redirectUri, scope, clientId);
	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
