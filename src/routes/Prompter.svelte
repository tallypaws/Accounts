<script lang="ts">
	import Dialog from '$lib/components/ui/dialog';
	import { activePrompts, rejectPrompt } from './prompting';
	import Confirmation from './prompts/Confirmation.svelte';
	import TOTPOTP from './prompts/TOTPOTP.svelte';
</script>

{#if $activePrompts.length > 0}
	{@const prompt = $activePrompts[0] as any}

	{#key prompt}
		<Dialog.Root
			bind:open={
				() => true,
				(v) => {
					if (!v) rejectPrompt(prompt.id);
				}
			}
		>
			<Dialog.Content class="flex w-[90vw] sm:w-[70%] sm:max-w-184">
				{#if prompt.type === 'TOTPOTP'}
					<TOTPOTP {prompt} />
				{:else if prompt.type === 'confirmation'}
					<Confirmation {prompt} />
				{:else}
					<div class="flex w-full flex-col items-center gap-4">
						<h2 class="mb-0 text-lg font-semibold">Unknown Prompt</h2>
						<p class="text-center text-sm text-muted-foreground">
							The prompt type <code>{prompt.type}</code> is not recognized.
						</p>
					</div>
				{/if}
			</Dialog.Content>
		</Dialog.Root>
	{/key}
{/if}
