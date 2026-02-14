<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { AlertCircle, CircleAlert } from '@lucide/svelte';

	import { CircleCheckBig, Dot, Ellipsis, X } from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { applicationIconUrl, avatarUrl } from '$lib';
	type SetElement<T> = T extends Set<infer E> ? E : never;
	const permissionMap: Record<SetElement<(typeof data)['scopeBitField']>, string> = {
		identify: 'View your public profile information',
		discord: 'View your linked Discord account',
		github: 'View your linked GitHub account',
		google: 'View your linked Google account'
	};

	const params = page.url.searchParams;

	async function authorize() {
		const redirect_uri = params.get('redirect_uri') ?? '';
		const scope = params.get('scope') ?? '';
		const sig = params.get('sig') ?? '';
		// const sig = signOAuthParams(redirect_uri, scope);
		const response = await fetch('/oauth2/authorize', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: data.application?.id,
				redirect_uri,
				state: params.get('state') ?? undefined,
				scope,
				sig
			})
		});
		const json = await response.json();

		if (json.error) {
			data.error = json.error;
			return;
		}
		try {
			await goto(json.redirect);
		} catch {
			window.location = json.redirect;
		}
	}

	function getLinkUrl(provider: string): string {
		const currentUrl = page.url.toString();
		return `/login/provider/${provider}/authenticate?intent=link&redirectTo=${encodeURIComponent(currentUrl)}`;
	}

	function getUnlinkedScopes(): string[] {
		if (!data.scopeBitField || !data.linkedProviders) return [];
		return Array.from(data.scopeBitField).filter(
			(scope) => scope !== 'identify' && !data.linkedProviders!.includes(scope)
		) as string[];
	}

	function joinWithAnd(items: string[]) {
		if (items.length === 0) return '';
		if (items.length === 1) return items[0];
		return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
	}

	function capitalize(str: string) {
		return str.charAt(0).toUpperCase() + str.slice(1);
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
						<Avatar.Image
							src={avatarUrl(data.user?.id ?? '', data.user?.avatarHash)}
							alt="@evilrabbit"
						/>
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
					<p>{data.application?.name} wants to access your Tally Account</p>
					<p class="text-sm">
						<span class="opacity-30">Signed in as</span>
						<span class="opacity-50">{data.user?.username}</span>
					</p>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-4">
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

					{#if getUnlinkedScopes().length > 0}
						<div
							class="flex flex-col gap-3 rounded-lg border border-amber-600 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950"
						>
							<div class="flex flex-row items-start gap-3">
								<CircleAlert
									class="mt-0.5 size-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
								/>
								<div class="flex flex-col gap-2">
									<p class="text-sm font-medium text-amber-900 dark:text-amber-100">
										{getUnlinkedScopes().length === 1 ? 'Link your account' : 'Link your accounts'}
									</p>
									<p class="text-xs text-amber-800 dark:text-amber-200">
										This app is requesting access to {joinWithAnd(getUnlinkedScopes().map(capitalize))}, but you haven't linked {getUnlinkedScopes().length === 1
											? 'that account'
											: 'these accounts'} yet.
									</p>
									<div class="mt-2 flex flex-row flex-wrap gap-2">
										{#each getUnlinkedScopes() as provider}
											<Button
												size="sm"
												variant="outline"
												href={getLinkUrl(provider)}
												class="text-xs"
											>
												Link {provider.charAt(0).toUpperCase() + provider.slice(1)}
											</Button>
										{/each}
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</Card.Content>
			<Card.Footer class="w-full flex-row flex-wrap gap-2">
				<Button variant="outline" class="flex-1">Cancel</Button>
				<Button variant="default" class="flex-1" onclick={authorize} disabled={!!getUnlinkedScopes().length}>Authorize</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>
