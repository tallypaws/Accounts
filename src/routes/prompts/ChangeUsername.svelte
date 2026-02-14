<script lang="ts">
	import { type PromptInstance, resolvePrompt } from '../prompting';
	import { Button } from '$lib/components/ui/button';
	import UsernameChecklist from '$lib/components/UsernameChecklist.svelte';
	import { Input } from '$lib/components/ui/input';

	const { prompt }: { prompt: PromptInstance<'changeUsername'> } = $props();


    let usernameValid = $state(false);
    let usernameProcessing = $state(false);
    let newUsername = $state(prompt.params.currentUsername);
</script>

<div class="flex w-full flex-col items-center gap-4">
	<h2 class="text-lg font-semibold">Change Username</h2>
	<div class="flex flex-col gap-2 w-full">
		<Input placeholder="New Username" bind:value={newUsername} class="w-full" />
        <UsernameChecklist
            username={newUsername}
            bind:valid={usernameValid}
            bind:processing={usernameProcessing}
        />
	</div>
	<Button disabled={!usernameValid || usernameProcessing} onclick={() => resolvePrompt(prompt.id, { username: newUsername })} class="w-full">Change Username</Button>
</div>
<!-- <button
	on:click={() =>
		resolvePrompt(prompt.id, {
			secret: code
		})}
>
	Submit
</button> -->
