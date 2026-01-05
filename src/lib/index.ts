// place files you want to import through the `$lib` alias in this folder.

export function avatarUrl(id: string, hash?: string) {
	return `/avatar/${id}/${hash}.webp`;
}

export function applicationIconUrl(id: string, hash?: string) {
    return `/icon/${id}/${hash}.webp`;
}

export const defaultAvatarUrl = '/avatar/default.png';
export const defaultIconUrl = '/icon/default.png';
