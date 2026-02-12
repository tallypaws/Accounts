<script lang="ts">
	import { getUsernameRegex } from '$lib';
	import { CheckIcon, CircleAlert, XIcon } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { Spinner } from './ui/spinner';

	let {
		username,
		valid = $bindable(false),
		processing = $bindable(false)
	}: {
		username: string;
		valid: boolean;
		processing: boolean;
	} = $props();

	type RequirementState = 'met' | 'unmet' | 'checking' | 'error';

	type Requirement = {
		text: string;
		fn: () => Promise<RequirementState> | RequirementState;
	};

	const requirements: Requirement[] = [
		{
			text: 'Must exist',
			fn: () => (username.length >= 1 ? 'met' : 'unmet')
		},
		{
			text: 'No more than 32 characters',
			fn: () => (username.length <= 32 ? 'met' : 'unmet')
		},
		{
			text: 'Only letters, numbers, underscores, hyphens, and periods',
			fn: () => (getUsernameRegex({ lengthRequirements: false }).test(username) ? 'met' : 'unmet')
		},
		// // {
		// // 	text: 'Cannot start or end with special characters',
		// // 	fn: () => /^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(user)
		// // },
		// // {
		// // 	text: 'No consecutive special characters',
		// // 	fn: () => !/[._-]{2,}/.test(user)
		// // },
		// { text: 'Must contain at least one letter ', fn: () => /[a-zA-Z]/.test(user) },
		{
			text: 'Username is not already taken',
			fn: async () => {
				try {
					return !(await userIsTaken(username)) ? 'met' : 'unmet';
				} catch (error) {
					return 'error';
				}
			}
		}
	];

	const requirementsMet = $state(
		requirements.map((r) => ({
			text: r.text,
			met: 'unmet' as RequirementState
		}))
	);

	let checkingUsername = $state(false);
	let usernameTaken = $state(false);
	let error = $state('');
	let interacted = $state(false);
	let checkId = 0;

	async function userIsTaken(username: string) {
		// await new Promise((resolve) => setTimeout(resolve, 1000));
		checkingUsername = true;
		usernameTaken = false;
		try {
			const res = await fetch(`/api/accounts/username-taken/${encodeURIComponent(username)}`);
			if (!res.ok) {
				throw new Error('Failed to check username');
			}
			const data = await res.json();
			error = data.taken ? 'Username is already taken' : '';
			usernameTaken = data.taken;
			return data.taken;
		} catch (e) {
			console.error(e);
			checkingUsername = false;
			error = 'Error checking username availability';
			return false;
		} finally {
			checkingUsername = false;
		}
	}

	$effect(() => {
		console.log('Checking username:', username);
		if (username) {
			interacted = true;
		}
		// if (user.length >= 3) {
		// 	userIsTaken(user);
		//     error = "";
		// } else {
		// 	error = 'Username must be at least 3 characters';
		// }

		// if (user.length < 3) {
		// 	error = 'Username must be at least 3 characters';
		// 	usernameTaken = false;
		// } else if (!usernameRegex.test(user)) {
		// 	error = 'Username can only contain letters, numbers, underscores, hyphens, and periods';
		// 	usernameTaken = false;
		// } else {
		// 	error = '';
		// 	userIsTaken(user);
		// }
		const currentCheckId = ++checkId;
		processing = true;
		Promise.all(
			requirementsMet.map(async (req, index) => {
				try {
					const mabyePromise = requirements[index].fn();
					if (mabyePromise instanceof Promise) req.met = 'checking';
					const result = await mabyePromise;
					if (currentCheckId !== checkId) return;
					req.met = result;
				} catch (error) {
					if (currentCheckId !== checkId) return;
					req.met = 'error';
				}
			})
		);
		processing = false;
	});

  const isValid = $derived(requirementsMet.every((r) => r.met === 'met'));

  $effect(() => {
    valid = isValid;
  });
</script>

<div class="mx-4 mt-4 flex flex-col gap-2">
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
</div>
