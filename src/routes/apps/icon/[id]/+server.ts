import { appIconHandler, applicationDB } from '$lib/applications';
import { admins, verifyCookies } from '$lib/auth';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import sharp from 'sharp';
import crypto from "node:crypto"

export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (!admins.has(cookieResult.account.username)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = params.id ?? '';

	const app = await applicationDB.getById(id);

	if (!app) {
		return json(
			{
				error: 'App not found'
			},
			{ status: 404 }
		);
	}

	const userId = app.id;

	const hash = app.iconHash;
	if (hash === 'default') {
		return json({ error: 'No avatar set' }, { status: 404 });
	}

	const defaultBuffer = await appIconHandler.getDefaultIconBuffer();
	const avatarBuffer = await sharp(defaultBuffer)
		.resize(256, 256, { fit: 'cover' })
		.webp({ quality: 80 })
		.modulate({ hue: appIconHandler.idToAngle(app.id) })
		.toBuffer();

	app.iconHash = 'default';

	await applicationDB.setById(app.id, app);

	await appIconHandler.upload(userId, 'default', avatarBuffer);

	return json({ success: true });
};

const maxUploadSize = 10 * 1024 * 1024; // 10 MB

export const POST: RequestHandler = async ({ request, cookies, params }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	if (!admins.has(cookieResult.account.username)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = params.id ?? '';

	const app = await applicationDB.getById(id);

	if (!app) {
		return json(
			{
				error: 'App not found'
			},
			{ status: 404 }
		);
	}
	const userId = app.id;

	if (!request.body) {
		throw error(400, 'No body');
	}

	let size = 0;
	const chunks: Buffer[] = [];
	const hash = crypto.createHash('sha256');
	const reader = request.body.getReader();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		size += value.byteLength;
		if (size > maxUploadSize) {
			reader.cancel();
			return json({ error: 'Avatar too large' }, { status: 413 });
		}

		hash.update(value);
		chunks.push(Buffer.from(value));
	}

	const buffer = Buffer.concat(chunks);
	const avatarHash = hash.digest('hex');

	const avatarBuffer = await sharp(buffer)
		.resize(256, 256, { fit: 'cover' })
		.webp({ quality: 80 })
		.toBuffer();

	await appIconHandler.upload(userId, avatarHash, avatarBuffer);

	app.iconHash = avatarHash;
	await applicationDB.setById(app.id, app);

	return json({ success: true, avatarHash });
};
