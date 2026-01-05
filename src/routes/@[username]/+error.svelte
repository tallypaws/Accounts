<script lang="ts">
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card/index.js';
</script>


<div class="flex h-screen w-screen items-center justify-center">
	<Card.Root class=" relative w-[70%] max-w-180">
		<Card.Content>
            <p class="text-center text-muted-foreground">
                @{page.params.username} does not exist.
            </p>
        </Card.Content>
	</Card.Root>
</div>
