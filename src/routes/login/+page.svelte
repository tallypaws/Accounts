<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import { X } from '@lucide/svelte';
	import { SiDiscord, SiGithub, SiGoogle } from '@icons-pack/svelte-simple-icons';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();
	let user = $state('');
	let passwd = $state('');
	let error = $state('');
	let criticalError = $state('');
	let loading = $state(false);


	const redirect = page.url.searchParams.get('redirect') ?? '/';
	if (!redirect.startsWith('/')) {
		criticalError = 'Invalid redirect url';
		loading = false;
	}
	async function login() {
		loading = true;
		const res = await fetch('/api/accounts/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: user,
				password: passwd
			})
		});
		const data = await res.json();
		if (data.success) {
			const params = JSON.parse(page.url.searchParams.get('params') ?? '{}');
			if (redirect) {
				await goto(redirect + `?` + new URLSearchParams(params).toString());
			}
		} else {
			error = data.error;
		}
		loading = false;
	}

	let passwdInput: HTMLInputElement | null = $state(null);
</script>
<svelte:head>
	<title>Log in to your account</title>
</svelte:head>
<!-- <h1>login</h1>
<input type="text" bind:value={user} />
<input type="text" bind:value={passwd} />
<button onclick={login} disabled={!user || !passwd}>Login</button> -->
<div class="flex h-screen w-screen items-center justify-center">
	<Card.Root class="mx-4 w-full max-w-156 transition-[width] sm:w-[70%]">
		{#if criticalError}
			<Card.Header class="flex flex-col items-center gap-2">
				<X class="size-20 text-destructive" />
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-2">
					<p class="text-center">{criticalError}</p>
				</div>
			</Card.Content>
		{:else}
			<Card.Header class="flex flex-col items-center gap-2">
				<h1>Log in to your account</h1>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-1">
					{#if error}
						<p class="text-destructive">{error}</p>
					{/if}
					<Input
						bind:value={user}
						oninput={() => (error = '')}
						placeholder="Username"
						onkeydown={(e) => {
							if (e.key === 'Enter' && user && !error && !loading) {
								passwdInput?.focus();
							}
						}}
					/>
					<Input
						bind:ref={passwdInput}
						bind:value={passwd}
						oninput={() => (error = '')}
						placeholder="Password"
						type="password"
						onkeydown={(e) => {
							if (e.key === 'Enter' && user && passwd && !error && !loading) {
								login();
							}
						}}
					/>
				</div>
			</Card.Content>
			<Card.Footer class="w-full flex-col flex-wrap gap-2">
				<Button
					variant="default"
					class="w-full"
					onclick={login}
					disabled={!user || !passwd || !!error || loading}
				>
					{#if loading}
						<Spinner class="mr-2" />
					{/if}
					Log in
				</Button>
				<div class="mt-5 mb-1 flex w-full items-center">
					<div class="h-1 flex-1 rounded-xl bg-muted-foreground"></div>
					<span class="mx-3 bg-card text-xs text-muted-foreground"> Or continue with </span>
					<div class="h-1 flex-1 rounded-xl bg-muted-foreground"></div>
				</div>
				<div class="flex w-full justify-center gap-4">
					<Button
						variant="outline"
						size="icon"
						href={`/login/provider/discord/authenticate?redirectTo=${encodeURIComponent(redirect)}`}
					>
						<SiDiscord size={20} />
					</Button>
					<Button
						variant="outline"
						size="icon"
						href={`/login/provider/github/authenticate?redirectTo=${encodeURIComponent(redirect)}`}
					>
						<SiGithub size={20} />
					</Button>
					<Button variant="outline" size="icon" disabled>
						<SiGoogle size={20} />
					</Button>
				</div>
				<div class="text-center text-sm">
					<p class="text-muted-foreground">
						Don't have an account? <Button variant="link" class="h-auto p-0" href="/signup"
							>Sign up</Button
						>
					</p>
				</div>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>

