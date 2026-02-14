import z from 'zod';
import { DBMap } from './db';
import { idToHue } from './utils';
const appSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	redirectUris: z.array(z.string()),
	iconHash: z.string().optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
	secretHash: z.string(),
	authCodes: z
		.record(
			z.string(),
			z.object({
				userId: z.string(),
				createdAt: z.number(),
				exp: z.number(),
				scope: z.string(),
				redirectUri: z.string()
			})
		)
		.optional()
});
const applicationDBMap = new DBMap('applications', appSchema, null);

export type App = z.infer<typeof appSchema>;

const nameMap = new DBMap('appnametoid', z.string(), null);

type Args<T> = T extends (key: infer K, data: infer D) => any ? D : never;

export const applicationDB = {
	/**
	 * @deprecated
	 */
	get: applicationDBMap.get,
	getById: async (key: string) => {
		return applicationDBMap.get(key);
	},
	getByName: async (key: string) => {
		const id = await nameMap.get(key);
		if (!id) return null;
		return await applicationDBMap.get(id);
	},
	setById: async (key: string, data: Args<(typeof applicationDBMap)['set']>) => {
		await applicationDBMap.set(key, data);
		await nameMap.set(data.name, key);
	},
	setByName: async (key: string, data: Args<(typeof applicationDBMap)['set']>) => {
		const id = await nameMap.get(key);
		if (!id) return;
		await applicationDBMap.set(id, data);
	},
	deleteById: async (key: string) => {
		await nameMap.delete(key);
		await applicationDBMap.delete(key);
	},
	deleteByName: async (key: string) => {
		const id = await nameMap.get(key);
		if (!id) return;
		await nameMap.delete(key);
		await applicationDBMap.delete(id);
	},

	getAllKeys: async () => {
		return await applicationDBMap.allKeys();
	}
};

const avatarPath = './avatars';
const fs = await import('fs/promises');
const fsSync = await import('fs');

export const appIconHandler = {
	getPath: (hash: string, appId: string) => {
		return `${avatarPath}/applications/${appId}/${hash}.webp`;
	},

	getFolderPath: (appId: string) => {
		return `${avatarPath}/applications/${appId}`;
	},

	upload: async (appId: string, hash: string, data: Buffer) => {
		const applicationDir = `${avatarPath}/applications/${appId}`;
		await fs.mkdir(applicationDir, { recursive: true });
		const entries = await fs.readdir(applicationDir);
		for (const entry of entries) {
			if (entry !== `${hash}.webp`) {
				await fs.unlink(`${applicationDir}/${entry}`);
			}
		}
		const filePath = appIconHandler.getPath(hash, appId);
		await fs.writeFile(filePath, data);
		return filePath;
	},

	exists: async (appId: string, hash: string) => {
		const filePath = appIconHandler.getPath(hash, appId);
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	},
	/**
	 * 
	 * only for when delete whole app!!!
	 */
	delete: async (appId: string) => {
		try {
			const folderPath = appIconHandler.getFolderPath(appId);
			await fs.rm(folderPath, { recursive: true, force: true });
		} catch (error) {}
	},
	getReadStream: async (path: string) => {
		try {
			await fs.access(path);
			return fsSync.createReadStream(path);
		} catch {
			return null;
		}
	},
	getDefaultIcon() {
		return `${avatarPath}/default-bot.png`;
	},
	getDefaultIconBuffer() {
		return fs.readFile(`${avatarPath}/default-bot.png`);
	},
	idToAngle: idToHue
};
``;
