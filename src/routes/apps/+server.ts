import z from 'zod';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { applicationDB, type App, appIconHandler } from '$lib/applications';
import { admins, genId, genSecret, hash, verifyCookies } from '$lib/auth';
import sharp from 'sharp';

const PATCHSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	redirectUris: z.array(
		z
			.string()
			.regex(
				/^https?:\/\/(localhost|([a-z0-9-]+\.)+[a-zA-Z]{2,}(:\d{1,5})?|([a-z0-9-]+)(:\d{1,5}))(?:\/[^\n]*)?$/
			)
	)
});

export const PATCH: RequestHandler = async ({ request, cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!admins.has(cookieResult.account.username)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const parsed = await PATCHSchema.safeParseAsync(body);
	if (!parsed.success) {
		return json(
			{
				error: 'Invalid input',
				details: parsed.error
			},
			{ status: 400 }
		);
	}
	const { id, name, redirectUris, description } = parsed.data;

	const app = await applicationDB.getById(id);
	if (!app) {
		return json(
			{
				error: 'App not found'
			},
			{ status: 404 }
		);
	}
	app.name = name;
	app.redirectUris = redirectUris;
	app.description = description;
	app.updatedAt = Date.now();

	await applicationDB.setById(id, app);
	return json({ success: true });
};

const POSTSchema = z.object({
	name: z.string(),
	description: z.string().optional()
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!admins.has(cookieResult.account.username)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const parsed = await POSTSchema.safeParseAsync(body);
	if (!parsed.success) {
		return json(
			{
				error: 'Invalid input',
				details: parsed.error
			},
			{ status: 400 }
		);
	}
	const { name, description } = parsed.data;
	const secret = genSecret();
	const app: App = {
		id: genId(),
		name,
		description,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		redirectUris: [],
		secretHash: await hash(secret),
		iconHash: 'default'
	};

	const defaultBuffer = await appIconHandler.getDefaultIconBuffer();
	const avatarBuffer = await sharp(defaultBuffer)
		.resize(256, 256, { fit: 'cover' })
		.webp({ quality: 80 })
		.modulate({ hue: appIconHandler.idToAngle(app.id) })
		.toBuffer();

	await appIconHandler.upload(app.id, 'default', avatarBuffer);

	await applicationDB.setById(app.id, app);
	return json({ success: true, app, secret });
};

const DELETESchema = z.object({
	id: z.string()
});

export const DELETE: RequestHandler = async ({ request, cookies }) => {
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!admins.has(cookieResult.account.username)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const parsed = await DELETESchema.safeParseAsync(body);
	if (!parsed.success) {
		return json(
			{
				error: 'Invalid input',
				details: parsed.error
			},
			{ status: 400 }
		);
	}
	const { id } = parsed.data;

	appIconHandler.delete(id)

	await applicationDB.deleteById(id);
	return json({ success: true });
};
