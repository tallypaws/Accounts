import { json, redirect, type Cookies } from '@sveltejs/kit';
import speakeasy from 'speakeasy';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import bcrypt from 'bcrypt';
import { accountDB, type Account } from './accounts';
import crypto from 'node:crypto';
import { sessionDB } from './sessions';

const ALGO = 'aes-256-gcm';
const totpMasterKey = env.TOTP_MASTER_KEY!;
if (!totpMasterKey || totpMasterKey.length !== 64) {
	console.error('set the TOTP_MASTER_KEY environment variable to a 32-byte hex string');
	process.exit(1);
}
const JWTPrivateKeyBase64 = env.JWT_KEY!;
const JWTPrivateKey = Buffer.from(JWTPrivateKeyBase64, 'base64').toString('utf8');
if (
	!JWTPrivateKey ||
	!JWTPrivateKey.includes('-----BEGIN PRIVATE KEY-----') ||
	!JWTPrivateKey.includes('-----END PRIVATE KEY-----')
) {
	console.error('set the JWT_KEY environment variable to a valid base64 encoded private key');
	console.log(JWTPrivateKey);
	process.exit(1);
}

const JWTPublicKey = env.JWT_PUB_KEY ?? env.JWT_PUBLIC_KEY ?? `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuwPxouzmmiOqJlah9LVe
4pZ7tdJdf4d5sNqqSn2Bh05aRZyIMyIVwpqHVVxQtim7/iIUODbsmI5WCevxHw/X
jY2t0ugbNfQcsXgagjIWzMO4inRj2JBDJhsfyWO3LUlMnGtGFfyVwoufy+Ss4aNS
Fv26or/t6SlP5AXdJBHqdwvQx9jI95lQ0QzGmM4iZWN7Evbk6CZnWRf5J+xR2oEg
86KmMTC3U39Im+9k3taeHzh2yKmndzhdmuHACh1lIsgeONMVk3i2oxV7z8zGjJto
tPct/aaTkIonPS4Ka7Qf03TlPxHLXlUrj9GrjTMTeqyXAgguCRch3aLaJX2qpYce
ewIDAQAB
-----END PUBLIC KEY-----
`;

export function encryptSecret(secret: string) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALGO, Buffer.from(totpMasterKey, 'hex'), iv);
	const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(encrypted: string) {
	const [ivHex, tagHex, dataHex] = encrypted.split(':');
	const decipher = crypto.createDecipheriv(
		ALGO,
		Buffer.from(totpMasterKey, 'hex'),
		Buffer.from(ivHex, 'hex')
	);
	decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
	const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
	return decrypted.toString('utf8');
}

export function verifyTOTP(token: string, secret: string): boolean {
	const verified = speakeasy.totp.verify({
		secret: secret,
		encoding: 'hex',
		token: token,
		window: 1
	});
	return verified;
}

/**
 * @deprecated no salting this is bad
 */
export function hashOld(password: string): string {
	return crypto.createHash('sha256').update(password).digest('hex');
}

export async function hash(string: string): Promise<string> {
	// const saltRounds = 12; //fucking evil
	// const saltRounds = 200; // will kill your server
	// const saltRounds = 1000; // crime against cryptography
	const saltRounds = 10; // more normal
	return new Promise((resolve, reject) => {
		bcrypt.genSalt(saltRounds, function (err, salt) {
			bcrypt.hash(string, salt, function (err, hash) {
				if (err) reject(err);
				resolve(hash);
			});
		});
	});
}

export async function matchHash(string: string, hash: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		bcrypt.compare(string, hash, function (err, result) {
			if (err) reject(err);
			resolve(result);
		});
	});
}

export function setSessionToken(cookies: Cookies, token: string) {
	cookies.set('session_token', token, {
		path: '/',
		httpOnly: true,
		secure: env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 60 * 60 * 24 * 60 // 2 week
	});
}

export function clearSessionToken(cookies: Cookies) {
	cookies.delete('session_token', { path: '/' });
}

const ISS = 'https://accounts.tally.gay';

export const SessionTokenExpSeconds = 60 * 60 * 24 * 60; // 60 days

export function generateSessionToken(opts: { userId: string; jti: string }) {
	return jwt.sign({}, JWTPrivateKey, {
		algorithm: 'RS256',
		issuer: ISS,
		subject: opts.userId,
		audience: ISS,
		jwtid: opts.jti,
		expiresIn: SessionTokenExpSeconds
	});
}

export function verifySessionToken(token: string) {
	return jwt.verify(token, JWTPublicKey, {
		algorithms: ['RS256'],
		issuer: ISS,
		audience: ISS
	});
}

const replaceExpiringCookieWindow = 60 * 60 * 24 * 7; // 7 days

export async function verifyCookies(cookies: Cookies): Promise<
	| {
			error: 'Session not found' | 'Session token expired';
	  }
	| {
			account: null;
	  }
	| {
			account: Account;
			session: {
				id: string;
				createdAt: number;
				expiresAt: number;
				refreshAt?: number;
			};
	  }
> {
	const sessionToken = cookies.get('session_token');
	if (!sessionToken) {
		return {
			account: null
		};
	}

	let payload: any;
	try {
		payload = verifySessionToken(sessionToken);
	} catch (e) {
		clearSessionToken(cookies);
		return { error: 'Session token expired' };
	}

	const { sub: userId, jti } = payload;

	const account = await accountDB.getById(userId);

	if (!account) {
		return {
			account: null
		};
	}
	const session = await sessionDB.get(jti);
	if (!session || session.accountId !== account.id) {
		return { error: 'Session not found' };
	}

	if (Date.now() > session.expiresAt) {
		await sessionDB.delete(session.id);
		clearSessionToken(cookies);
		return { error: 'Session token expired' };
	}

	const exp = (payload.exp as number) * 1000;
	if (exp - Date.now() < replaceExpiringCookieWindow) {
		session.expiresAt = Date.now() + SessionTokenExpSeconds * 1000;
		session.refreshAt = Date.now();
		await sessionDB.set(session.id, session);

		const newSessionToken = generateSessionToken({ userId: account.id, jti: session.id });
		setSessionToken(cookies, newSessionToken);
	}

	return { account, session: { ...session, id: jti } };
}

export const admins = new Set(['tally']);

export function genId() {
	const timestamp = Date.now();
	const randomBits = crypto.randomBytes(4).toString('hex');
	return `${timestamp.toString(32)}${randomBits}`;
}

export function genSecret() {
	const randomBits = crypto.randomBytes(32).toString('hex');
	return `${randomBits}`;
}

export function generateOAuthAccessToken(opts: {
	userId: string;
	clientId: string;
	scope?: string;
	expiresInSeconds?: number;
}) {
	const expiresIn = opts.expiresInSeconds ?? 3600;
	const jti = crypto.randomBytes(16).toString('hex');
	const token = jwt.sign({ scope: opts.scope ?? '' }, JWTPrivateKey, {
		algorithm: 'RS256',
		issuer: ISS,
		subject: opts.userId,
		audience: opts.clientId,
		jwtid: jti,
		expiresIn: expiresIn
	});
	return { token, jti, expiresIn };
}

export function verifyOAuthAccessToken(token: string) {
	return jwt.verify(token, JWTPublicKey, {
		algorithms: ['RS256'],
		issuer: ISS
	});
}
