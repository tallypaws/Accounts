import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyCookies, verifySessionToken } from '$lib/auth';
import { accountDB, avatarHandler } from '$lib/accounts';
import crypto from 'node:crypto';
import sharp from 'sharp';

export const DELETE: RequestHandler = async ({ cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { account } = cookieResult;
	const userId = account.id;

	const hash = account.avatarHash;
	if (hash === 'default') {
		return json({ error: 'No avatar set' }, { status: 404 });
	}

	const defaultBuffer = await avatarHandler.getDefaultAvatarBuffer();
	const avatarBuffer = await sharp(defaultBuffer)
		.resize(256, 256, { fit: 'cover' })
		.webp({ quality: 80 })
		.modulate({ hue: avatarHandler.idToAngle(account.id) })
		.toBuffer();

	account.avatarHash = 'default';

	await accountDB.setById(account.id, account);

	await avatarHandler.upload(userId, 'default', avatarBuffer);

	return json({ success: true });
};

const maxUploadSize = 10 * 1024 * 1024; // 10 MB

export const POST: RequestHandler = async ({ request, cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { account } = cookieResult;
	const userId = account.id;
	if (!request.body) {
		console.log('No body in request', request);
		throw error(400, 'No body');
	}

	let size = 0;
	const chunks: Buffer[] = [];
	const hash = crypto.createHash('sha256');
	const reader = request.body.getReader();
    // dont touch it works
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

	await avatarHandler.upload(userId, avatarHash, avatarBuffer);

	account.avatarHash = avatarHash;
	await accountDB.setById(account.id, account);

	return json({ success: true, avatarHash });
};
