import { avatarHandler } from '$lib/accounts';
import { stat } from 'fs/promises';
import type { RequestHandler } from './$types';
import { Readable } from 'stream';

export const GET: RequestHandler = async () => {
	const path = avatarHandler.getDefaultAvatar();

	const stream = await avatarHandler.getReadStream(path);
	const { size } = await stat(path);
	if (!stream) {
		return new Response('Not found', { status: 404 });
	}

	const body = Readable.toWeb(stream) as unknown as ReadableStream;

	return new Response(body, {
		headers: {
			'Content-Type': 'image/webp',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Content-Length': size.toString()
		}
	});
};
