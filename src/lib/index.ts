// place files you want to import through the `$lib` alias in this folder.

export function avatarUrl(id: string, hash?: string) {
	return `/avatar/${id}/${hash}.webp`;
}

export function applicationIconUrl(id: string, hash?: string) {
	return `/icon/${id}/${hash}.webp`;
}

export const defaultAvatarUrl = '/avatar/default.png';
export const defaultIconUrl = '/icon/default.png';

export const usernameRegex = /^[a-zA-Z0-9_.-]{1,32}$/;

export const getUsernameRegex = ({
	lengthRequirements = true
}: {
	lengthRequirements?: boolean;
	allowSpecialCharacters?: boolean;
	requireLetter?: boolean;
}) => {
	let regexString = '^';

	if (lengthRequirements) {
		regexString += '[a-zA-Z0-9';
		if (true) {
			regexString += '_.-';
		}
		regexString += ']{1,32}';
	} else {
		regexString += '[a-zA-Z0-9';
		if (true) {
			regexString += '_.-';
		}
		regexString += ']+';
	}

	regexString += '$';
	return new RegExp(regexString);
};

export function discordAvatarUrl(id: string, hash: string | null, size = 128) {
	if (!hash) {
		return defaultAvatarUrl;
	}
	const isAnimated = hash.startsWith('a_');
	return `https://cdn.discordapp.com/avatars/${id}/${hash}?size=${size}`;
}