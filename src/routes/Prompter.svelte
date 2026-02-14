<script lang="ts">
	import Dialog from '$lib/components/ui/dialog';
	import { activePrompt, rejectPrompt, promptOpen, deletePrompt } from './prompting';
	import ChangeUsername from './prompts/ChangeUsername.svelte';
	import Confirmation from './prompts/Confirmation.svelte';
	import TOTPOTP from './prompts/TOTPOTP.svelte';
</script>

{#if $activePrompt}
	{@const prompt = $activePrompt as any}

	{#key prompt}
		<Dialog.Root
			bind:open={$promptOpen}
			onOpenChangeComplete={(open) => {
				console.log('open change complete', open);
				if (!open) deletePrompt(prompt.id);
			}}
		>
			<Dialog.Content class="flex w-[90vw] flex-col sm:w-[70%] sm:max-w-184">
				{#if prompt.type === 'TOTPOTP'}
					<TOTPOTP {prompt} />
				{:else if prompt.type === 'confirmation'}
					<Confirmation {prompt} />
				{:else if prompt.type === 'changeUsername'}
					<ChangeUsername {prompt} />
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
