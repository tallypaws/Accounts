<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const apps: ((typeof data.apps)[number] & {
		secret?: string;
	})[] = $state(data.apps);
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { applicationIconUrl, avatarUrl, defaultIconUrl } from '$lib';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Clipboard, Key, Minus, Pencil, Plus, Trash, Upload } from '@lucide/svelte';
	import { GetDrawerDialog } from '$lib/components/ui/drawer-dialog';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import { cn, idToHue } from '$lib/utils';

	let changed = $state(false);
	let loading = $state(false);
	let tempUrl = $state('');
	let deleteAvatar = $state(false);

	let fileInput: HTMLInputElement;

	let inputValue: any = $state(null);
	function markAvatarDelete() {
		changed = true;
		deleteAvatar = true;
		tempUrl = '';
		inputValue = null;
	}
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

	let windowWidth = $state(0);

	const isMobile = $derived(windowWidth <= 640);

	const DrawerDialog = $derived(GetDrawerDialog(false));

	let editAppOpen = $state(false);
	let newAppOpen = $state(false);
	let selectedApp: (typeof data)['apps'][number] = $state(null as any);

	let newApp: (typeof data)['apps'][number] = $state({
		description: '',
		iconHash: '',
		id: '',
		name: '',
		redirectUris: []
	});

	function resetNewApp() {
		newApp = {
			description: '',
			iconHash: '',
			id: '',
			name: '',
			redirectUris: []
		};
	}

	let saving = $state(false);

	async function copy(text: string, display?: string) {
		await navigator.clipboard.writeText(text);
		toast.success(`Copied ${display ?? text}`);
	}
</script>

<svelte:window bind:innerWidth={windowWidth} />

<!-- <h1>login</h1>
<input type="text" bind:value={user} />
<input type="text" bind:value={passwd} />
<button onclick={login} disabled={!user || !passwd}>Login</button> -->
<div class="flex min-h-screen w-screen items-center justify-center">
	<Card.Root class=" relative my-6 w-[70%] max-w-180">
		<Card.Content>
			<div class="-mt-2 -ml-2 flex flex-row items-center gap-2">
				<Avatar.Root class="h-8 w-8 ">
					<Avatar.Image src={avatarUrl(data.account.id, data.account.avatarHash)} />
					<Avatar.Fallback>{data.account.displayName ?? data.account.username}</Avatar.Fallback>
				</Avatar.Root>
				<p>{data.account.displayName ?? `@${data.account.username}`}'s apps</p>
			</div>
			<div class="mt-4 flex flex-col gap-0">
				{#each apps as app, i (app.id)}
					<div transition:slide>
						<Card.Root
							class="group relative my-1 p-4 opacity-95 transition-opacity hover:opacity-100"
						>
							<div class="absolute top-2 right-2 flex">
								<Button
									size="icon"
									variant="invisible"
									onclick={() => {
										selectedApp = $state.snapshot(app);
										editAppOpen = true;
									}}
									class="opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Pencil />
								</Button>
								<Button
									size="icon"
									variant="invisible"
									onclick={() => {
										toast.info('HOLD IT');
									}}
									onHeld={{
										duration: 1000,
										fn: async () => {
											const res = await fetch('/apps/secret', {
												method: 'POST',
												headers: {
													'Content-Type': 'application/json'
												},
												body: JSON.stringify({
													id: app.id
												})
											});
											if (!res.ok) {
												toast.error('Failed to generate new secret for ' + app.name);
												return;
											}
											const body = await res.json();
											app.secret = body.secret;
										}
									}}
									class="opacity-0 transition-opacity group-hover:opacity-100"
								>
									{#snippet dynamic({ heldMs, heldProgress, holding })}
										<div
											style="
									transform:
									translateX({(Math.random() - 0.5) * heldProgress * 5}px)
									translateY({(Math.random() - 0.5) * heldProgress * 5}px);
									transition: transform 0s;"
											class="relative"
										>
											<Key class={cn('text-foreground')} />
											<Key
												class="absolute top-0 left-0 z-10 text-destructive"
												style="
											opacity: {Math.floor((heldProgress + 0.5) * 100 * +holding)}%;
											"
											/>
										</div>
									{/snippet}
								</Button>
								<Button
									size="icon"
									variant="invisible"
									onclick={() => {
										toast.info('HOLD IT');
									}}
									onHeld={{
										duration: 1000,
										fn: async () => {
											const oldState = $state.snapshot(apps);
											apps.splice(i, 1);

											const res = await fetch('/apps', {
												method: 'DELETE',
												headers: {
													'Content-Type': 'application/json'
												},
												body: JSON.stringify({
													id: app.id
												})
											});
											if (!res.ok) {
												apps.splice(0, apps.length, ...oldState);
												toast.error('Failed to delete ' + app.name);
												return;
											}
										}
									}}
									class="opacity-0 transition-opacity group-hover:opacity-100"
								>
									{#snippet dynamic({ heldMs, heldProgress, holding })}
										<div
											style="
										transform:
										translateX({(Math.random() - 0.5) * heldProgress * 5}px)
										translateY({(Math.random() - 0.5) * heldProgress * 5}px);
										transition: transform 0s;"
											class="relative"
										>
											<Trash class={cn('text-foreground')} />
											<Trash
												class="absolute top-0 left-0 z-10 text-destructive"
												style="
												opacity: {Math.floor((heldProgress + 0.5) * 100 * +holding)}%;
												"
											/>
										</div>
									{/snippet}
								</Button>
							</div>
							<Card.Content class="px-0">
								<h3 class="flex items-center gap-2 text-lg font-bold -mt-1 mb-1">
									<Avatar.Root class="h-8 w-8">
										<Avatar.Image src={applicationIconUrl(app.id, app.iconHash)} />
										<Avatar.Fallback
											>{data.account.displayName ?? data.account.username}</Avatar.Fallback
										>
									</Avatar.Root>
									<div class="flex flex-col">
										{#key app.name}
											<span transition:slide>{app.name}</span>
										{/key}
									</div>
								</h3>
								{#key app.description}
									<p class="text-sm text-muted-foreground" transition:slide>{app.description}</p>
								{/key}
								<div class="mt-2 flex flex-col items-start gap-4 text-xs text-muted-foreground">
									<div>
										<Button
											variant="invisible"
											size="xs"
											onclick={async () => {
												await copy(app.id);
											}}
										>
											Client ID: {app.id}
										</Button>
										{#if app.secret}
											<div transition:slide>
												<Button
													variant="invisible"
													size="xs"
													onclick={async () => {
														await copy(app.secret!, 'Client Secret');
													}}
												>
													Client Secret: <span
														class="flex flex-col text-left transition-all hover:blur-none"
													>
														{#key app.secret}
															<span transition:slide>{app.secret}</span>
														{/key}
													</span>
												</Button>
											</div>
										{/if}
									</div>
									<!-- redirect uris -->
									<p>Redirect URIs:</p>
									<div>
										{#key app.redirectUris}
											<div class="-mt-4 rounded-xs border-l-3 border-primary" transition:slide>
												{#if app.redirectUris.length}
													{#each app.redirectUris as uri}
														<Button
															variant="invisible"
															size="xs"
															class="ml-2"
															onclick={async () => {
																await copy(uri);
															}}
														>
															{uri}
														</Button>
													{/each}
												{:else}
													<span class="ml-2 text-base text-muted-foreground"><i>None</i></span>
												{/if}
											</div>
										{/key}
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					</div>
				{/each}
				<Button
					size="sm"
					variant="outline"
					class="w-full rounded-lg"
					onclick={() => {
						resetNewApp();
						newAppOpen = true;
					}}
				>
					<Plus /> New Application
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<DrawerDialog.Root
	bind:open={editAppOpen}
	onOpenChangeComplete={(open) => {
		if (!open) {
			changed = false;
			deleteAvatar = false;
			tempUrl = '';
			inputValue = null;
		}
	}}
>
	<DrawerDialog.Content
		style="
			max-height: calc(100vh - 5rem);
		"
	>
		<DrawerDialog.Header>
			<DrawerDialog.Title>Edit {selectedApp.name}</DrawerDialog.Title>
		</DrawerDialog.Header>
		<div>
			<div class="estrogen flex flex-col gap-2 overflow-auto">
				<div class="relative h-24 w-24">
					<Avatar.Root class="h-24 w-24">
						<Avatar.Image
							src={deleteAvatar
								? defaultIconUrl
								: tempUrl || applicationIconUrl(selectedApp.id, selectedApp.iconHash)}
							style={deleteAvatar ? `filter: hue-rotate(${idToHue(selectedApp.id)}deg);` : ''}
							class="object-cover"
						/>
						<Avatar.Fallback></Avatar.Fallback>
					</Avatar.Root>
					<!--  items-center justify-center -->
					<div
						class="flex-rowrounded-full absolute top-0 left-0 flex h-full w-full bg-background/80 opacity-0 transition-all hover:opacity-100"
					>
						<button
							onclick={() => {
								fileInput.click();
							}}
							class="flex h-full flex-1 items-center justify-center opacity-40 transition-all hover:opacity-100"
						>
							<Upload />
						</button>
						{#if (tempUrl || (selectedApp.iconHash && selectedApp.iconHash !== 'default')) && !deleteAvatar}
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
				<p><span>Name: </span> <Input bind:value={selectedApp.name} /></p>
				<p>
					<span>Description: </span>
					<Textarea bind:value={selectedApp.description} class="h-40" />
				</p>
				<div>
					<p><span>Redirect Uris: </span></p>
					<div class="flex flex-col rounded-xs border-l-3 border-primary pl-2">
						{#each selectedApp.redirectUris as uri, i}
							<div class="relative mb-2" transition:slide={{ duration: 500 }}>
								<Input
									bind:value={selectedApp.redirectUris[i]}
									placeholder="https://example.com/auth/callback"
								/>
								<Button
									size="icon"
									variant="ghost"
									class="absolute top-0 right-0"
									onclick={() => {
										selectedApp.redirectUris.splice(i, 1);
									}}
								>
									<Minus />
								</Button>
							</div>
						{/each}
						<Button
							size="sm"
							variant="outline"
							onclick={() => {
								selectedApp.redirectUris.push('');
							}}
						>
							<Plus />
						</Button>
					</div>
				</div>
			</div>
			<Button
				class="mt-4 w-full"
				disabled={saving}
				onclick={async () => {
					saving = true;
					const index = apps.findIndex((app) => app.id === selectedApp.id);
					let newHash: undefined | string = undefined;
					if (index === -1) return;

					if (inputValue) {
						const response = await fetch('/apps/icon/' + selectedApp.id, {
							method: 'POST',
							body: inputValue
						}).then((a) => a.json());
						console.log(response);
						if (response.success) {
							newHash = response.avatarHash;
							tempUrl = '';
						}
					}
					if (deleteAvatar) {
						const response = await fetch('/apps/icon/' + selectedApp.id, {
							method: 'DELETE'
						}).then((a) => a.json());
						if (response.success) {
							newHash = 'default';
							tempUrl = '';
							deleteAvatar = false;
						}
					}

					const res = await fetch('/apps', {
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							id: selectedApp.id,
							name: selectedApp.name,
							description: selectedApp.description,
							redirectUris: selectedApp.redirectUris
						})
					});
					saving = false;
					if (!res.ok) {
						toast.error(`Failed to update ${selectedApp.name}`, {});
						return;
					}
					// apps[index] = selectedApp;
					const target = apps[index];
					target.name = selectedApp.name;
					target.description = selectedApp.description;
					if (newHash) target.iconHash = newHash;
					if (
						target.redirectUris.length !== selectedApp.redirectUris.length ||
						!target.redirectUris.every((v, i) => v === selectedApp.redirectUris[i])
					)
						target.redirectUris = selectedApp.redirectUris;

					editAppOpen = false;
				}}
			>
				Save
			</Button>
		</div>
	</DrawerDialog.Content>
</DrawerDialog.Root>

<DrawerDialog.Root bind:open={newAppOpen}>
	<DrawerDialog.Content
		style="
			max-height: calc(100vh - 5rem);
		"
	>
		<DrawerDialog.Header>
			<DrawerDialog.Title>Create Application</DrawerDialog.Title>
		</DrawerDialog.Header>
		<div>
			<div class="estrogen flex flex-col gap-2 overflow-auto">
				<p><span>Name: </span> <Input bind:value={newApp.name} /></p>
				<p>
					<span>Description: </span>
					<Textarea bind:value={newApp.description} class="h-40" />
				</p>
			</div>
			<Button
				class="mt-4 w-full"
				disabled={saving}
				onclick={async () => {
					saving = true;
					newAppOpen = false;

					const res = await fetch('/apps', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							name: newApp.name,
							description: newApp.description
						})
					});
					if (!res.ok) {
						saving = false;
						newAppOpen = true;

						toast.error(`Failed to create app`, {});
						return;
					}
					const json = await res.json();
					apps.push({ ...json.app, secret: json.secret });
					saving = false;

					resetNewApp();
				}}>Save</Button
			>
		</div>
	</DrawerDialog.Content>
</DrawerDialog.Root>

<input type="file" bind:this={fileInput} accept="image/*" hidden onchange={handleFile} />
{inputValue}
