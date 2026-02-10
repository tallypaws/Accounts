import z from 'zod';
import { DBMap, DBNestedMapX } from './db';
import { deleteSessionsByIdentityId } from './sessions';

const baseIdentitySchema = z.object({
	id: z.string(),
	accountId: z.string(),

	providerId: z.string(),
	createdAt: z.number(),
	lastUsedAt: z.number().optional()
});

const passwordIdentitySchema = baseIdentitySchema.extend({
	provider: z.literal('password'),
	data: z.object({
		passwordHash: z.string(),
		totp: z
			.object({
				secret: z.string(),
				backupCodes: z.array(z.string()).length(10)
			})
			.optional()
	})
});

const discordIdentitySchema = baseIdentitySchema.extend({
	provider: z.literal('discord'),
	data: z.object({
		username: z.string(),
		avatarHash: z.string().nullable()
	})
});

const githubIdentitySchema = baseIdentitySchema.extend({
	provider: z.literal('github'),
	data: z.object({
		username: z.string(),
		avatarUrl: z.string().nullable()
	})
});

const googleIdentitySchema = baseIdentitySchema.extend({
	provider: z.literal('google'),
	data: z.object({
		email: z.string(),
		fullName: z.string().nullable(),
		avatarUrl: z.string().nullable()
	})
});

const identitySchema = z.discriminatedUnion('provider', [
	passwordIdentitySchema,
	discordIdentitySchema,
	githubIdentitySchema,
	googleIdentitySchema
]);

export type DiscordIdentity = z.infer<typeof discordIdentitySchema>;
export type GithubIdentity = z.infer<typeof githubIdentitySchema>;
export type GoogleIdentity = z.infer<typeof googleIdentitySchema>;
export type PasswordIdentity = z.infer<typeof passwordIdentitySchema>;

type Args<T> = T extends (key: infer K, data: infer D) => any ? D : never;

type OnlyProvider<P, T> = T extends { provider: P } ? T : never;
type NullableOnlyProvider<P, T> = OnlyProvider<P, T> | null;

export type Identity = z.infer<typeof identitySchema>;

export const identityDBMap = new DBMap('identities', identitySchema, null);

export const identityLookup = new DBMap('identitylookup', z.string(), null);

export const accountIdentityIndex = await DBNestedMapX.create(
	'accountidentityindex',
	z.literal(true),
	null,
	2
);

function setIdentityForAccount(accountId: string, identityId: string) {
	return accountIdentityIndex.set([accountId, identityId], true);
}

async function getIdentitiesForAccount(accountId: string) {
	return (await accountIdentityIndex.find([accountId, '*'], true)).map(({ key2 }) => key2);
}

function deleteIdentityForAccount(accountId: string, identityId: string) {
	return accountIdentityIndex.delete([accountId, identityId]);
}

export const identityDB = {
	getById: async (id: string) => {
		return await identityDBMap.get(id);
	},

	getByProvider: async <P extends Identity['provider'] = Identity['provider']>(
		provider: P,
		providerId: string
	): Promise<NullableOnlyProvider<P, Identity>> => {
		const key = `${provider}:${providerId}`;
		const id = await identityLookup.get(key);
		if (!id) return null;
		const identity = await identityDBMap.get(id);
		if (!identity) return null;
		if (identity.provider !== provider) return null;
		return identity as NullableOnlyProvider<P, Identity>;
	},

	setById: async (id: string, data: Args<(typeof identityDBMap)['set']>) => {
		await identityDBMap.set(id, data);
		await identityLookup.set(`${data.provider}:${data.providerId}`, id);
		await setIdentityForAccount(data.accountId, id);
	},

	deleteById: async (id: string) => {
		const identity = await identityDBMap.get(id);
		if (!identity) return;
		await deleteSessionsByIdentityId(id);
		await identityLookup.delete(`${identity.provider}:${identity.providerId}`);
		await identityDBMap.delete(id);
		await deleteIdentityForAccount(identity.accountId, id);
	},

	deleteByProvider: async (provider: string, providerId: string) => {
		const id = await identityLookup.get(`${provider}:${providerId}`);
		if (!id) return;
		const identity = await identityDB.getById(id);
		if (!identity) return;

		await accountIdentityIndex.delete([identity.accountId, identity.id]);
		await identityDBMap.delete(id);
		await identityLookup.delete(`${provider}:${providerId}`);
	},

	getAllForAccount: async (accountId: string) => {
		const entries = await getIdentitiesForAccount(accountId);
		const identities: Identity[] = [];
		for (const identityId of entries) {
			const identity = await identityDBMap.get(identityId);
			if (identity) {
				identities.push(identity);
			}
		}
		return identities;
	}
};
