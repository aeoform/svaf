<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fetchAiSession, logoutAi } from '$lib/ai/auth';
	import { siteConfig } from '$lib/config/site';

	type AiModule = {
		slug: string;
		name: string;
		tag: string;
		description: string;
		highlights: string[];
		action: string;
		note: string;
	};

	const modules: AiModule[] = [
		{
			slug: 'chat',
			name: 'AI 对话',
			tag: '主入口',
			description: '聊天、追问、总结都从这里开始。后面你可以把模型切换、上下文管理和消息记录都接进来。',
			highlights: ['多轮对话', '流式输出', '上下文记忆'],
			action: '打开聊天',
			note: '当前作为默认功能页。'
		},
		{
			slug: 'knowledge',
			name: '知识库',
			tag: '预留',
			description: '以后可以放文档检索、笔记问答、站内资料库等能力，适合做更长流程的 AI 工具。',
			highlights: ['文档导入', '检索问答', '资料分组'],
			action: '进入知识库',
			note: '先留入口，后面直接接后端。'
		},
		{
			slug: 'image',
			name: '图片生成',
			tag: '预留',
			description: '适合放文生图、图像重绘、头像生成这类能力，和对话模块分开后会更清楚。',
			highlights: ['文生图', '图像重绘', '历史记录'],
			action: '进入图片页',
			note: '以后可以单独接模型适配层。'
		},
		{
			slug: 'automation',
			name: '自动化工具',
			tag: '预留',
			description: '以后可以接任务流、批处理、定时生成、内容整理等功能，方便把 AI 做成工具箱。',
			highlights: ['任务流', '批处理', '定时执行'],
			action: '进入工具箱',
			note: '适合后续扩展成工作台。'
		}
	];

	let session = $state<Awaited<ReturnType<typeof fetchAiSession>> | null>(null);
	let selectedSlug = $derived(
		modules.find((item) => item.slug === $page.url.searchParams.get('tool'))?.slug ?? modules[0].slug
	);
	let selectedModule = $derived(modules.find((item) => item.slug === selectedSlug) ?? modules[0]);

	function openModule(slug: string) {
		void goto(`/ai/?tool=${slug}`, { replaceState: true, noScroll: true });
	}

	function logout() {
		void (async () => {
			await logoutAi();
			goto('/ai/auth/login/', { replaceState: true });
		})();
	}

	onMount(() => {
		void (async () => {
			session = await fetchAiSession();
		})();
	});
</script>

<svelte:head>
	<title>AI 控制台 · {siteConfig.title}</title>
	<meta
		name="description"
		content="云外拾光的 AI 功能入口，后面会逐步扩展成多个独立能力模块。"
	/>
</svelte:head>

<main class="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-7xl px-4 py-8 text-white">
	<section class="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(86,153,255,0.28),transparent_36%),radial-gradient(circle_at_top_right,rgba(255,179,71,0.16),transparent_30%),rgba(255,255,255,0.05)] shadow-2xl shadow-black/20 backdrop-blur">
		<div class="grid min-h-[calc(100vh-9rem)] gap-0 lg:grid-cols-[290px_minmax(0,1fr)]">
			<aside class="border-b border-white/10 bg-black/20 p-5 lg:border-b-0 lg:border-r">
				<p class="text-sm uppercase tracking-[0.35em] text-white/45">AI Console</p>
				<h1 class="mt-3 text-2xl font-semibold">功能切换</h1>
				<p class="mt-3 text-sm leading-7 text-white/60">
					以后所有 AI 相关能力都从这里分流。新增功能时，只要往侧边栏里加一项。
				</p>

				<nav class="mt-6 space-y-2">
					{#each modules as item}
						<button
							type="button"
							class={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
								item.slug === selectedSlug
									? 'border-white/30 bg-white/12'
									: 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
							}`}
							onclick={() => openModule(item.slug)}
						>
							<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-xs uppercase tracking-[0.25em] text-white/50">
								{item.slug.slice(0, 2)}
							</div>
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<h2 class="truncate text-sm font-medium text-white">{item.name}</h2>
									<span class="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-white/40">
										{item.tag}
									</span>
								</div>
								<p class="mt-1 line-clamp-2 text-xs leading-5 text-white/55">{item.description}</p>
							</div>
						</button>
					{/each}
				</nav>

				<div class="mt-6 space-y-3 rounded-3xl border border-white/10 bg-black/20 p-4 text-sm">
					<div class="flex items-center justify-between gap-3">
						<span class="text-white/45">当前登录</span>
						<span class="truncate text-white/80">{session?.email ?? '未加载'}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-white/45">当前模块</span>
						<span class="truncate text-white/80">{selectedModule.name}</span>
					</div>
				</div>

				<div class="mt-4 flex gap-3">
					<button
						type="button"
						class="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
						onclick={() => openModule(selectedModule.slug)}
					>
						{selectedModule.action}
					</button>
					<button
						type="button"
						class="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
						onclick={logout}
					>
						退出
					</button>
				</div>
			</aside>

			<div class="p-6 md:p-8">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="text-sm uppercase tracking-[0.35em] text-white/45">Module Detail</p>
						<h2 class="mt-3 text-3xl font-semibold">{selectedModule.name}</h2>
						<p class="mt-3 max-w-2xl text-sm leading-7 text-white/65">{selectedModule.description}</p>
					</div>
					<div class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/45">
						{selectedModule.tag}
					</div>
				</div>

				<div class="mt-8 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
					<div class="rounded-3xl border border-white/10 bg-black/20 p-6">
						<div class="text-sm uppercase tracking-[0.3em] text-white/40">功能能力</div>
						<div class="mt-5 flex flex-wrap gap-2">
							{#each selectedModule.highlights as item}
								<span class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">
									{item}
								</span>
							{/each}
						</div>
					</div>

					<div class="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6">
						<div class="text-sm uppercase tracking-[0.3em] text-white/40">后续建议</div>
						<ul class="mt-4 space-y-3 text-sm leading-7 text-white/68">
							<li>· 每个功能以后可以独立成 `/ai/&lt;模块名&gt;` 页面。</li>
							<li>· 这里先做统一侧边栏，后面接后端时不需要重做导航。</li>
							<li>· 模块状态、权限和模型选择可以逐步拆成独立配置。</li>
						</ul>
						<p class="mt-5 text-xs uppercase tracking-[0.26em] text-white/35">{selectedModule.note}</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>
