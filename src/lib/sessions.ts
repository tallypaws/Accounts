import z from "zod";
import { DBMap, DBNestedMapX } from "./db";
import crypto from "crypto";

const sessionSchema = z.object({
	id: z.string(),
	accountId: z.string(),
	identityId: z.string(),

	createdAt: z.number(),
	expiresAt: z.number(),
	refreshAt: z.number().optional()
});

export const sessionDB = new DBMap('sessions', sessionSchema, null);

export const sessionIdentityIndex = await DBNestedMapX.create(
	'sessionidentityindex',
	z.literal(true),
	null,
	2
);

sessionDB.onChange(async (key, data) => {
	if (data) {
		await sessionIdentityIndex.set([data.identityId, key], true);
	} else {
		const entries = await sessionIdentityIndex.find(['*', key], true);
		for (const e of entries) {
			const identityId = e.key1;
			try {
				await sessionIdentityIndex.delete([identityId, key]);
			} catch {}
		}
	}
});

export function generateSession(
	accountId: string, identityId: string
) {
	const jti = crypto.randomBytes(16).toString('hex');

	const session = {
		id: jti,
		accountId: accountId,
		identityId: identityId,
		createdAt: Date.now(),
		expiresAt: Date.now() + 60 * 60 * 24 * 60 * 1000
	};
	return session;
}

export async function deleteSessionsByIdentityId(identityId: string) {
	const entries = await sessionIdentityIndex.find([identityId, '*'], true);
	for (const entry of entries) {
		const sessionId = entry.key2;
		await sessionDB.delete(sessionId);
	}
}

