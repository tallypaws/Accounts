<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import { LogOut, Pencil, Settings } from '@lucide/svelte';
	import { avatarUrl } from '$lib';
	import { d } from 'surrealdb';
</script>

<!-- <h1>login</h1>
<input type="text" bind:value={user} />
<input type="text" bind:value={passwd} />
<button onclick={login} disabled={!user || !passwd}>Login</button> -->
<svelte:head>
	<title>Account</title>
</svelte:head>

<div class="flex h-screen w-screen items-center justify-center">
	<Card.Root class=" relative w-[70%] max-w-180">
		{#if !data.account}
			<Card.Header class="flex flex-col items-center gap-2">
				<h2 class="text-xl font-bold">you are no account have</h2>
			</Card.Header>
		{:else}
			<!-- <Card.Header class="flex flex-col items-center gap-2">

				<h2 class="text-xl font-bold">{data.account.displayName ?? data.account.username}</h2>
			</Card.Header> -->
			<Card.Content>
				<div class="absolute top-1 right-1 flex">
					<Button class="flex-1" size="icon" variant="invisible" href="/@me/edit">
						<Pencil />
					</Button>
					<Button class="flex-1" size="icon" variant="invisible" href="/logout">
						<LogOut />
					</Button>
				</div>
				<div class="flex flex-row gap-2">
					<Avatar.Root class="mr-4 h-24 w-24">
						<Avatar.Image src={avatarUrl(data.account.id, data.account.avatarHash)} />
						<Avatar.Fallback>{data.account.displayName ?? data.account.username}</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex w-full flex-col justify-center">
						<h2 class="text-xl font-bold">
							{data.account.displayName ?? `@${data.account.username}`}
						</h2>
						{#if data.account.displayName}
							<p class="text-sm text-muted-foreground">
								@{data.account.username}
								{#if data.account.pronouns}
									<span>-</span>
									<span class="text-muted-foreground">{data.account.pronouns}</span>
								{/if}
							</p>
						{/if}

						<div
							class="mt-2 max-h-60 overflow-scroll text-base whitespace-pre-wrap text-foreground/80"
						>
							{#if data.account.bio}
								{data.account.bio}
							{:else}
								<span class="text-muted-foreground">No bio set.</span>
							{/if}
						</div>
					</div>
				</div></Card.Content
			>
		{/if}
	</Card.Root>
</div>
