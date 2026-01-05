<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { goto } from '$app/navigation';

	let { data }: PageProps = $props();

	onMount(() => {
		if (data.success) {
			goto('/login');
		}
	});
</script>
