import { env } from '$env/dynamic/private';

const clientId = env.DISCORD_CLIENT_ID;
const clientSecret = env.DISCORD_CLIENT_SECRET;

export async function exchangeDiscordCode(
	code: string,
	redirectUri: string
): Promise<{
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	scope: string;
}> {
	const res = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			scope: 'identify'
		})
	});	
	const json = await res.json();
	if (!res.ok) {
		throw new Error(
			`Failed to exchange code for token: ${json.error} - ${json.error_description}`
		);
	}
	return json;
}

export const getDiscordUser = async (
	accessToken: string, tokenType = 'Bearer'
): Promise<{
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	bot?: boolean;
	system?: boolean;
	mfa_enabled?: boolean;
	locale?: string;
	verified?: boolean;
	email?: string | null;
	flags?: number;
	premium_type?: number;
	public_flags?: number;
}> => {
	const res = await fetch('https://discord.com/api/users/@me', {
		headers: {
			Authorization: `${tokenType} ${accessToken}`
		}
	});
	if (!res.ok) {
		const json = await res.json();
		throw new Error(`Failed to get Discord user: ${json.message || res.statusText}`);
	}
	return await res.json();
};

export async function refreshDiscordAccessToken(
	refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
	const res = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'refresh_token',
			refresh_token: refreshToken
		})
	});
	const json = await res.json();
	if (!res.ok) {
		throw new Error(
			`Failed to refresh Discord token: ${json.error} - ${json.error_description}`
		);
	}
	return json;
}
