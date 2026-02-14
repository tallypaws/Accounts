<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
</script>

<div class="flex h-screen w-screen items-center justify-center">
	<Card.Root class=" relative w-[70%] max-w-180">
		<Card.Content class="p-6 text-center">
			<h1 class="mb-4 text-2xl font-bold text-destructive text-shadow-lg text-shadow-destructive/20">
				{page.status}
			</h1>
			<p class="text-center text-muted-foreground">
				{page.error?.message}
			</p>
			<Button href="/" variant="outline" class="mt-6">
				Go back home
			</Button>
		</Card.Content>
	</Card.Root>
</div>
