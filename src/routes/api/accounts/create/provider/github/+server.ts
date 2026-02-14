import z from 'zod';
import { json } from '@sveltejs/kit';
import { accountDB, avatarHandler } from '$lib/accounts';
import { generateSessionToken, genId, setSessionToken } from '$lib/auth';
import sharp from 'sharp';
import { identityDB, type DiscordIdentity, type GithubIdentity } from '$lib/identity';
import { usernameRegex } from '$lib';

import { _githubCreationReferrals as githubCreationReferrals} from '../../../../../login/provider/github/callback/+page.server';
import { generateSession, sessionDB } from '$lib/sessions.js';

const createSchema = z.object({
	username: z.string().regex(usernameRegex),
	displayName: z.string().min(1).max(64).optional(),
	referralCode: z.string()
});

export async function POST({ request, url, cookies }) {
	const bodyText = await request.text();
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

	const { username, displayName, referralCode } = parsed.data;

	const referralData = githubCreationReferrals.get(referralCode);
	if (!referralData) {
		return json(
			{
				error: 'Referral Required'
			},
			{ status: 400 }
		);
	}
	const loginAfter = url.searchParams.get('login') === 'true';

	const existing = await accountDB.getByUsername(username);
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

	const githubIdentity: GithubIdentity = {
		id: genId(),
		accountId: acc.id,
		provider: 'github' as const,
		providerId: referralData.githubId,
		data: {
			avatarUrl: referralData.githubAvatar,
			username: referralData.githubUsername
		},
		createdAt: Date.now(),
		accessToken: referralData.accessToken 
	};

	await accountDB.setById(acc.id, acc);
	await identityDB.setById(githubIdentity.id, githubIdentity);

	let avatarBuffer: Buffer<ArrayBufferLike> | null = null;

	const githubAvatarUrl = referralData.githubAvatar ?? "";

	try {
		const result = await fetch(githubAvatarUrl);
		if (result.ok) {
			const arrayBuffer = await result.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			avatarBuffer = await sharp(buffer)
				.resize(256, 256, { fit: 'cover' })
				.webp({ quality: 80 })
				.toBuffer();
		}
	} catch (e) { }

	if (!avatarBuffer) {
		const defaultBuffer = await avatarHandler.getDefaultAvatarBuffer();

		avatarBuffer = await sharp(defaultBuffer)
			.resize(256, 256, { fit: 'cover' })
			.webp({ quality: 80 })
			.modulate({ hue: avatarHandler.idToAngle(acc.id) })
			.toBuffer();
	}

	await avatarHandler.upload(acc.id, 'default', avatarBuffer);


	await accountDB.setById(acc.id, acc);

	if (loginAfter) {
		const session = generateSession(acc.id, githubIdentity.id);

		await sessionDB.set(session.id, session);
		setSessionToken(cookies, generateSessionToken({ userId: acc.id, jti: session.id }));
	}

	return json({ success: true });
}
