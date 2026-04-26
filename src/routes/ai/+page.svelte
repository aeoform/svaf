<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fetchAiSession, logoutAi } from '$lib/ai/auth';
	import {
		fetchAiConversationMessages,
		fetchAiConversations,
		fetchAiModules,
		fetchAiModelStatus,
		sendAiChatMessage,
		type AiConversation,
		type AiMessage,
		type AiModule,
		type AiModelStatus
	} from '$lib/ai/console';
	import { siteConfig } from '$lib/config/site';

	let session = $state<Awaited<ReturnType<typeof fetchAiSession>> | null>(null);
	let modules = $state<AiModule[]>([]);
	let conversations = $state<AiConversation[]>([]);
	let messages = $state<AiMessage[]>([]);
	let loading = $state(true);
	let loadingMessages = $state(false);
	let sending = $state(false);
	let error = $state('');
	let chatError = $state('');
	let modelStatus = $state<AiModelStatus | null>(null);
	let sidebarCollapsed = $state(false);
	let composer = $state('');
	let draftMode = $state(false);

	let selectedToolSlug = $derived($page.url.searchParams.get('tool') ?? '');
	let selectedConversationId = $derived($page.url.searchParams.get('conversation') ?? '');
	let selectedModule = $derived(modules.find((item) => item.slug === selectedToolSlug) ?? modules[0] ?? null);
	let selectedConversation = $derived(
		draftMode
			? null
			: selectedConversationId
				? conversations.find((item) => item.id === selectedConversationId) ?? null
				: moduleConversations[0] ?? conversations[0] ?? null
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
		messages = [];
		chatError = '';
		draftMode = false;
	}

	function openConversation(conversation: AiConversation) {
		draftMode = false;
		updateQuery({ tool: conversation.moduleSlug, conversation: conversation.id });
	}

	function newConversation() {
		draftMode = true;
		updateQuery({ conversation: null });
		messages = [];
		chatError = '';
	}

	function logout() {
		void (async () => {
			await logoutAi();
			goto('/ai/auth/login/', { replaceState: true });
		})();
	}

	function upsertConversation(next: AiConversation) {
		conversations = [
			next,
			...conversations.filter((item) => item.id !== next.id)
		].sort((left, right) => {
			return new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime();
		});
	}

	async function loadConversationMessages(conversationId: string) {
		if (!conversationId) {
			messages = [];
			return;
		}

		loadingMessages = true;
		chatError = '';

		try {
			const data = await fetchAiConversationMessages(conversationId);
			upsertConversation(data.conversation);
			messages = data.messages;
		} catch (err) {
			chatError = err instanceof Error ? err.message : '无法加载对话';
			messages = [];
		} finally {
			loadingMessages = false;
		}
	}

	async function submitMessage(event: SubmitEvent) {
		event.preventDefault();

		const content = composer.trim();
		if (!content) return;
		if (!selectedModule) {
			chatError = '模块尚未加载';
			return;
		}

		sending = true;
		chatError = '';

		try {
			const result = await sendAiChatMessage({
				conversationId: selectedConversation?.id ?? null,
				moduleSlug: selectedModule.slug,
				content
			});

			upsertConversation(result.conversation);
			messages = result.messages;
			composer = '';
			draftMode = false;
			updateQuery({ tool: result.conversation.moduleSlug, conversation: result.conversation.id });
		} catch (err) {
			chatError = err instanceof Error ? err.message : '发送失败';
		} finally {
			sending = false;
		}
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
				modelStatus = await fetchAiModelStatus();
			} catch (err) {
				error = err instanceof Error ? err.message : '加载失败';
			} finally {
				loading = false;
			}
		})();
	});

	$effect(() => {
		if (!selectedConversationId) {
			messages = [];
			return;
		}

		void loadConversationMessages(selectedConversationId);
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
		style={`--sidebar-width:${sidebarCollapsed ? '4.75rem' : '15.75rem'}`}
		class="overflow-hidden rounded-[2rem] border border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94))] shadow-2xl shadow-black/35 backdrop-blur"
	>
		<div class="grid min-h-[calc(100vh-9rem)] gap-0 lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
			<aside class="border-b border-slate-800/80 bg-slate-950/80 p-3 lg:border-b-0 lg:border-r lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
				<div class="flex items-start justify-between gap-3">
					{#if !sidebarCollapsed}
						<div>
							<p class="text-sm uppercase tracking-[0.35em] text-sky-200/60">AI Console</p>
							<h1 class="mt-2 text-xl font-semibold">功能与历史</h1>
							<p class="mt-2 text-sm leading-6 text-white/60">
								模块在上，历史在下。后面接更多 AI 能力时，只扩这两块。
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

				<div class={`mt-5 ${sidebarCollapsed ? 'space-y-2' : 'space-y-6'}`}>
					<section>
						{#if !sidebarCollapsed}
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-white/40">功能列表</p>
									<p class="mt-1 text-xs text-white/45">后端动态加载</p>
								</div>
								<button
									type="button"
									class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-white/55 transition hover:bg-white/10"
									onclick={newConversation}
								>
									新对话
								</button>
							</div>
						{/if}

						<div class={`mt-3 space-y-2 ${sidebarCollapsed ? 'mt-0' : ''}`}>
							{#if loading && !modules.length}
								<div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
									正在加载模块...
								</div>
							{/if}

							{#each modules as item}
								<button
									type="button"
									class={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
										item.slug === selectedModule?.slug
											? 'border-sky-300/40 bg-sky-400/10'
											: 'border-slate-700/70 bg-slate-900/70 hover:border-slate-500/70 hover:bg-slate-800/80'
									}`}
									onclick={() => openModule(item.slug)}
								>
									<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-xs uppercase tracking-[0.25em] text-slate-300">
										{item.slug.slice(0, 2)}
									</div>

									{#if !sidebarCollapsed}
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<h2 class="truncate text-sm font-medium text-white">{item.name}</h2>
												<span class="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-slate-300">
													{item.tag}
												</span>
											</div>
											<p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-300/80">{item.description}</p>
										</div>
									{/if}
								</button>
							{/each}
						</div>
					</section>

					<section>
						{#if !sidebarCollapsed}
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">历史对话</p>
									<p class="mt-1 text-xs text-slate-300/75">{moduleConversations.length} 条记录</p>
								</div>
								<span class="rounded-full border border-slate-700/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">
									{selectedModule?.slug ?? 'all'}
								</span>
							</div>
						{/if}

						<div class={`mt-3 space-y-2 ${sidebarCollapsed ? 'mt-0' : ''}`}>
							{#if error}
								<div class="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-50">
									{error}
								</div>
							{/if}

							{#if loading && !conversations.length}
								<div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
									正在加载历史对话...
								</div>
							{:else if moduleConversations.length === 0}
								<div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
									暂无历史对话
								</div>
							{:else}
								{#each moduleConversations as conversation}
									<button
										type="button"
										class={`w-full rounded-2xl border px-4 py-3 text-left transition ${
											conversation.id === selectedConversation?.id
												? 'border-sky-300/40 bg-sky-400/10'
												: 'border-slate-700/70 bg-slate-900/70 hover:border-slate-500/70 hover:bg-slate-800/80'
										}`}
										onclick={() => openConversation(conversation)}
									>
										<div class="flex items-center justify-between gap-3">
											<div class="min-w-0">
												<p class="truncate text-sm font-medium text-slate-100">
													{conversation.title || '未命名对话'}
												</p>
												<p class="mt-1 truncate text-xs text-slate-300/75">{conversation.summary || '暂无摘要'}</p>
											</div>
											<span class="shrink-0 rounded-full border border-slate-700/80 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">
												{conversation.moduleSlug}
											</span>
										</div>
									</button>
								{/each}
							{/if}
						</div>
					</section>

					{#if !sidebarCollapsed}
						<div class="mt-5 rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4">
							<div class="flex items-center justify-between gap-3 text-sm">
								<span class="text-slate-300/70">当前登录</span>
								<span class="truncate text-slate-100">{session?.email ?? '未加载'}</span>
							</div>
							<div class="mt-3 flex items-center justify-between gap-3 text-sm">
								<span class="text-slate-300/70">当前模块</span>
								<span class="truncate text-slate-100">{selectedModule?.name ?? '暂无'}</span>
							</div>
						</div>

						<div class="mt-5 rounded-3xl border border-sky-300/20 bg-slate-900/80 p-4">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/60">模型接入</p>
									<p class="mt-1 text-xs text-slate-300/75">通过环境变量切到云端大模型</p>
								</div>
								<span class={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] ${
									modelStatus?.enabled
										? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
										: 'border-amber-300/30 bg-amber-400/10 text-amber-100'
								}`}>
									{modelStatus?.enabled ? '已启用' : '未启用'}
								</span>
							</div>
							<div class="mt-4 grid gap-2 text-xs text-slate-300/80">
								<div class="flex items-center justify-between gap-3">
									<span>MODEL_API_BASE_URL</span>
									<span>{modelStatus?.variables?.MODEL_API_BASE_URL ? 'yes' : 'no'}</span>
								</div>
								<div class="flex items-center justify-between gap-3">
									<span>MODEL_API_KEY</span>
									<span>{modelStatus?.variables?.MODEL_API_KEY ? 'yes' : 'no'}</span>
								</div>
								<div class="flex items-center justify-between gap-3">
									<span>MODEL_MODEL</span>
									<span>{modelStatus?.model ?? 'gpt-4o-mini'}</span>
								</div>
								<div class="flex items-center justify-between gap-3">
									<span>MODEL_PROVIDER</span>
									<span>{modelStatus?.provider ?? 'openai-compatible'}</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</aside>

			<div class="flex min-h-0 flex-col p-6 md:p-8">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="text-sm uppercase tracking-[0.35em] text-sky-200/55">Chat Panel</p>
						<h2 class="mt-3 text-3xl font-semibold">
							{selectedModule?.name ?? 'AI 聊天'}
						</h2>
						<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-300/85">
							右侧先留给聊天。当前是基础版对话，后面可以继续接真实模型、流式输出和工具调用。
						</p>
					</div>
					<div class="flex items-center gap-3">
						{#if selectedConversation}
							<div class="rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
								{selectedConversation.moduleSlug} · {selectedConversation.title || '未命名对话'}
							</div>
						{:else}
							<div class="rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
								新对话
							</div>
						{/if}
					</div>
				</div>

				<div class="mt-8 grid min-h-0 flex-1 gap-4 lg:grid-rows-[1fr_auto]">
					<div class="min-h-0 rounded-3xl border border-slate-700/70 bg-slate-950/70 p-5">
						{#if loadingMessages}
							<div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
								正在加载对话...
							</div>
						{/if}

						<div class="max-h-[calc(100vh-24rem)] space-y-4 overflow-y-auto pr-1">
							{#if messages.length === 0}
								<div class="rounded-3xl border border-dashed border-slate-600/70 bg-slate-900/60 p-8 text-center">
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">AI Chat</p>
									<h3 class="mt-3 text-xl font-semibold text-slate-100">从这里开始聊天</h3>
									<p class="mt-3 text-sm leading-7 text-slate-300/80">
										先选左侧模块，或者直接在下面输入一段消息，系统会自动建立会话。
									</p>
								</div>
							{:else}
								{#each messages as message}
									<div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
										<div
											class={`max-w-[78%] rounded-[1.5rem] border px-4 py-3 text-sm leading-7 ${
												message.role === 'user'
													? 'border-slate-200/80 bg-slate-100 text-slate-950'
													: 'border-slate-700/70 bg-slate-900/85 text-slate-100'
											}`}
										>
											<div class="mb-2 text-[10px] uppercase tracking-[0.3em] opacity-60">
												{message.role === 'user' ? '你' : '助手'}
											</div>
											{message.content}
										</div>
									</div>
								{/each}
							{/if}
						</div>
					</div>

					<form onsubmit={submitMessage} class="rounded-3xl border border-slate-700/70 bg-slate-950/70 p-4">
						<div class="flex items-start gap-3">
							<textarea
								class="min-h-[5.5rem] flex-1 resize-none rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-sky-300/40"
								placeholder={selectedConversation ? '继续输入这段对话' : '输入消息，系统会自动创建新会话'}
								bind:value={composer}
								disabled={sending}
							></textarea>
							<button
								type="submit"
								class="rounded-full bg-sky-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={sending}
							>
								{sending ? '发送中...' : '发送'}
							</button>
						</div>

						{#if chatError}
							<p class="mt-3 text-sm text-rose-300">{chatError}</p>
						{/if}

						<div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-slate-400">
							<span>模块：{selectedModule?.name ?? '未加载'}</span>
							<button
								type="button"
								class="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-2 transition hover:bg-slate-800/80"
								onclick={newConversation}
							>
								新建空会话
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</section>
</main>
