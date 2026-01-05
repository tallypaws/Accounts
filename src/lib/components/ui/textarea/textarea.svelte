<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		maxlength,
		charCount,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> & {
		charCount?:
			| false
			| {
					position: 'left' | 'right';
					onlyOnFullOrNear?: boolean;
					onlyOnFocus?: boolean;
			  };
	} = $props();
</script>

<div class="group relative">
	<textarea
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
			className
		)}
		bind:value
		{maxlength}
		{...restProps}
	>
	</textarea>
	<!-- <div class="absolute top-1 right-2 text-sm text-muted-foreground flex flex-row items-center gap-1 bg-background hover:opacity-40">
		<span>{value?.toString().length}</span>
		<span>{maxlength}</span>
	</div> -->
	{#if maxlength && charCount !== false}
		{#if !charCount?.onlyOnFullOrNear || (value?.toString().length ?? 0) / (maxlength ?? Infinity) >= 0.8}
			<div
				class={cn(
					'pointer-events-none absolute flex transition-all',
					charCount?.position === 'right' ? 'right-0' : 'left-0',
					!charCount?.onlyOnFocus
						? 'bottom-1 group-focus-within:bottom-0 group-focus-within:translate-y-full'
						: 'opacity-0 group-focus-within:opacity-100'
				)}
			>
				<div
					class="mx-1 mt-1 flex flex-row items-center gap-1 rounded-sm bg-background px-1 text-sm text-muted-foreground"
				>
					<span
						class={cn(
							(value?.toString().length ?? 0) / (maxlength ?? Infinity) >= 0.8 && 'text-warning',
							maxlength === value?.toString().length && 'text-destructive',
							'flex flex-row items-center gap-1'
						)}
					>
						<span>{value?.toString().length}</span>
						<span>/</span>
						<span>{maxlength}</span>
					</span>
				</div>
			</div>
		{/if}
	{/if}
</div>
