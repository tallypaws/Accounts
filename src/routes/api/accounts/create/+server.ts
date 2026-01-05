import z from 'zod';
import { json } from '@sveltejs/kit';
import { accountDB, avatarHandler } from '$lib/accounts';
import { genId, hash } from '$lib/auth';
import sharp from 'sharp';

const createSchema = z.object({
	username: z
		.string()
		.min(3)
		.max(32)
		.regex(/^[a-zA-Z0-9_.-]+$/),
	displayName: z.string().min(1).max(64).optional(),
	password: z.string().min(8).max(128)
});

export async function POST({ request, cookies }) {
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
	const { username, displayName, password } = parsed.data;
	console.log('account:', { username, displayName, password });
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
		username: username,
		displayName: displayName,
		passwordHash: await hash(password),
		avatarHash: 'default'
	};

	const defaultBuffer = await avatarHandler.getDefaultAvatarBuffer();
	const avatarBuffer = await sharp(defaultBuffer)
		.resize(256, 256, { fit: 'cover' })
		.webp({ quality: 80 })
		.modulate({ hue: avatarHandler.idToAngle(acc.id) })
		.toBuffer();

	await avatarHandler.upload(acc.id, 'default', avatarBuffer);

	console.log('account:', acc);

	await accountDB.setById(acc.id, acc);
	return json({ success: true });
}
