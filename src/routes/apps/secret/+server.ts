import z from 'zod';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { admins, genSecret, hash, verifyCookies } from '$lib/auth';
import { applicationDB } from '$lib/applications';

const PostSchema = z.object({
	id: z.string()
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { success, data, error } = await PostSchema.safeParseAsync(await request.json());
	if (!success || !data) {
		return json(
			{
				error: 'Invalid input',
				details: error
			},
			{ status: 400 }
		);
	}
	const cookieResult = await verifyCookies(cookies);
	if ('error' in cookieResult || !cookieResult.account) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (!admins.has(cookieResult.account.username)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const app = await applicationDB.getById(data.id);
	if (!app) {
		return json(
			{ error: 'Application not found' },
			{
				status: 404
			}
		);
	}

    const secret = genSecret()

    app.secretHash = await hash(secret)

    applicationDB.setById(app.id, app)

	return json({secret})
};
