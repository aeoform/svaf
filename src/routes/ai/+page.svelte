<script lang="ts">
	import { goto } from '$app/navigation';
	import { clearAiToken, getAiToken } from '$lib/ai/auth';
	import { siteConfig } from '$lib/config/site';

	let token = $derived(getAiToken());

	function logout() {
		clearAiToken();
		goto('/ai/auth/login/', { replaceState: true });
	}
</script>

<svelte:head>
	<title>AI工具 · {siteConfig.title}</title>
</svelte:head>

<main class="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-4xl px-4 py-12 text-white">
	<section class="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/15 backdrop-blur">
		<p class="text-sm uppercase tracking-[0.35em] text-white/45">AI Tools</p>
		<h1 class="mt-4 text-3xl font-semibold">AI 工具入口</h1>
		<p class="mt-3 text-sm text-white/65">
			这里后面接你的 AI 聊天、会话列表和模型切换。当前先保留登录后的空壳页。
		</p>

		<div class="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
			<div>登录态：{token ? '已存在' : '不存在'}</div>
			<div class="mt-1 break-all">Token：{token ?? '无'}</div>
		</div>

		<button
			type="button"
			class="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
			onclick={logout}
		>
			退出登录
		</button>
	</section>
</main>
