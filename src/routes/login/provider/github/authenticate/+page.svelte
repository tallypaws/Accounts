<script lang="ts">
	import { onMount } from 'svelte';
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();
    const redirectUrl = data.githubAuthUrl
    onMount(() => {
        console.log(data);
        window.location.href = redirectUrl;
    });
</script>

{data.account?.username}!!

