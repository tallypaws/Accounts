<script lang="ts">
	import { type PromptInstance, resolvePrompt } from '../prompting';
	import * as InputOTP from '$lib/components/ui/input-otp/index.js';
	import { Button } from '$lib/components/ui/button';

	const { prompt }: { prompt: PromptInstance<"TOTPOTP"> } = $props();

	let code = $state('');
</script>

<div class="flex w-full flex-col items-center gap-4">
	<h2 class="mb-0 text-lg font-semibold">Two-Factor Authentication</h2>
	<p class="text-center text-sm text-muted-foreground">
		Enter the 6-digit code from your authenticator app.
	</p>
	<InputOTP.Root maxlength={6} bind:value={code}>
		{#snippet children({ cells })}
			<InputOTP.Group>
				{#each cells.slice(0, 3) as cell (cell)}
					<InputOTP.Slot {cell} />
				{/each}
			</InputOTP.Group>
			<InputOTP.Separator />
			<InputOTP.Group>
				{#each cells.slice(3, 6) as cell (cell)}
					<InputOTP.Slot {cell} />
				{/each}
			</InputOTP.Group>
		{/snippet}
	</InputOTP.Root>

	<Button onclick={() => resolvePrompt(prompt.id, { secret: code })} disabled={code.length !== 6}>
		Submit
	</Button>
</div>
<!-- <button
	on:click={() =>
		resolvePrompt(prompt.id, {
			secret: code
		})}
>
	Submit
</button> -->
