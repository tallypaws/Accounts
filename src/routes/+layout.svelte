<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';

	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';

	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Bot, LogIn, LogOut, UserRound } from '@lucide/svelte';
	import { page } from '$app/state';

	const url = $derived(page.url.pathname);
	const isProfilePage = $derived(url.startsWith('/@me'));
	const isApplicationsPage = $derived(url.startsWith('/apps'));
	const isLoginPage = $derived(url.startsWith('/login'));
</script>

<div class="absolute top-2 w-full justify-between px-2">
	<Button onclick={toggleMode} variant="outline" size="icon">
		<SunIcon
			class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
		/>
		<MoonIcon
			class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
		/>
		<span class="sr-only">Toggle theme</span>
	</Button>
	{#if !isProfilePage && data.loggedIn	}
		<Button href="/@me" variant="outline" size="icon">
			<UserRound />
			<span class="sr-only">User profile</span>
		</Button>
	{/if}
	{#if !isApplicationsPage && data.admin && data.loggedIn}
		<Button href="/apps" variant="outline" size="icon">
			<Bot />
			<span class="sr-only">Manage Applications</span>
		</Button>
	{/if}

	{#if !data.loggedIn && !isLoginPage}
		<Button href="/login" variant="outline" size="icon">
			<LogIn />
			<span class="sr-only">Login</span>
		</Button>
	{/if}
</div>
<Toaster richColors position="top-center" />
<ModeWatcher />
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
