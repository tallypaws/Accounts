<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import { X } from '@lucide/svelte';

	let { data }: PageProps = $props();
	let user = $state('');
	let passwd = $state('');
	console.log(page.url.searchParams);
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
</script>

<!-- <h1>login</h1>
<input type="text" bind:value={user} />
<input type="text" bind:value={passwd} />
<button onclick={login} disabled={!user || !passwd}>Login</button> -->

<div class="flex h-screen w-screen items-center justify-center">
	<Card.Root class=" w-[70%] max-w-124">
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
				<h1>Login to your account</h1>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-2">
					{#if error}
						<p class="text-destructive">{error}</p>
					{/if}
					<Input bind:value={user} oninput={() => (error = '')} placeholder="Username" />
					<Input
						bind:value={passwd}
						oninput={() => (error = '')}
						placeholder="Password"
						type="password"
					/>
				</div>
			</Card.Content>
			<Card.Footer class="w-full flex-row flex-wrap gap-2">
				<Button
					variant="default"
					class="flex-1"
					onclick={login}
					disabled={!user || !passwd || !!error || loading}
				>
					{#if loading}
						<Spinner class="mr-2" />
					{/if}
					Login
				</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>
