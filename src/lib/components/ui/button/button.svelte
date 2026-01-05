<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
				destructive:
					'bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white shadow-xs',
				warning:
					'bg-warning hover:bg-warning/90 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40 dark:bg-warning/60 text-white shadow-xs',
				outline:
					'bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border shadow-xs',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs',
				ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
				invisible: 'bg-transparent text-foreground/70 hover:text-foreground',
				link: 'text-primary underline-offset-4 hover:underline'
			},
			size: {
				default: 'h-9 px-4 py-2 has-[>svg]:px-3',
				sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
				xs: 'h-6 gap-1 rounded-md has-[>svg]:px-0',
				lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
				icon: 'size-9',
				'icon-sm': 'size-8',
				'icon-lg': 'size-10'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type HoldAction = {
		duration: number;
		fn: () => void;
	};

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			onHeld?: HoldAction;
			dynamic?:
				| Snippet<
						[
							{
								heldProgress: number;
								heldMs: number;
								holding: boolean;
							}
						]
				  >
				| undefined;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		onHeld,
		children,
		dynamic: child,
		onclick,
		'on:click': oncclick,
		...restProps
	}: ButtonProps = $props();

	let heldActivated = $state(false);

	let holdTimer: number | null = null;
	let holding = $state(false);
	let rafId: number | null = null;

	let holdStart = 0;
	let holdDuration = 0;

	function setHoldVars(progress: number, elapsed: number) {
		if (!ref) return;

		ref.style.setProperty('--hold-progress', progress.toString());
		ref.style.setProperty('--hold-elapsed-ms', `${elapsed}`);
	}

	let elapsed = $state(0);
	let progress = $state(0);

	function tick() {
		if (!holding) return;

		const now = performance.now();
		elapsed = now - holdStart;
		progress = Math.min(elapsed / holdDuration, 1);

		setHoldVars(progress, elapsed);

		if (progress < 1) {
			rafId = requestAnimationFrame(tick);
		}
	}

	function startHold(e: PointerEvent) {
		if (!onHeld || disabled) return;

		e.preventDefault();

		holding = true;
		heldActivated = false;

		holdStart = performance.now();
		holdDuration = onHeld.duration;

		setHoldVars(0, 0);

		rafId = requestAnimationFrame(tick);

		holdTimer = window.setTimeout(() => {
			holdTimer = null;
			holding = false;
			heldActivated = true;

			setHoldVars(1, onHeld.duration);
			onHeld.fn();
		}, onHeld.duration);
	}

	function cancelHold() {
		holding = false;

		progress = 0
		elapsed = 0

		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}

		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}

		setHoldVars(0, 0);
	}

	function handleClick(e: MouseEvent) {
		if (heldActivated) {
			e.preventDefault();
			e.stopPropagation();
			heldActivated = false;
			return;
		}
		const handler = (onclick ?? oncclick) as unknown as ((e: any) => any) | undefined;
		handler?.(e as any);
	}
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		onpointerdown={startHold}
		onpointerup={cancelHold}
		onpointerleave={cancelHold}
		onpointercancel={cancelHold}
		onclick={handleClick}
		{...restProps}
	>
		{@render children?.()}
		{@render child?.({
			heldMs: elapsed,
			heldProgress: progress,
			holding
		})}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		onpointerdown={startHold}
		onpointerup={cancelHold}
		onpointerleave={cancelHold}
		onpointercancel={cancelHold}
		onclick={handleClick}
		{...restProps}
	>
		{@render children?.()}
		{@render child?.({
			heldMs: elapsed,
			heldProgress: progress,
			holding
		})}
	</button>
{/if}
