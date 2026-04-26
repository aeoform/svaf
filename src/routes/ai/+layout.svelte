<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fetchAiSession } from '$lib/ai/auth';
	import { siteConfig } from '$lib/config/site';

	let { children } = $props();

	let pathname = $derived($page.url.pathname);
	let search = $derived($page.url.search);
	let isLoginRoute = $derived(pathname.includes('/ai/auth/login'));
	let hasToken = $state(false);

	onMount(() => {
		void (async () => {
			if (!browser) return;

			const session = await fetchAiSession();
			hasToken = !!session;

			if (!isLoginRoute && !session) {
				const redirect = encodeURIComponent(pathname + search);
				goto(`/ai/auth/login/?redirect=${redirect}`, { replaceState: true });
			}

			if (isLoginRoute && session) {
				goto('/ai/', { replaceState: true });
			}
		})();
	});
</script>

<svelte:head>
	<title>AI工具 · {siteConfig.title}</title>
	<meta name="description" content={siteConfig.description} />
</svelte:head>

{#if isLoginRoute}
	{@render children()}
{:else if hasToken}
	{@render children()}
{:else}
	<main class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center px-4 py-16">
		<div class="w-full rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-white shadow-2xl shadow-black/20 backdrop-blur">
			<p class="text-sm uppercase tracking-[0.35em] text-white/45">AI Tools</p>
			<h1 class="mt-4 text-3xl font-semibold">正在跳转到登录页</h1>
			<p class="mt-3 text-sm text-white/65">没有登录态，先登录后再继续访问 AI 工具。</p>
		</div>
	</main>
{/if}
