<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar/index.js';

	import { CircleCheckBig, Dot, Ellipsis, X } from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { applicationIconUrl, avatarUrl } from '$lib';
	type SetElement<T> = T extends Set<infer E> ? E : never;
	const permissionMap: Record<SetElement<(typeof data)['scopeBitField']>, string> = {
		identify: 'View your public profile information',
		discord: 'View your linked discord account'
	};

	const params = page.url.searchParams;

	async function authorize() {
		const response = await fetch('/oauth2/authorize', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: data.application?.id,
				redirect_uri: params.get('redirect_uri'),
				state: params.get('state') ?? undefined,
				scope: params.get('scope')
			})
		});
		const json = await response.json();

		if (json.error) {
			//handle

			data.error = json.error;
			return;
		}
		try {
			await goto(json.redirect);
		} catch {
			window.location = json.redirect;
		}	
	}
</script>

<div class="flex h-screen w-screen items-center justify-center">
	<Card.Root class=" w-[70%] max-w-124">
		{#if data.error}
			<Card.Header class="flex flex-col items-center gap-2">
				<X class="size-20 text-destructive" />
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-2">
					<p class="text-center">{data.error}</p>
				</div>
			</Card.Content>
		{:else}
			<Card.Header class="flex flex-col items-center gap-2">
				<div class="flex flex-row items-center gap-5">
					<Avatar.Root class="size-20 rounded-full">
						<Avatar.Image src={avatarUrl(data.user?.id, data.user?.avatarHash)} alt="@evilrabbit" />
						<Avatar.Fallback></Avatar.Fallback>
					</Avatar.Root>
					<Ellipsis class="size-6 text-muted-foreground" />
					<Avatar.Root class="size-20 rounded-full">
						<Avatar.Image
							src={applicationIconUrl(data.application?.id ?? '', data.application?.iconHash)}
							alt="@evilrabbit"
						/>
						<Avatar.Fallback></Avatar.Fallback>
					</Avatar.Root>
				</div>
				<div class="flex flex-col items-center justify-center">
					<p>{data.application?.name} wants to access your Tally account</p>
					<p class="text-sm">
						<span class="opacity-30">Signed in as</span>
						<span class="opacity-50">{data.user?.username}</span>
					</p>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col rounded-lg bg-secondary p-6">
					<div class="flex flex-col gap-2">
						<p class="text-sm text-muted-foreground">{data.application?.name} will be able to:</p>
						{#each data.scopeBitField as scope}
							<p class="flex flex-row items-center text-sm">
								<Dot class="size-6" />{permissionMap[scope]}
							</p>
						{/each}
					</div>
				</div>
			</Card.Content>
			<Card.Footer class="w-full flex-row flex-wrap gap-2">
				<Button variant="outline" class="flex-1">Cancel</Button>
				<Button variant="default" class="flex-1" onclick={authorize}>Authorize</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>
