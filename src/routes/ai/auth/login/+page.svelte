<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { siteConfig } from '$lib/config/site';
	import { fetchAiSession, loginAi } from '$lib/ai/auth';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	function getRedirectTarget() {
		const raw = $page.url.searchParams.get('redirect') ?? '/ai/';
		return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/ai/';
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		const cleanEmail = email.trim();
		const cleanPassword = password.trim();

		if (!cleanEmail || !cleanPassword) {
			error = '请输入邮箱和密码。';
			return;
		}

		loading = true;
		void (async () => {
			try {
				await loginAi(cleanEmail, cleanPassword);
				goto(getRedirectTarget(), { replaceState: true });
			} catch {
				error = '无法连接登录服务';
			} finally {
				loading = false;
			}
		})();
	}

	onMount(() => {
		if (!browser) return;
		void (async () => {
			const session = await fetchAiSession();
			if (session) goto('/ai/', { replaceState: true });
		})();
	});
</script>

<svelte:head>
	<title>AI工具登录 · {siteConfig.title}</title>
	<meta name="description" content="登录后继续访问 AI 工具" />
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center px-4 py-12 text-white">
	<section class="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/15 backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
		<div>
			<p class="text-sm uppercase tracking-[0.35em] text-white/45">AI Login</p>
			<h1 class="mt-4 text-3xl font-semibold">登录后继续使用 AI 工具</h1>
			<p class="mt-3 max-w-xl text-sm leading-7 text-white/65">
				这里先放前端门禁。后端鉴权接入后，这个表单再切到真实登录接口。
			</p>
		</div>

		<form class="space-y-4" onsubmit={submit}>
			<label class="block">
				<span class="mb-2 block text-sm text-white/70">邮箱</span>
				<input
					class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
					type="email"
					bind:value={email}
					placeholder="name@example.com"
					autocomplete="email"
				/>
			</label>

			<label class="block">
				<span class="mb-2 block text-sm text-white/70">密码</span>
				<input
					class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
					type="password"
					bind:value={password}
					placeholder="请输入密码"
					autocomplete="current-password"
				/>
			</label>

			{#if error}
				<p class="text-sm text-red-300">{error}</p>
			{/if}

			<button
				type="submit"
				class="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={loading}
			>
				{loading ? '登录中...' : '登录'}
			</button>
		</form>
	</section>
</main>
