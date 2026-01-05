import { avatarHandler } from '$lib/accounts';
import { stat } from 'fs/promises';
import type { RequestHandler } from './$types';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ params }) => {
	const { id, hash } = params;
	const path = avatarHandler.getPath(hash, id);

	console.log('Fetching avatar from path:', path, 'id:', id, 'hash:', hash);

	const statPromise = stat(path);
	const stream = await avatarHandler.getReadStream(path);

	if (!stream) {
		return new Response('Not found', { status: 404 });
	}

	const body = Readable.toWeb(stream) as unknown as ReadableStream;
    const { size } = await statPromise;

	return new Response(body, {
		headers: {
			'Content-Type': 'image/webp',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Content-Length': size.toString()
		}
	});
};
