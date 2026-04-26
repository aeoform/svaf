<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fetchAiSession, logoutAi } from '$lib/ai/auth';
	import { fetchAiConversations, fetchAiModules, type AiConversation, type AiModule } from '$lib/ai/console';
	import { siteConfig } from '$lib/config/site';

	let session = $state<Awaited<ReturnType<typeof fetchAiSession>> | null>(null);
	let modules = $state<AiModule[]>([]);
	let conversations = $state<AiConversation[]>([]);
	let loading = $state(true);
	let error = $state('');
	let sidebarCollapsed = $state(false);

	let selectedToolSlug = $derived($page.url.searchParams.get('tool') ?? '');
	let selectedConversationId = $derived($page.url.searchParams.get('conversation') ?? '');
	let selectedModule = $derived(modules.find((item) => item.slug === selectedToolSlug) ?? modules[0] ?? null);
	let selectedConversation = $derived(
		conversations.find((item) => item.id === selectedConversationId) ??
			(selectedModule ? conversations.find((item) => item.moduleSlug === selectedModule.slug) : null) ??
			conversations[0] ??
			null
	);
	let moduleConversations = $derived(
		selectedModule ? conversations.filter((item) => item.moduleSlug === selectedModule.slug) : conversations
	);

	function persistSidebarState() {
		if (!browser) return;
		localStorage.setItem('ai-sidebar-collapsed', sidebarCollapsed ? '1' : '0');
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		persistSidebarState();
	}

	function updateQuery(next: Record<string, string | null>) {
		const params = new URLSearchParams($page.url.searchParams);

		for (const [key, value] of Object.entries(next)) {
			if (typeof value === 'string' && value.trim()) params.set(key, value);
			else params.delete(key);
		}

		const query = params.toString();
		void goto(query ? `${$page.url.pathname}?${query}` : $page.url.pathname, {
			replaceState: true,
			noScroll: true
		});
	}

	function openModule(slug: string) {
		updateQuery({ tool: slug, conversation: null });
	}

	function openConversation(conversation: AiConversation) {
		updateQuery({ tool: conversation.moduleSlug, conversation: conversation.id });
	}

	function logout() {
		void (async () => {
			await logoutAi();
			goto('/ai/auth/login/', { replaceState: true });
		})();
	}

	onMount(() => {
		if (browser) {
			sidebarCollapsed = localStorage.getItem('ai-sidebar-collapsed') === '1';
		}

		void (async () => {
			session = await fetchAiSession();

			try {
				loading = true;
				error = '';
				const [moduleList, conversationList] = await Promise.all([
					fetchAiModules(),
					fetchAiConversations()
				]);
				modules = moduleList;
				conversations = conversationList;
			} catch (err) {
				error = err instanceof Error ? err.message : '加载失败';
			} finally {
				loading = false;
			}
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
	<section
		style={`--sidebar-width:${sidebarCollapsed ? '4.75rem' : '18rem'}`}
		class="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(86,153,255,0.28),transparent_36%),radial-gradient(circle_at_top_right,rgba(255,179,71,0.16),transparent_30%),rgba(255,255,255,0.05)] shadow-2xl shadow-black/20 backdrop-blur"
	>
		<div class="grid min-h-[calc(100vh-9rem)] gap-0 lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
			<aside class="border-b border-white/10 bg-black/20 p-3 lg:border-b-0 lg:border-r lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
				<div class="flex items-start justify-between gap-3">
					{#if !sidebarCollapsed}
						<div>
							<p class="text-sm uppercase tracking-[0.35em] text-white/45">AI Console</p>
							<h1 class="mt-2 text-xl font-semibold">功能侧边栏</h1>
							<p class="mt-2 text-sm leading-6 text-white/60">
								以后所有 AI 相关能力都从这里分流，模块和历史对话都由后端提供。
							</p>
						</div>
					{/if}

					<button
						type="button"
						class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/10"
						onclick={toggleSidebar}
						aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
					>
						{sidebarCollapsed ? '»' : '«'}
					</button>
				</div>

				<nav class={`mt-5 space-y-2 ${sidebarCollapsed ? 'mt-6' : ''}`}>
					{#if loading && !modules.length}
						<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/45">
							正在加载模块...
						</div>
					{/if}

					{#each modules as item}
						<button
							type="button"
							class={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
								item.slug === selectedModule?.slug
									? 'border-white/30 bg-white/12'
									: 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
							}`}
							onclick={() => openModule(item.slug)}
						>
							<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-xs uppercase tracking-[0.25em] text-white/50">
								{item.slug.slice(0, 2)}
							</div>

							{#if !sidebarCollapsed}
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<h2 class="truncate text-sm font-medium text-white">{item.name}</h2>
										<span class="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-white/40">
											{item.tag}
										</span>
									</div>
									<p class="mt-1 line-clamp-2 text-xs leading-5 text-white/55">{item.description}</p>
								</div>
							{/if}
						</button>
					{/each}
				</nav>

				{#if !sidebarCollapsed}
					<div class="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
						<div class="flex items-center justify-between gap-3 text-sm">
							<span class="text-white/45">当前登录</span>
							<span class="truncate text-white/80">{session?.email ?? '未加载'}</span>
						</div>
						<div class="mt-3 flex items-center justify-between gap-3 text-sm">
							<span class="text-white/45">当前模块</span>
							<span class="truncate text-white/80">{selectedModule?.name ?? '暂无'}</span>
						</div>
					</div>

					<div class="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="text-sm uppercase tracking-[0.3em] text-white/40">历史对话</p>
								<p class="mt-1 text-xs text-white/45">{moduleConversations.length} 条记录</p>
							</div>
							<span class="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-white/40">
								{selectedModule?.slug ?? 'all'}
							</span>
						</div>

						{#if error}
							<div class="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
								{error}
							</div>
						{/if}

						<div class="mt-4 space-y-2">
							{#if loading && !conversations.length}
								<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/45">
									正在加载历史对话...
								</div>
							{:else if moduleConversations.length === 0}
								<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/45">
									暂无历史对话
								</div>
							{:else}
								{#each moduleConversations as conversation}
									<button
										type="button"
										class={`w-full rounded-2xl border px-4 py-3 text-left transition ${
											conversation.id === selectedConversation?.id
												? 'border-white/30 bg-white/12'
												: 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
										}`}
										onclick={() => openConversation(conversation)}
									>
										<div class="flex items-center justify-between gap-3">
											<div class="min-w-0">
												<p class="truncate text-sm font-medium text-white">
													{conversation.title || '未命名对话'}
												</p>
												<p class="mt-1 truncate text-xs text-white/50">{conversation.summary || '暂无摘要'}</p>
											</div>
											<span class="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-white/40">
												{conversation.moduleSlug}
											</span>
										</div>
									</button>
								{/each}
							{/if}
						</div>
					</div>

					<div class="mt-5 flex gap-3">
						<button
							type="button"
							class="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-90"
							onclick={() => openModule(selectedModule?.slug ?? 'chat')}
						>
							{selectedModule?.action ?? '打开功能'}
						</button>
						<button
							type="button"
							class="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
							onclick={logout}
						>
							退出
						</button>
					</div>
				{:else}
					<div class="mt-5 space-y-2">
						{#each modules as item}
							<div
								class={`flex h-12 w-full items-center justify-center rounded-2xl border ${
									item.slug === selectedModule?.slug ? 'border-white/30 bg-white/12' : 'border-white/10 bg-white/5'
								}`}
								title={item.name}
								aria-label={item.name}
							>
								<span class="text-xs uppercase tracking-[0.25em] text-white/60">{item.slug.slice(0, 2)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</aside>

			<div class="p-6 md:p-8">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="text-sm uppercase tracking-[0.35em] text-white/45">Module Detail</p>
						<h2 class="mt-3 text-3xl font-semibold">{selectedModule?.name ?? '正在加载模块'}</h2>
						<p class="mt-3 max-w-2xl text-sm leading-7 text-white/65">
							{selectedModule?.description ??
								'模块列表由后端提供，历史对话也从后端同步。这里先保留可扩展的壳子。'}
						</p>
					</div>
					{#if selectedModule}
						<div class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/45">
							{selectedModule.tag}
						</div>
					{/if}
				</div>

				<div class="mt-8 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
					<div class="rounded-3xl border border-white/10 bg-black/20 p-6">
						<div class="text-sm uppercase tracking-[0.3em] text-white/40">功能能力</div>
						<div class="mt-5 flex flex-wrap gap-2">
							{#if selectedModule}
								{#each [selectedModule.action, selectedModule.note, '后端加载', '可扩展侧边栏'] as item}
									<span class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">
										{item}
									</span>
								{/each}
							{:else}
								<span class="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">
									等待后端数据
								</span>
							{/if}
						</div>
					</div>

					<div class="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6">
						<div class="text-sm uppercase tracking-[0.3em] text-white/40">当前对话</div>
						{#if selectedConversation}
							<div class="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
								<p class="text-sm font-medium text-white">
									{selectedConversation.title || '未命名对话'}
								</p>
								<p class="mt-2 text-sm leading-7 text-white/65">
									{selectedConversation.summary || '暂无摘要'}
								</p>
								<div class="mt-3 text-xs uppercase tracking-[0.26em] text-white/35">
									{selectedConversation.moduleSlug} · {selectedConversation.lastMessageAt}
								</div>
							</div>
						{:else}
							<p class="mt-4 text-sm leading-7 text-white/65">
								还没有对话记录。后面接入聊天后，这里会自动跟随你最近的会话。
							</p>
						{/if}

						<div class="mt-5 text-sm uppercase tracking-[0.3em] text-white/40">后续建议</div>
						<ul class="mt-4 space-y-3 text-sm leading-7 text-white/68">
							<li>· 每个功能以后可以独立成 `/ai/&lt;模块名&gt;` 页面。</li>
							<li>· 侧边栏已经可收回，适合后面挂聊天列表和会话树。</li>
							<li>· 模块列表和历史对话都改成了后端驱动，前端只负责展示。</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>
