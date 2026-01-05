<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	> & {
		// label?: string;
		charCount?:
			| false
			| {
					position: 'left' | 'right';
					onlyOnFullOrNear?: boolean;
					onlyOnFocus?: boolean;
			  };
		containerClass?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		maxlength,
		containerClass,
		// label,
		'data-slot': dataSlot = 'input',
		charCount,

		...restProps
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 pt-1.5 text-sm font-medium shadow-xs ring-offset-background transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
			'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
			'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
			className
		)}
		type="file"
		bind:files
		bind:value
		{maxlength}
		{...restProps}
	/>
{:else}
	<!-- <div class="relative"> -->
	<div class={cn('group relative', containerClass)}>
		<input
			bind:this={ref}
			data-slot={dataSlot}
			class={cn(
				'peer flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
				'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
				'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
				className
			)}
			{type}
			bind:value
			placeholder=" "
			{maxlength}
			{...restProps}
		/>
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
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<!-- </div> -->
{/if}
