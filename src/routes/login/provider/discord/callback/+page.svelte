<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import { Button } from '$lib/components/ui/button';
	import { avatarUrl, getUsernameRegex, usernameRegex } from '$lib';
	import * as Avatar from '$lib/components/ui/avatar';
	import { CheckIcon, CircleAlert, Ellipsis, XIcon } from '@lucide/svelte';
	import { fly, scale, slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { range, s } from '@thetally/toolbox';
	import { onMount } from 'svelte';
	import UsernameChecklist from '$lib/components/UsernameChecklist.svelte';
	console.log('Callback data:', data);
	if (data.action === 'login_success') {
		onMount(() => {
			goto(data.redirectTo ?? '/@me').catch(() => goto('/@me'));
		});
	}

	// stupdui iddiot warning go away !
	// svelte-ignore state_referenced_locally
	const { action, username, creationReferralCode, redirectTo } = $state.snapshot(data);

	let user = $state(username ?? '');
	// let error = $state('');
	let loading = $state(false);
	let checkingUsername = $state(false);
	let usernameTaken = $state(false);
	let interacted = $state(true);
	let wantsToCreate = $state(action !== 'prompt_create_account');

	// type RequirementState = 'met' | 'unmet' | 'checking' | 'error';

	// type Requirement = {
	// 	text: string;
	// 	fn: () => Promise<RequirementState> | RequirementState;
	// };

	// const requirements: Requirement[] = [
	// 	{
	// 		text: 'Must exist',
	// 		fn: () => (user.length >= 1 ? 'met' : 'unmet')
	// 	},
	// 	{
	// 		text: 'No more than 32 characters',
	// 		fn: () => (user.length <= 32 ? 'met' : 'unmet')
	// 	},
	// 	{
	// 		text: 'Only letters, numbers, underscores, hyphens, and periods',
	// 		fn: () => (getUsernameRegex({ lengthRequirements: false }).test(user) ? 'met' : 'unmet')
	// 	},
	// 	// // {
	// 	// // 	text: 'Cannot start or end with special characters',
	// 	// // 	fn: () => /^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(user)
	// 	// // },
	// 	// // {
	// 	// // 	text: 'No consecutive special characters',
	// 	// // 	fn: () => !/[._-]{2,}/.test(user)
	// 	// // },
	// 	// { text: 'Must contain at least one letter ', fn: () => /[a-zA-Z]/.test(user) },
	// 	{
	// 		text: 'Username is not already taken',
	// 		fn: async () => {
	// 			try {
	// 				return !(await userIsTaken(user)) ? 'met' : 'unmet';
	// 			} catch (error) {
	// 				return 'error';
	// 			}
	// 		}
	// 	}
	// ];

	// const requirementsMet = $state(
	// 	requirements.map((r) => ({
	// 		text: r.text,
	// 		met: 'unmet' as RequirementState
	// 	}))
	// );

	function acceptCreate() {
		wantsToCreate = true;
	}

	function declineCreate() {
		goto('/login');
	}

	// async function userIsTaken(username: string) {
	// 	// await new Promise((resolve) => setTimeout(resolve, 1000));
	// 	checkingUsername = true;
	// 	usernameTaken = false;
	// 	try {
	// 		const res = await fetch(`/api/accounts/username-taken/${encodeURIComponent(username)}`);
	// 		if (!res.ok) {
	// 			throw new Error('Failed to check username');
	// 		}
	// 		const data = await res.json();
	// 		error = data.taken ? 'Username is already taken' : '';
	// 		usernameTaken = data.taken;
	// 		return data.taken;
	// 	} catch (e) {
	// 		console.error(e);
	// 		checkingUsername = false;
	// 		error = 'Error checking username availability';
	// 		return false;
	// 	} finally {
	// 		checkingUsername = false;
	// 	}
	// }

	// $effect(() => {
	// 	console.log('Checking username:', user);
	// 	if (user) {
	// 		interacted = true;
	// 	}
	// 	// if (user.length >= 3) {
	// 	// 	userIsTaken(user);
	// 	//     error = "";
	// 	// } else {
	// 	// 	error = 'Username must be at least 3 characters';
	// 	// }

	// 	// if (user.length < 3) {
	// 	// 	error = 'Username must be at least 3 characters';
	// 	// 	usernameTaken = false;
	// 	// } else if (!usernameRegex.test(user)) {
	// 	// 	error = 'Username can only contain letters, numbers, underscores, hyphens, and periods';
	// 	// 	usernameTaken = false;
	// 	// } else {
	// 	// 	error = '';
	// 	// 	userIsTaken(user);
	// 	// }
	// 	const currentCheckId = ++checkId;
	// 	Promise.all(
	// 		requirementsMet.map(async (req, index) => {
	// 			try {
	// 				const mabyePromise = requirements[index].fn();
	// 				if (mabyePromise instanceof Promise) req.met = 'checking';
	// 				const result = await mabyePromise;
	// 				if (currentCheckId !== checkId) return;
	// 				req.met = result;
	// 			} catch (error) {
	// 				if (currentCheckId !== checkId) return;
	// 				req.met = 'error';
	// 			}
	// 		})
	// 	);
	// });

	// const valid = $derived(requirementsMet.every((req) => req.met === 'met'));

	let valid = $state(false);

	async function create() {
		loading = true;
		const createres = await fetch('/api/accounts/create/provider/discord?login=true', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username: user,
				referralCode: creationReferralCode
			})
		});
		const createdata = await createres.json();
		if (createdata.success) {
			loading = false;
			setTimeout(() => {
				goto(redirectTo ?? '/@me').catch(() => goto('/@me'));
			}, s(1).toMs());
		} else {
			// error = createdata.error;
			loading = false;
			return;
		}
	}
</script>

<svelte:head>
	{#if action === 'link_success'}
		<title>Account linked successfully</title>
	{:else if action === 'prompt_create_account'}
		<title>Create an account</title>
	{:else}
		<title>Create an account</title>
	{/if}
</svelte:head>

<div class="flex h-screen w-screen flex-col items-center justify-center">
	{#if action === 'create_account' || action === 'prompt_create_account'}
		{#if wantsToCreate}
			<div class="flex h-full w-full items-center justify-center" transition:slide>
				<Card.Root class="mx-4 w-full max-w-156 transition-[width] sm:w-[70%]">
					<Card.Header class="flex flex-col items-center gap-2">
						<Card.Title class="text-2xl font-semibold">Create Your Account</Card.Title>
						<Card.Description class="text-center text-sm text-muted-foreground">
							Choose a username to create your account linked with your Discord account.
						</Card.Description>
						<div class="flex items-center gap-4">
							<Avatar.Root class="h-16 w-16">
								<Avatar.Image src={data.avatar} alt="User Avatar" />
								<Avatar.Fallback class="text-xl">
									{data.username ? data.username.charAt(0).toUpperCase() : 'U'}
								</Avatar.Fallback>
							</Avatar.Root>
							<span class="text-lg font-medium">
								{data.username ?? 'Unknown User'}
							</span>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-col gap-1">
							<Input
								bind:value={
									() => user,
									(v) => {
										user = v.toLowerCase();
									}
								}
								placeholder="Username"
								invalid={!valid && interacted}
							/>
							<!-- <div class="mx-4 mt-4 flex flex-col gap-2">
								{#each requirementsMet as req, index}
									<div class="flex items-center gap-0" transition:slide={{ delay: index * 200 }}>
										{#if req.met === 'met'}
											<div transition:slide={{ axis: 'x' }}>
												<CheckIcon class="h-4 w-4 text-green-500" />
											</div>
										{:else if req.met === 'checking'}
											<div transition:slide={{ axis: 'x' }}>
												<Spinner class="h-4 w-4 animate-spin text-gray-500" />
											</div>
										{:else if req.met === 'error'}
											<div transition:slide={{ axis: 'x' }}>
												<CircleAlert class="h-4 w-4 text-red-500" />
											</div>
										{:else}
											<div transition:slide={{ axis: 'x' }}>
												<XIcon class="h-4 w-4 text-red-500" />
											</div>
										{/if}
										<span class="ml-2 text-sm">{req.text}</span>
									</div>
								{/each}
							</div> -->
							<UsernameChecklist username={user} bind:valid bind:processing={checkingUsername} />
						</div>
					</Card.Content>
					<Card.Footer class="w-full flex-col flex-wrap gap-2">
						<Button
							variant="default"
							class="w-full"
							onclick={create}
							disabled={!user || !valid || loading || checkingUsername || usernameTaken}
						>
							{#if loading}
								<Spinner class="mr-2" />
							{/if}
							Create Account with Discord
						</Button>
						<!-- {JSON.stringify({ user, error, loading, checkingUsername, usernameTaken })} -->
					</Card.Footer>
				</Card.Root>
			</div>
		{:else}
			<div class="flex h-full w-full items-center justify-center" transition:slide>
				<Card.Root class="mx-4 w-full max-w-156 transition-[width] sm:w-[70%]">
					<Card.Header class="flex flex-col items-center gap-2">
						<Card.Title class="text-2xl font-semibold">No linked account</Card.Title>
						<Card.Description class="text-center text-sm text-muted-foreground">
							No account is linked to this Discord account. Would you like to create one?
						</Card.Description>
						<div class="my-2 flex items-center gap-4">
							<Avatar.Root class="h-16 w-16">
								<Avatar.Image src={data.avatar} alt="User Avatar" />
								<Avatar.Fallback class="text-xl">
									{data.username ? data.username.charAt(0).toUpperCase() : 'U'}
								</Avatar.Fallback>
							</Avatar.Root>
							<span class="text-lg font-medium">
								{data.username ?? 'Unknown User'}
							</span>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="flex gap-2">
							<Button variant="default" class="flex-1" onclick={acceptCreate}>Yes</Button>
							<Button variant="outline" class="flex-1" onclick={declineCreate}>No</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}
	{:else if action === 'link_success'}
		<div class="flex h-full w-full items-center justify-center" transition:slide>
			<Card.Root class="mx-4 w-full max-w-156 transition-[width] sm:w-[70%]">
				<Card.Header class="flex flex-col items-center gap-2">
					<Card.Title class="text-2xl font-semibold">Account Linked Successfully</Card.Title>
					<Card.Description class="text-center text-sm text-muted-foreground">
						Your Discord account has been linked to this account.
					</Card.Description>
					<div class="my-2 flex items-center gap-4">
						<div class="flex flex-col items-center gap-0">
							<Avatar.Root class="h-16 w-16">
								<Avatar.Image
									src={`https://cdn.discordapp.com/avatars/${data.providerId}/${data.avatarHash}`}
									alt="Provider Avatar"
								/>
								<Avatar.Fallback class="text-xl">
									{data.username ? data.username.charAt(0).toUpperCase() : 'U'}
								</Avatar.Fallback>
							</Avatar.Root>

							<span class="text-sm font-medium">
								@{data.username ?? 'Unknown User'}
							</span>
						</div>
						<Ellipsis class="size-6 text-muted-foreground" />
						<!-- <Avatar.Root class="h-16 w-16">
							<Avatar.Image src={avatarUrl(data.account?.id ?? "", data.account?.avatarHash)} alt="User Avatar" />
							<Avatar.Fallback class="text-xl">
								{data.account?.displayName ?? data.account?.username}
							</Avatar.Fallback>
						</Avatar.Root>
						<span class="text-lg font-medium">
							{data.account?.username ?? 'Unknown User'}
						</span> -->
						<div class="flex flex-col items-center gap-0">
							<Avatar.Root class="h-16 w-16">
								<Avatar.Image
									src={avatarUrl(data.account?.id ?? '', data.account?.avatarHash)}
									alt="Account Avatar"
								/>
								<Avatar.Fallback class="text-xl">
									{data.username ? data.username.charAt(0).toUpperCase() : 'U'}
								</Avatar.Fallback>
							</Avatar.Root>

							<span class="text-sm font-medium">
								@{data.account?.username ?? 'Unknown User'}
							</span>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex gap-2">
						<Button variant="default" class="flex-1" onclick={() => goto(redirectTo ?? '/@me')}>
							Continue
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{:else}{/if}
</div>
