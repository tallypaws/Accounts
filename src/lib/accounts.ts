import z from 'zod';
import { DBMap } from './db';
import { idToHue } from './utils';
import { usernameRegex } from '$lib';

const accountSchema = z.object({
	id: z.string(),
	username: z.string().regex(usernameRegex),
	displayName: z.string().optional(),
	avatarHash: z.string(),
	pronouns: z.string().max(100).optional(),
	bio: z.string().max(10200).optional(),

	authorizedApps: z.record(z.string(), z.literal(true)).optional()
});
  
export type Account = z.infer<typeof accountSchema>;7

const accountDBMap = new DBMap('accounts', accountSchema, null);

const usernameMap = new DBMap('usernametoid', z.string(), null);

usernameMap.onChange((key, data) => {
	console.log('usernameMap changed:', key, data);
});

type Args<T> = T extends (key: infer K, data: infer D) => any ? D : never;

export const accountDB = {
	/**
	 * @deprecated
	 */
	get: accountDBMap.get,
	getById: async (key: string) => {
		return await accountDBMap.get(key);
	},
	getByUsername: async (key: string) => {
		const id = await usernameMap.get(key);
		if (!id) return null;
		return await accountDBMap.get(id);
	},
	setById: async (key: string, data: Args<(typeof accountDBMap)['set']>) => {
		await accountDBMap.set(key, data);
		await usernameMap.set(data.username, key);
	},
	deleteById: async (key: string) => {
		await usernameMap.delete(key);
		await accountDBMap.delete(key);
	},
	deleteByUsername: async (key: string) => {
		const id = await usernameMap.get(key);
		if (!id) return;
		await usernameMap.delete(key);
		await accountDBMap.delete(id);
	}
};

const avatarPath = './avatars';
const fs = await import('fs/promises');
const fsSync = await import('fs');

export const avatarHandler = {
	getPath: (hash: string, userId: string) => {
		return `${avatarPath}/users/${userId}/${hash}.webp`;
	},

	upload: async (userId: string, hash: string, data: Buffer) => {
		const userDir = `${avatarPath}/users/${userId}`;
		await fs.mkdir(userDir, { recursive: true });
		const entries = await fs.readdir(userDir);
		for (const entry of entries) {
			if (entry !== `${hash}.webp`) {
				await fs.unlink(`${userDir}/${entry}`);
			}
		}
		const filePath = avatarHandler.getPath(hash, userId);
		await fs.writeFile(filePath, data);
		return filePath;
	},

	exists: async (userId: string, hash: string) => {
		const filePath = avatarHandler.getPath(hash, userId);
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	},
	/**
	 * only for when delete entire account!!!!!!!!!!!!!!!!!!!!
	 */
	delete: async (userId: string, hash: string) => {
		const filePath = avatarHandler.getPath(hash, userId);
		await fs.unlink(filePath);
	},
	getReadStream: async (path: string) => {
		try {
			await fs.access(path);
			return fsSync.createReadStream(path);
		} catch {
			return null;
		}
	},
	getDefaultAvatar() {
		return `${avatarPath}/default.png`;
	},
	getDefaultAvatarBuffer() {
		return fs.readFile(`${avatarPath}/default.png`);
	},
	idToAngle: idToHue
};
