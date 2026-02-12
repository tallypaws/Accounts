<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	console.log('data', data);
	let account = $state($state.snapshot(data.account));
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import {
		ChevronLeft,
		Delete,
		Key,
		Minus,
		Pencil,
		Plus,
		Trash,
		Upload,
		type IconProps
	} from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { avatarUrl, defaultAvatarUrl, discordAvatarUrl } from '$lib';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';
	import { idToHue } from '$lib/utils';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Discord, GitHub, Google } from '$lib/icons';

	import { type Component } from 'svelte';
	import Dialog from '$lib/components/ui/dialog';

	let changed = $state(false);
	let loading = $state(false);
	let tempUrl = $state('');
	let deleteAvatar = $state(false);
	function initials(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase();
	}

	let fileInput: HTMLInputElement;

	let inputValue: any = $state(null);

	function handleFile(e: Event) {
		deleteAvatar = false;
		changed = true;
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		inputValue = file;
		const url = URL.createObjectURL(file);
		tempUrl = url;
	}

	const json = (a: Response) => {
		return a.json();
	};

	function markAvatarDelete() {
		changed = true;
		deleteAvatar = true;
		tempUrl = '';
		inputValue = null;
	}

	function reset() {
		changed = false;
		deleteAvatar = false;
		tempUrl = '';
		inputValue = null;
		account = $state.snapshot(data.account);
	}

	async function save() {
		if (!changed) return;
		loading = true;
		if (inputValue) {
			const response = await fetch('/api/accounts/avatar', {
				method: 'POST',
				body: inputValue
			}).then(json);
			console.log(response);
			if (response.success) {
				account.avatarHash = response.avatarHash;
				tempUrl = '';
			}
		}
		if (deleteAvatar) {
			const response = await fetch('/api/accounts/avatar', {
				method: 'DELETE'
			}).then(json);
			if (response.success) {
				account.avatarHash = 'default';
				tempUrl = '';
				deleteAvatar = false;
			}
		}
		await fetch('/api/accounts/modify', {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				displayName: account.displayName,
				bio: account.bio,
				pronouns: account.pronouns
			})
		});
		changed = false;
		loading = false;
		deleteAvatar = false;
	}

	const providers: ({ Icon: Component<IconProps, {}, ''>; name: string } & (
		| {
				connected: false;
		  }
		| {
				connected: true;
				username: string;
		  }
	))[] = [
		{
			Icon: Discord,
			name: 'Discord',
			connected: false
		},
		{ Icon: GitHub, name: 'GitHub', connected: false },
		{ Icon: Google, name: 'Google', connected: false }
	];

	import zxcvbn from '$lib/zxcvbn';
	import PasswordBar from '$lib/components/PasswordBar.svelte';
	import { promptFor } from '../../prompting';
	import { toast } from 'svelte-sonner';
	import { SiDiscord, SiGithub, SiGoogle } from '@icons-pack/svelte-simple-icons';

	async function updateIdentites() {
		const response = await fetch('/api/accounts/identities').then(json);
		data.identities = response.identities;
	}

	async function deleteIdentity(id: string) {
		const promise = new Promise(async (resolve, rej) => {
			const res = await fetch(`/api/accounts/identities/${id}`, {
				method: 'DELETE'
			});

			if (res.ok) {
				resolve(true);
			} else {
				rej(new Error('Failed to delete identity'));
			}
		});

		toast.promise(promise, {
			loading: 'Deleting identity...',
			success: 'Identity deleted',
			error: 'Failed to delete identity'
		});

		await promise;
		await updateIdentites();
	}

	let passwd = $state('');
	let newPasswd = $state('');
	const zxcvbnResult = $derived(zxcvbn(newPasswd));
	let newPasswdConfirm = $state('');
	let changingPassword = $state(false);
	async function changePassword() {
		changingPassword = true;
		try {
			const response = await fetch('/api/accounts/identities/password/change', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					password: passwd,
					newPassword: newPasswd
				})
			});

			if (!response.ok) {
				toast.error((await response.json()).error || 'Failed to change password');

				return;
			}

			const result = await response.json();

			if (result.requiresTOTP) {
				const totp = await promptFor('TOTPOTP', {});
				if (!totp) {
					toast.error('TOTP is required to change password');
					return;
				}
				const totpResponse = await fetch('/api/accounts/identities/password/change/totp', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						password: passwd,
						newPassword: newPasswd,
						totp
					})
				});
				if (!totpResponse.ok) {
					toast.error((await totpResponse.json()).error || 'Failed to change password');
					return;
				}
				toast.success('Password changed successfully');
			} else {
				toast.success('Password changed successfully');
			}
		} catch (error) {
		} finally {
			changingPassword = false;
			newPasswd = '';
			newPasswdConfirm = '';
		}
	}
</script>

<!-- <h1>login</h1>
<input type="text" bind:value={user} />
<input type="text" bind:value={passwd} />
<button onclick={login} disabled={!user || !passwd}>Login</button> -->
<!-- <div>{zxcvbnResult.score} {zxcvbnResult.guesses_log10} {newPasswd}</div> -->
<div class="flex h-screen w-screen items-center justify-center">
	<div class="flex max-h-full w-full flex-col items-center gap-2 overflow-auto py-5">
		<Card.Root class=" relative  w-[70%] max-w-180">
			{#if !data.account}
				<Card.Header class="flex flex-col items-center gap-2">
					<h2 class="text-xl font-bold">you are no account have</h2>
				</Card.Header>
			{:else}
				<!-- <Card.Header class="flex flex-col items-center gap-2">
					<h2 class="text-xl font-bold">{data.account.displayName ?? data.account.username}</h2>
				</Card.Header> -->
				<Card.Content>
					<div class="absolute top-1 left-1 flex">
						<Button class="flex-1" size="icon" variant="invisible" href="/@me"
							><ChevronLeft /></Button
						>
					</div>
					<div class="absolute right-3 bottom-3 flex">
						<Button disabled={!changed || loading} onclick={save}>
							{#if loading}
								<Spinner size="sm" />
							{/if}Save</Button
						>
						<Button class="ml-2" variant="ghost" disabled={!changed || loading} onclick={reset}
							>Reset</Button
						>
					</div>
					<div class="flex flex-row gap-2 pb-8">
						<div class="mr-4 flex flex-col items-center gap-2">
							<div class="relative h-24 w-24">
								<Avatar.Root class="h-24 w-24">
									<Avatar.Image
										src={deleteAvatar
											? defaultAvatarUrl
											: tempUrl || avatarUrl(account.id, account.avatarHash)}
										style={deleteAvatar
											? `
																 filter: hue-rotate(${idToHue(account.id)}deg);
																`
											: ''}
										class="object-cover"
									/>
									<Avatar.Fallback
										>{initials(account.displayName || account.username)}</Avatar.Fallback
									>
								</Avatar.Root>
								<!--  items-center justify-center -->
								<div
									class="absolute top-0 left-0 flex h-full w-full flex-row
															 rounded-full bg-background/80 opacity-0 transition-all hover:opacity-100"
								>
									<button
										onclick={() => {
											fileInput.click();
										}}
										class="flex h-full flex-1 items-center justify-center opacity-40 transition-all hover:opacity-100"
									>
										<Upload />
									</button>
									{#if (tempUrl || (account.avatarHash && account.avatarHash !== 'default')) && !deleteAvatar}
										<button
											onclick={() => {
												markAvatarDelete();
											}}
											class="flex h-full flex-1 items-center justify-center opacity-40 transition-all hover:text-destructive hover:opacity-100"
										>
											<Trash />
										</button>
									{/if}
								</div>
							</div>
							<p class="text-sm text-muted-foreground">@{account.username}</p>
						</div>
						<div class="flex w-full flex-col justify-center gap-2">
							<p class="flex flex-row justify-between gap-2 text-xl">
								<Input
									bind:value={account.displayName}
									containerClass="flex-2"
									placeholder="Display Name"
									oninput={() => {
										changed = true;
									}}
								/>
								<Input
									bind:value={account.pronouns}
									containerClass=" flex-1"
									placeholder="Pronouns"
									oninput={() => {
										changed = true;
									}}
									maxlength={100}
									charCount={{
										position: 'right',
										onlyOnFullOrNear: true,
										onlyOnFocus: true
									}}
								/>
							</p>
							<Textarea
								bind:value={account.bio}
								class="h-40 w-full"
								placeholder="Bio"
								oninput={() => {
									changed = true;
								}}
								maxlength={1000}
								charCount={{
									position: 'left',
									onlyOnFullOrNear: false,
									onlyOnFocus: true
								}}
							/>
						</div>
					</div>
				</Card.Content>
			{/if}
		</Card.Root>
		<Card.Root class="l relative w-[70%] max-w-180">
			<Card.Content class="flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<h1 class="text-lg font-semibold">Log In Methods</h1>
					<Dialog.Root>
						<Dialog.Trigger>
							<Button size="icon" variant="outline">
								<Plus class="size-4" />
							</Button>
						</Dialog.Trigger>
						<Dialog.Content>
							<h2 class="text-lg font-semibold">Add Log In Method</h2>
							<div class="flex flex-row items-center justify-center gap-4">
								<Button  variant="outline" size="icon">
									<Key class="size-4" />
								</Button>
								<Button variant="outline" size="icon" href="/login/provider/discord/authenticate?intent=link&redirectTo=/@me/edit">
									<SiDiscord size={20} />
								</Button>
								<Button variant="outline" size="icon" disabled>
									<SiGithub size={20} />
								</Button>
								<Button variant="outline" size="icon" disabled>
									<SiGoogle size={20} />
								</Button>
							</div>
						</Dialog.Content>
					</Dialog.Root>
				</div>
				<div class="flex flex-col gap-2">
					{#each data.identities as identity}
						<div class="group relative flex items-center justify-between rounded-lg border p-3">
							{#if identity.provider === 'discord'}
								<div class="flex items-center gap-3">
									<div class="">
										<Discord
											class="absolute top-1 left-1 size-6 rounded-sm bg-card p-0.75 text-muted-foreground"
										/>
										<img
											src={discordAvatarUrl(identity.providerId, identity.data.avatarHash)}
											alt=""
											class="size-10 rounded-full"
										/>
									</div>
									<div class="flex flex-col leading-tight">
										<span class="font-medium">
											{identity.provider.charAt(0).toUpperCase() + identity.provider.slice(1)}
										</span>
										<span class="text-sm text-muted-foreground">
											Connected as <span class="font-mono">{identity.data.username}</span>
										</span>
									</div>
								</div>
								<Button
									variant="ghost"
									class="text-destructive opacity-90 hover:opacity-100"
									size="icon"
									disabled={data.identities.length === 1}
									onclick={async () => {
										if (
											await promptFor('confirmation', {
												title: 'Are you sure?',
												description:
													"This will permanently delete this login method and you won't be able to use it to log in anymore.",
												confirmText: 'Delete',
												cancelText: 'Cancel'
											})
										) {
											await deleteIdentity(identity.id);
										}
									}}
								>
									<Minus class="size-4" />
								</Button>
							{:else if identity.provider === 'github'}
								<div class="flex items-center gap-3">
									<GitHub class="size-10 p-1 text-muted-foreground" />
								</div>
								<Button
									variant="ghost"
									class="text-destructive opacity-90 hover:opacity-100"
									size="icon"
								>
									<Minus class="size-4" />
								</Button>
							{:else if identity.provider === 'google'}
								<div class="flex items-center gap-3">
									<Google class="size-10 text-muted-foreground" />
								</div>
								<Button
									variant="ghost"
									class="text-destructive opacity-90 hover:opacity-100"
									size="icon"
								>
									<Minus class="size-4" />
								</Button>
							{:else if identity.provider === 'password'}
								<div class="flex items-center gap-3">
									<Key class="size-10 p-1 text-muted-foreground" />
									<div class="flex flex-col leading-tight">
										<span class="font-medium">
											{identity.provider.charAt(0).toUpperCase() + identity.provider.slice(1)}
										</span>
									</div>
								</div>
								<div>
									<Dialog.Root>
										<Dialog.Trigger>
											<Button
												variant="ghost"
												class="opacity-0 group-hover:opacity-40 hover:opacity-100"
												size="icon"
											>
												<Pencil class="size-4" />
											</Button>
										</Dialog.Trigger>
										<Dialog.Content>
											<h2 class="text-lg font-semibold">Change Password</h2>
											<Input type="password" placeholder="Current Password" bind:value={passwd} />
											<div class="flex flex-col gap-2">
												<PasswordBar password={newPasswd}>
													<Input
														type="password"
														placeholder="New Password"
														bind:value={newPasswd}
													/>
												</PasswordBar>
												<Input
													type="password"
													placeholder="Confirm New Password"
													invalid={newPasswd !== newPasswdConfirm}
													bind:value={newPasswdConfirm}
													invalidMessage="Passwords do not match"
												/>
											</div>
											<Button
												onclick={changePassword}
												disabled={!passwd ||
													!newPasswd ||
													newPasswd !== newPasswdConfirm ||
													changingPassword}>Change Password</Button
											>
										</Dialog.Content>
									</Dialog.Root>
									<Button
										variant="ghost"
										class="text-destructive opacity-90 hover:opacity-100"
										disabled={data.identities.length === 1}
										size="icon"
										onclick={async () => {
											if (
												await promptFor('confirmation', {
													title: 'Are you sure?',
													description:
														"This will permanently delete this login method and you won't be able to use it to log in anymore.",
													confirmText: 'Delete',
													cancelText: 'Cancel'
												})
											) {
												await deleteIdentity(identity.id);
											}
										}}
									>
										<Minus class="size-4" />
									</Button>
								</div>
							{/if}
						</div>
					{/each}
					<!-- {#each providers as { Icon, ...provider }}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex items-center gap-3">
								<Icon class="size-6 text-muted-foreground" />
								<div class="flex flex-col leading-tight">
									<span class="font-medium">
										{provider.name}
									</span>
									{#if provider.connected}
										<span class="text-sm text-muted-foreground">
											Connected
											{#if provider.username}
												as <span class="font-mono">{provider.username}</span>
											{/if}
										</span>
									{:else}
										<span class="text-sm text-muted-foreground"> Not connected </span>
									{/if}
								</div>
							</div>
							{#if provider.connected}
								<Button variant="ghost" class="text-destructive">Disconnect</Button>
							{:else}
								<Button variant="outline">Connect</Button>
							{/if}
						</div>
					{/each} -->
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<input type="file" bind:this={fileInput} accept="image/*" hidden onchange={handleFile} />