<script lang="ts">
	import type { PageProps } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';

	let { data }: PageProps = $props();
</script>

<div class="flex min-h-screen w-screen flex-col items-center justify-center gap-4 p-4">
	<Card.Root class="w-full max-w-3xl">
		<Card.Header>
			<Card.Title>OAuth2 Test Flow</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-6">
			{#if data.error}
				<div class="rounded-lg border border-red-600 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950">
					<p class="font-semibold text-red-900 dark:text-red-100">Error</p>
					<code class="text-sm text-red-800 dark:text-red-200">{data.error}</code>
				</div>
			{/if}

			{#if data.code}
				<div class="space-y-2">
					<h3 class="font-semibold">Authorization Code</h3>
					<pre class="overflow-auto rounded p-3 text-xs bg-background"><code>{data.code}</code></pre>
				</div>
			{/if}

			{#if data.tokenExchange}
				<div class="space-y-2">
					<h3 class="font-semibold">Token Exchange Response</h3>
					<pre class="overflow-auto rounded p-3 text-xs bg-background"><code>{JSON.stringify(data.tokenExchange, null, 2)}</code></pre>
				</div>
			{/if}

			{#if data.userInfo}
				<div class="space-y-2">
					<h3 class="font-semibold">User Info Response</h3>
					<pre class="overflow-auto rounded p-3 text-xs bg-background"><code>{JSON.stringify(data.userInfo, null, 2)}</code></pre>
				</div>
			{/if}

			{#if !data.error && !data.tokenExchange && !data.userInfo}
				<div class="rounded-lg border border-yellow-600 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950">
					<p class="text-yellow-900 dark:text-yellow-100">No authorization code provided. Add <code class="font-mono">?code=...</code> to the URL to test.</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
