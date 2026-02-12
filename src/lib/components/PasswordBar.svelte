<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		password = $bindable('')
	}: {
		children: Snippet;
		password: string;
	} = $props();

	import zxcvbn from '$lib/zxcvbn';

	const zxcvbnResult = $derived(zxcvbn(password));

	function strengthColor(log10: number): string {
		const min = 6;
		const max = 100;
		const clamped = Math.max(min, Math.min(max, log10));

		const t = (clamped - min) / (max - min);

		const gradient = [
			{ h: 0, s: 80, l: 50 }, // red
			{ h: 30, s: 90, l: 55 }, // orange
			{ h: 60, s: 90, l: 55 }, //	yellow
			{ h: 140, s: 60, l: 50 }, // green
			{ h: 180, s: 60, l: 50 }, // tealish miku color
			{ h: 240, s: 80, l: 60 } // blue
		];

		const segment = (gradient.length - 1) * t;
		const idx = Math.floor(segment);
		const frac = segment - idx;

		const start = gradient[idx];
		const end = gradient[idx + 1] || gradient[gradient.length - 1];

		const h = start.h + (end.h - start.h) * frac;
		const s = start.s + (end.s - start.s) * frac;
		const l = start.l + (end.l - start.l) * frac;

		return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
	}

	let t = $state(0.75);
</script>

<!-- <input type="range" min="0" max="1" step="0.01" bind:value={t} /> -->
<div class="group relative">
	{@render children?.()}
	<div class="pointer-events-none absolute right-2 bottom-0 left-2 h-1 h-full w-[calc(100%-1rem)]">
		<div
			class="absolute right-0 bottom-0 left-0 h-0.25 w-full
															overflow-hidden transition-all group-focus-within:h-1.25
															group-focus-within:translate-y-0.5 group-focus-within:rounded-xs group-focus-within:bg-background/60"
		>
			<div
				class="absolute bottom-0 left-0 h-full transition-all"
				style={`width: ${((zxcvbnResult.score / 4) * t + (zxcvbnResult.guesses_log10 / 14) * (1 - t)) * 100}%;
        background-color: ${strengthColor(((zxcvbnResult.score / 4) * t + (zxcvbnResult.guesses_log10 / 14) * (1 - t)) * 85)};`}
			></div>
		</div>
	</div>
</div>
