import z from 'zod';
import { json } from '@sveltejs/kit';
import { accountDB, avatarHandler } from '$lib/accounts';
import { generateSessionToken, genId, setSessionToken } from '$lib/auth';
import sharp from 'sharp';
import { identityDB, type DiscordIdentity } from '$lib/identity';
import { usernameRegex } from '$lib';

import { _discordCreationReferrals as discordCreationReferrals } from '../../../../../login/provider/discord/callback/+page.server';
import { generateSession, sessionDB } from '$lib/sessions.js';

const createSchema = z.object({
	username: z.string().regex(usernameRegex),
	displayName: z.string().min(1).max(64).optional(),
	referralCode: z.string()
});

export async function POST({ request, url, cookies }) {
	console.log('Creating account');
	const bodyText = await request.text();
	console.log(bodyText);
	const bodyJson = JSON.parse(bodyText);
	const parsed = createSchema.safeParse(bodyJson);
	if (!parsed.success) {
		return json(
			{
				error: 'Invalid input',
				details: parsed.error
			},
			{ status: 400 }
		);
	}

	console.log(discordCreationReferrals.size);
	const { username, displayName, referralCode } = parsed.data;

	const referralData = discordCreationReferrals.get(referralCode);
	if (!referralData) {
		return json(
			{
				error: 'Referral Required'
			},
			{ status: 400 }
		);
	}
	const loginAfter = url.searchParams.get('login') === 'true';

	console.log('creating account with discord:', { username, displayName, referralCode });
	const existing = await accountDB.getByUsername(username);
	console.log(existing, username);
	if (existing) {
		return json(
			{
				error: 'Account already exists'
			},
			{ status: 409 }
		);
	}

	const acc = {
		id: genId(),
		username,
		displayName,
		avatarHash: 'default'
	};

	const discordIdentity: DiscordIdentity = {
		id: genId(),
		accountId: acc.id,
		provider: 'discord' as const,
		providerId: referralData.discordId,
		data: {
			avatarHash: referralData.discordAvatar,
			username: referralData.discordUsername
		},
		createdAt: Date.now()
	};

	await accountDB.setById(acc.id, acc);
	await identityDB.setById(discordIdentity.id, discordIdentity);

	let avatarBuffer: Buffer<ArrayBufferLike> | null = null;

	const discordAvatarUrl = `https://cdn.discordapp.com/avatars/${referralData.discordId}/${referralData.discordAvatar}`;
	console.log('Fetching Discord avatar from URL:', discordAvatarUrl);

	try {
		const result = await fetch(discordAvatarUrl);
		if (result.ok) {
			const arrayBuffer = await result.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			avatarBuffer = await sharp(buffer)
				.resize(256, 256, { fit: 'cover' })
				.webp({ quality: 80 })
				.toBuffer();
		}
	} catch (e) {}

	if (!avatarBuffer) {
		const defaultBuffer = await avatarHandler.getDefaultAvatarBuffer();

		avatarBuffer = await sharp(defaultBuffer)
			.resize(256, 256, { fit: 'cover' })
			.webp({ quality: 80 })
			.modulate({ hue: avatarHandler.idToAngle(acc.id) })
			.toBuffer();
	}

	await avatarHandler.upload(acc.id, 'default', avatarBuffer);

	console.log('account:', acc);

	await accountDB.setById(acc.id, acc);

	if (loginAfter) {
		const session = generateSession(acc.id, discordIdentity.id);

		await sessionDB.set(session.id, session);
		setSessionToken(cookies, generateSessionToken({ userId: acc.id, jti: session.id }));
	}

	return json({ success: true });
}
