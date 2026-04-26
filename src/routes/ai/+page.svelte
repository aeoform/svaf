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

<main class="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-6xl px-4 py-8 text-white">
	<section class="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(86,153,255,0.35),transparent_38%),radial-gradient(circle_at_top_right,rgba(255,179,71,0.22),transparent_34%),rgba(255,255,255,0.05)] shadow-2xl shadow-black/20 backdrop-blur">
		<div class="grid gap-8 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-8">
			<div>
				<p class="text-sm uppercase tracking-[0.35em] text-white/45">AI Console</p>
				<h1 class="mt-4 text-3xl font-semibold md:text-4xl">把 AI 功能拆成独立模块来管理</h1>
				<p class="mt-4 max-w-2xl text-sm leading-7 text-white/68">
					这里是主入口。以后你要加聊天、知识库、图片生成、自动化工具，只要在这个页面里加一个模块即可。
				</p>

				<div class="mt-6 flex flex-wrap gap-3">
					<button
						type="button"
						class="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
						onclick={() => openModule(selectedModule.slug)}
					>
						{selectedModule.action}
					</button>
					<button
						type="button"
						class="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
						onclick={logout}
					>
						退出登录
					</button>
				</div>

				<div class="mt-6 grid gap-3 text-sm text-white/72 sm:grid-cols-2">
					<div class="rounded-2xl border border-white/10 bg-black/18 p-4">
						<div class="text-white/45">当前登录</div>
						<div class="mt-1 break-all">{session?.email ?? '未加载'}</div>
					</div>
					<div class="rounded-2xl border border-white/10 bg-black/18 p-4">
						<div class="text-white/45">当前模块</div>
						<div class="mt-1">{selectedModule.name}</div>
					</div>
				</div>
			</div>

			<div class="rounded-[1.75rem] border border-white/10 bg-black/20 p-4">
				<div class="grid gap-3 sm:grid-cols-2">
					{#each modules as item}
						<button
							type="button"
							class={`group rounded-2xl border p-4 text-left transition hover:border-white/25 hover:bg-white/10 ${
								item.slug === selectedSlug ? 'border-white/35 bg-white/12' : 'border-white/10 bg-white/5'
							}`}
							onclick={() => openModule(item.slug)}
						>
							<div class="flex items-center justify-between gap-3">
								<h2 class="text-base font-medium text-white">{item.name}</h2>
								<span class="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.28em] text-white/45">
									{item.tag}
								</span>
							</div>
							<p class="mt-3 text-sm leading-6 text-white/60">{item.description}</p>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="border-t border-white/10 px-6 py-6 md:px-8">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p class="text-sm uppercase tracking-[0.35em] text-white/35">Module Detail</p>
					<h2 class="mt-2 text-2xl font-semibold">{selectedModule.name}</h2>
				</div>
				<div class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/45">
					{selectedModule.tag}
				</div>
			</div>

			<div class="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
				<div class="rounded-3xl border border-white/10 bg-black/20 p-6">
					<p class="text-sm leading-7 text-white/68">{selectedModule.description}</p>
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
						<li>· 这里先做统一切换入口，后面接后端时不需要重做导航。</li>
						<li>· 模块状态、权限和模型选择可以逐步拆成独立配置。</li>
					</ul>
					<p class="mt-5 text-xs uppercase tracking-[0.26em] text-white/35">{selectedModule.note}</p>
				</div>
			</div>
		</div>
	</section>
</main>
