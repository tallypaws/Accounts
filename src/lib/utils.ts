import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export class Bitmap<V extends string> {
	private index = new Map<V, number>();

	constructor(public readonly values: readonly V[]) {
		values.forEach((v, i) => this.index.set(v, i));
	}

	contains(value: V): boolean {
		return this.index.has(value);
	}

	toBitmap(values: readonly V[]): bigint {
		let acc = 0n;

		for (const value of values) {
			const i = this.index.get(value);
			if (i === undefined) {
				throw new Error(`unkonwn bitmap value: ${value}`);
			}
			acc |= 1n << BigInt(i);
		}

		return acc;
	}

	fromBitmap(bitmap: bigint): Set<V> {
		return new Set(this.values.filter((_, i) => (bitmap & (1n << BigInt(i))) !== 0n))
	}
}

export const ScopeBitField = new Bitmap([
	"identify",
	"discord"
]);

export function idToHue(str: string): number {
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		hash = (hash * 31 + str.charCodeAt(i)) | 0;
	}

	return Math.abs(hash) % 360;
}
	