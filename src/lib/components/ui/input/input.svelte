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
		invalid?: boolean;
		invalidMessage?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		maxlength,
		invalid,
		invalidMessage,
		containerClass,
		// label,
		'data-slot': dataSlot = 'input',
		charCount,

		...restProps
	}: Props = $props();

	const errorId =
		typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
			? crypto.randomUUID()
			: `input-error-${Math.floor(Math.random() * 1_000_000_000)}`;

	const errorText = $derived(invalidMessage);
</script>

{#if type === 'file'}
	<div class={cn('relative', containerClass)}>
		{#if invalid && errorText}
			<div
				id={errorId}
				role="alert"
				aria-live="assertive"
				class="absolute left-0 z-10 mt-1 w-max rounded-md border border-destructive/60 bg-destructive/5 px-2 py-1 text-sm text-destructive shadow-sm"
			>
				{errorText}
			</div>
		{/if}
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
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={invalid ? errorId : undefined}
			{...restProps}
		/>
	</div>
{:else}
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
			aria-invalid={invalid ? 'true' : undefined}
			aria-describedby={invalid ? errorId : undefined}
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

		{#if invalid && errorText}
			<div
				id={errorId}
				role="alert"
				aria-live="assertive"
				class="absolute bottom-full left-0 z-10 mb-1 w-max rounded-md border border-destructive/60 bg-destructive/5 px-2 py-px text-sm text-destructive opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100"
			>
				{errorText}
			</div>
		{/if}
	</div>
{/if}
