<script lang="ts">
	import { getUsernameRegex } from '$lib';
	import { CheckIcon, CircleAlert, Star, XIcon } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { Spinner } from './ui/spinner';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { buttonVariants } from './ui/button';

	let {
		password,
		valid = $bindable(false),
		processing = $bindable(false)
	}: {
		password: string;
		valid: boolean;
		processing: boolean;
	} = $props();

	// reccomended is for things that you really should have but limits are lame, if you pick a bad password thats on you
	type RequirementState = 'met' | 'unmet' | 'checking' | 'error' | 'recommended';

	type Requirement = {
		text: string;
		fn: () => Promise<RequirementState> | RequirementState;
		hidden?: boolean;
	};

	const requirements: Requirement[] = [
		{
			text: 'At least 6 characters',
			fn: () => (password.length >= 6 ? 'met' : 'unmet')
		},
		{
			text: 'At least 8 characters',
			fn: () => (password.length >= 8 ? 'met' : 'recommended')
		},
		{
			text: 'At most 128 characters',
			fn: () => (password.length <= 128 ? 'met' : 'unmet'),
			// only show if fail
			hidden: true
		},
		{
			text: 'Contains uppercase letter',
			fn: () => (/[A-Z]/.test(password) ? 'met' : 'recommended')
		},
		{
			text: 'Contains lowercase letter',
			fn: () => (/[a-z]/.test(password) ? 'met' : 'recommended')
		},
		{
			text: 'Contains number',
			fn: () => (/\d/.test(password) ? 'met' : 'recommended')
		},
		{
			text: 'Contains special character',
			fn: () => (/[@$!%*?&]/.test(password) ? 'met' : 'recommended')
		}
	];

	const requirementsMet = $state(
		requirements.map((r) => ({
			text: r.text,
			met: r.hidden ? ('hidden' as RequirementState) : ('unmet' as RequirementState),
			hidden: r.hidden ?? false
		}))
	);

	let checkingUsername = $state(false);
	let usernameTaken = $state(false);
	let error = $state('');
	let interacted = $state(false);
	let checkId = 0;



	$effect(() => {
		console.log('Checking password:', password);
		if (password) {
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

	const validList = ['met', 'recommended'];

	const isValid = $derived(requirementsMet.every((r) => validList.includes(r.met)));

	$effect(() => {
		valid = isValid;
	});

	const hiddenAllowList = ['recommended', 'unmet'];
</script>

<div class="mx-4 mt-2 flex flex-col">
	{#each requirementsMet as req, index}
		{#if !(req.hidden && !hiddenAllowList.includes(req.met))}
			<div class="mt-2 flex max-h-5! items-center gap-0 first:mt-0" transition:slide>
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
				{:else if req.met === 'recommended'}
					<div transition:slide={{ axis: 'x' }}>
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger class=""><Star class="h-4 w-4 text-yellow-500" /></Tooltip.Trigger>
								<Tooltip.Content>
									<p class="text-[1.2em] font-semibold">Recommended</p>
									<p>This item is recommended, but not required.</p>
									<p>
										I highly encourage you to follow this recommendation for better security, but it
										is ultimately your choice.
									</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					</div>
				{:else}
					<div transition:slide={{ axis: 'x' }}>
						<XIcon class="h-4 w-4 text-red-500" />
					</div>
				{/if}
				<span class="ml-2 text-sm">{req.text}</span>
			</div>
		{/if}
	{/each}
</div>
