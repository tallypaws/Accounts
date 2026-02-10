//@ts-nocheck
async function handleInternalHTTP(req: http.IncomingMessage, res: http.ServerResponse) {
	if (!req.headers['x-internal'] || req.headers['x-internal'] !== internalToken) {
		res.writeHead(403, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}

	switch (req.url) {
		case '/internal/accounts/create':
			if (req.method === 'POST') {
				const chunks: any[] = [];
				req.on('data', (chunk) => chunks.push(chunk));
				await new Promise((resolve) => req.on('end', resolve));
				const body = Buffer.concat(chunks);

				try {
					const json = JSON.parse(body.toString());
					const createSchema = z.object({
						username: z
							.string()
							.min(3)
							.max(32)
							.regex(/^[a-zA-Z0-9_.-]+$/),
						displayName: z.string().min(1).max(64).optional(),
						password: z.string().min(8).max(128)
					});
					const parsed = createSchema.safeParse(json);
					if (!parsed.success) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
						return;
					}
					const { username, displayName, password } = parsed.data;

					const existing = await accountDB.get(username);
					if (existing) {
						res.writeHead(409, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Username already exists' }));
						return;
					}
					const acc = {
						displayName: displayName,
						passwordHash: hash(password)
					};
					await accountDB.set(username, acc);
					res.writeHead(201, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ success: true }));
				} catch (error) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Invalid JSON' }));
					return;
				}
			}
			break;
		case '/internal/accounts/login':
			if (req.method === 'POST') {
				const chunks: any[] = [];
				req.on('data', (chunk) => chunks.push(chunk));
				await new Promise((resolve) => req.on('end', resolve));
				const body = Buffer.concat(chunks);
				try {
					const json = JSON.parse(body.toString());
					const verifySchema = z.object({
						username: z.string(),
						password: z.string(),
						totp: z.string().optional()
					});
					const parsed = verifySchema.safeParse(json);
					if (!parsed.success) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
						return;
					}
					const { username, password, totp } = parsed.data;

					const acc = await accountDB.get(username);
					if (!acc || acc.passwordHash !== hash(password)) {
						res.writeHead(401, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid username or password' }));
						return;
					}

					if (acc.totp) {
						if (!totp) {
							res.writeHead(200, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ success: true, requiresTOTP: true }));
							return;
						}
						const decryptedSecret = decryptSecret(acc.totp.secret);
						if (!verifyTOTP(totp, decryptedSecret)) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid TOTP code' }));
							return;
						}
					} else if (totp) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'TOTP not enabled for this account' }));
						return;
					}

					const token = generateToken();
					await tokenDB.set(token, {
						userId: username,
						createdAt: new Date(),
						expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
					});
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(
						JSON.stringify({
							success: true,
							account: {
								displayName: acc.displayName,
								hasTOTP: !!acc.totp,
								username,
								avatarUrl: acc.avatarUrl
							},
							token
						})
					);
				} catch (error) {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Invalid JSON' }));
					return;
				}
			}
			break;
		case '/internal/accounts/logout':
			console.log('Received logout request');
			{
				if (req.method === 'POST') {
					console.log('Processing logout request');
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);
					try {
						const json = JSON.parse(body.toString());
						const logoutSchema = z.object({
							token: z.string()
						});
						const parsed = logoutSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { token } = parsed.data;
						await tokenDB.delete(token);
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ success: true }));
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid JSON' }));
						return;
					}
				} else {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ success: true }));
				}
			}
			break;

		case '/internal/accounts/edit':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);
					try {
						const json = JSON.parse(body.toString());
						const editSchema = z.object({
							token: z.string(),
							displayName: z.string().min(1).max(64).optional(),
							avatarUrl: z.preprocess(
								(val) => (val === '' ? undefined : val),
								z.string().url().optional()
							)
						});
						const parsed = editSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { token, displayName, avatarUrl } = parsed.data;
						const tokenData = await tokenDB.get(token);
						if (!tokenData || tokenData.expiresAt < new Date()) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid or expired token' }));
							await tokenDB.delete(token);
							return;
						}
						const acc = await accountDB.get(tokenData.userId);
						if (!acc) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid token' }));
							return;
						}
						if (avatarUrl) {
							acc.avatarUrl = avatarUrl;
						} else {
							delete acc.avatarUrl;
						}
						if (displayName) {
							acc.displayName = displayName;
						} else {
							delete acc.displayName;
						}
						await accountDB.set(tokenData.userId, acc);
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ success: true }));
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid JSON' }));
						return;
					}
				}
			}
			break;
		case '/internal/accounts/verify-token':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);
					try {
						const json = JSON.parse(body.toString());
						const verifySchema = z.object({
							token: z.string()
						});
						const parsed = verifySchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { token } = parsed.data;

						const tokenData = await tokenDB.get(token);
						if (!tokenData || tokenData.expiresAt < new Date()) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid or expired token' }));
							await tokenDB.delete(token);
							return;
						}
						tokenData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
						await tokenDB.set(token, tokenData);
						const acc = await accountDB.get(tokenData.userId);
						if (!acc) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid token' }));
							return;
						}
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({
								success: true,
								account: {
									displayName: acc.displayName,
									hasTOTP: !!acc.totp,
									username: tokenData.userId,
									avatarUrl: acc.avatarUrl
								}
							})
						);
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid JSON' }));
						return;
					}
				}
			}
			break;
		case '/internal/accounts/start-totp-setup':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);

					try {
						const json = JSON.parse(body.toString());
						const startSchema = z.object({
							token: z.string(),
							password: z.string()
						});
						const parsed = startSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { token, password } = parsed.data;

						const tokenData = await tokenDB.get(token);
						if (!tokenData || tokenData.expiresAt < new Date()) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid or expired token' }));
							await tokenDB.delete(token);
							return;
						}

						const acc = await accountDB.get(tokenData.userId);
						if (!acc || acc.passwordHash !== hash(password)) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid token or password' }));
							return;
						}

						if (acc.totp) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'TOTP already set up' }));
							return;
						}

						const secret = speakeasy.generateSecret({ length: 20 });
						const backupCodes = generateBackupCodes();

						tokenData.pendingTOTP = {
							secretBase32: secret.base32,
							secretHex: secret.hex,
							otpauth_url: secret.otpauth_url || '',
							backupCodes,
							expiresAt: new Date(Date.now() + PENDING_EXPIRY_MS)
						};

						tokenData.expiresAt = new Date(Date.now() + PENDING_EXPIRY_MS);
						await tokenDB.set(token, tokenData);

						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({
								success: true,
								otpauth_url: secret.otpauth_url,
								secret: secret.base32,
								backupCodes
							})
						);
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid JSON' }));
						return;
					}
				}
			}
			break;

		case '/internal/accounts/finalize-totp-setup':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);

					try {
						const json = JSON.parse(body.toString());
						const finalizeSchema = z.object({
							token: z.string(),
							password: z.string(),
							code: z.string()
						});
						const parsed = finalizeSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { token, password, code } = parsed.data;

						const tokenData = await tokenDB.get(token);
						if (!tokenData || tokenData.expiresAt < new Date()) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid or expired token' }));
							await tokenDB.delete(token);
							return;
						}

						if (!tokenData.pendingTOTP) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'No pending TOTP setup found. Start setup first.' }));
							return;
						}

						const pending = tokenData.pendingTOTP as {
							secretBase32: string;
							secretHex: string;
							otpauth_url: string;
							backupCodes: string[];
							expiresAt: Date;
						};

						if (new Date(pending.expiresAt) < new Date()) {
							delete tokenData.pendingTOTP;
							await tokenDB.set(token, tokenData);
							res.writeHead(410, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Pending TOTP setup expired. Please start again.' }));
							return;
						}

						const acc = await accountDB.get(tokenData.userId);
						if (!acc || acc.passwordHash !== hash(password)) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid token or password' }));
							return;
						}

						if (acc.totp) {
							delete tokenData.pendingTOTP;
							await tokenDB.set(token, tokenData);
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'TOTP already set up on this account' }));
							return;
						}

						let usedBackupCode: string | null = null;
						let verified = false;

						verified = speakeasy.totp.verify({
							secret: pending.secretBase32,
							encoding: 'base32',
							token: code,
							window: 1
						});

						if (!verified) {
							const matching = pending.backupCodes.find((c) => c === code);
							if (matching) {
								verified = true;
								usedBackupCode = matching;
							}
						}

						if (!verified) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid TOTP/backup code' }));
							return;
						}

						const encryptedSecret = encryptSecret(pending.secretHex);

						let storedBackupHashes: string[] = pending.backupCodes
							.filter((c) => c !== usedBackupCode)
							.map((c) => hash(c));

						acc.totp = {
							secret: encryptedSecret,
							backupCodes: storedBackupHashes
						};

						await accountDB.set(tokenData.userId, acc);
						delete tokenData.pendingTOTP;
						tokenData.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
						await tokenDB.set(token, tokenData);

						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ success: true, message: 'TOTP setup finalized' }));
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({ error: 'Invalid JSON or server error', detail: String(error) })
						);
						return;
					}
				}
			}
			break;

		case '/internal/accounts/remove-totp':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);

					try {
						const json = JSON.parse(body.toString());
						const removeSchema = z.object({
							token: z.string(),
							password: z.string(),
							totp: z.string()
						});
						const parsed = removeSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { token, password, totp } = parsed.data;

						const tokenData = await tokenDB.get(token);
						if (!tokenData || tokenData.expiresAt < new Date()) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid or expired token' }));
							await tokenDB.delete(token);
							return;
						}

						const acc = await accountDB.get(tokenData.userId);
						if (!acc || acc.passwordHash !== hash(password)) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid token or password' }));
							return;
						}

						if (!acc.totp) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'TOTP not set up on this account' }));
							return;
						}

						const decryptedSecret = decryptSecret(acc.totp.secret);
						if (!verifyTOTP(totp, decryptedSecret)) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid TOTP code' }));
							return;
						}

						delete acc.totp;
						await accountDB.set(tokenData.userId, acc);
						tokenData.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
						await tokenDB.set(token, tokenData);

						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ success: true, message: 'TOTP removed from account' }));
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({ error: 'Invalid JSON or server error', detail: String(error) })
						);
						return;
					}
				}
			}
			break;

		case '/internal/accounts/get-user-info':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);

					try {
						const json = JSON.parse(body.toString());
						const getUserInfoSchema = z.object({
							username: z.string()
						});
						const parsed = getUserInfoSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { username } = parsed.data;

						const acc = await accountDB.get(username);
						if (!acc) {
							res.writeHead(404, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'User not found' }));
							return;
						}

						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({
								success: true,
								user: {
									displayName: acc.displayName,
									avatarUrl: acc.avatarUrl
								}
							})
						);
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid JSON' }));
						return;
					}
				}
			}
			break;

		case '/internal/accounts/change-username':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);

					try {
						const json = JSON.parse(body.toString());
						const changeUsernameSchema = z.object({
							token: z.string(),
							newUsername: z
								.string()
								.min(3)
								.max(32)
								.regex(/^[a-zA-Z0-9_.-]+$/),
							password: z.string().min(8).max(128)
						});
						const parsed = changeUsernameSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { token, newUsername, password } = parsed.data;

						const tokenData = await tokenDB.get(token);
						if (!tokenData || tokenData.expiresAt < new Date()) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid or expired token' }));
							await tokenDB.delete(token);
							return;
						}

						const currentUsername = tokenData.userId;
						const currentAccount = await accountDB.get(currentUsername);
						if (!currentAccount) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid token' }));
							return;
						}

						if (currentAccount.passwordHash !== hash(password)) {
							res.writeHead(401, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid password' }));
							return;
						}

						const existingAccount = await accountDB.get(newUsername);
						if (existingAccount) {
							res.writeHead(409, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Username already taken' }));
							return;
						}

						await accountDB.set(newUsername, currentAccount);

						const boardData = await boardDB.get(currentUsername);
						if (boardData) {
							await boardDB.set(newUsername, boardData);
							await boardDB.delete(currentUsername);
						}

						tokenData.userId = newUsername;
						await tokenDB.set(token, tokenData);

						await accountDB.delete(currentUsername);

						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({
								success: true,
								account: {
									username: newUsername,
									displayName: currentAccount.displayName,
									avatarUrl: currentAccount.avatarUrl,
									hasTOTP: !!currentAccount.totp
								}
							})
						);
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid JSON' }));
						return;
					}
				}
			}
			break;

		case '/internal/boards/get':
			{
				if (req.method === 'POST') {
					const chunks: any[] = [];
					req.on('data', (chunk) => chunks.push(chunk));
					await new Promise((resolve) => req.on('end', resolve));
					const body = Buffer.concat(chunks);

					try {
						const json = JSON.parse(body.toString());
						const getBoardSchema = z.object({
							userId: z.string()
						});
						const parsed = getBoardSchema.safeParse(json);
						if (!parsed.success) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ error: 'Invalid input', details: parsed.error }));
							return;
						}
						const { userId } = parsed.data;

						const boardData = await boardDB.get(userId);
						if (!boardData) {
							const emptyBoard = {
								todos: {},
								tags: []
							};
							res.writeHead(200, { 'Content-Type': 'application/json' });
							res.end(JSON.stringify({ success: true, board: emptyBoard }));
							return;
						}

						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ success: true, board: boardData }));
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ error: 'Invalid JSON' }));
						return;
					}
				}
			}
			break;
		default:
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not found');
			break;
	}
}