<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fetchAiSession, logoutAi } from '$lib/ai/auth';
	import {
		fetchAiChatStream,
		fetchAiConversationMessages,
		fetchAiConversations,
		fetchAiModelStatus,
		startAiChatStream,
		type AiConversation,
		type AiMessage,
		type AiModelStatus
	} from '$lib/ai/console';
	import { siteConfig } from '$lib/config/site';
	import { renderAiMarkdown } from '$lib/utils/ai-markdown';

	let session = $state<Awaited<ReturnType<typeof fetchAiSession>> | null>(null);
	let conversations = $state<AiConversation[]>([]);
	let messages = $state<AiMessage[]>([]);
	let modelStatus = $state<AiModelStatus | null>(null);
	let loading = $state(true);
	let loadingMessages = $state(false);
	let sending = $state(false);
	let streaming = $state(false);
	let error = $state('');
	let chatError = $state('');
	let sidebarCollapsed = $state(false);
	let composer = $state('');
	let draftMode = $state(false);

	let selectedConversationId = $derived($page.url.searchParams.get('conversation') ?? '');
	let selectedConversation = $derived(
		draftMode
			? null
			: selectedConversationId
				? conversations.find((item) => item.id === selectedConversationId) ?? null
				: conversations[0] ?? null
	);
	let historyItems = $derived(conversations);

	let loadToken = 0;
	let streamToken = 0;
	let loadedConversationId = '';
	let pendingConversationId = '';
	let activeStreamConversationId = '';

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

	function openConversation(conversation: AiConversation) {
		draftMode = false;
		updateQuery({ conversation: conversation.id });
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
		].sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime());
	}

	function mergeMessages(serverMessages: AiMessage[], fallbackMessages: AiMessage[]) {
		if (!serverMessages.length) {
			return fallbackMessages;
		}

		if (serverMessages.length >= fallbackMessages.length) {
			return serverMessages;
		}

		const byId = new Map(serverMessages.map((message) => [message.id, message]));
		const merged = [...fallbackMessages];

		for (const message of serverMessages) {
			byId.set(message.id, message);
		}

		return merged.map((message) => byId.get(message.id) ?? message);
	}

	async function refreshConversations() {
		try {
			conversations = await fetchAiConversations();
		} catch {
			// Keep the current list if a refresh fails.
		}
	}

	async function loadConversationMessages(conversationId: string) {
		if (!conversationId) {
			messages = [];
			loadedConversationId = '';
			pendingConversationId = '';
			return;
		}

		if (
			conversationId === loadedConversationId ||
			conversationId === pendingConversationId ||
			conversationId === activeStreamConversationId
		) {
			return;
		}

		const currentLoad = ++loadToken;
		pendingConversationId = conversationId;
		loadingMessages = true;
		chatError = '';

		try {
			const data = await fetchAiConversationMessages(conversationId);
			if (currentLoad !== loadToken) return;
			upsertConversation(data.conversation);
			messages = data.messages;
			loadedConversationId = conversationId;

			if (data.activeStream && !data.activeStream.done) {
				const assistantId = `stream-assistant-${data.activeStream.streamId}`;
				const assistantContent = data.activeStream.assistantContent || '正在生成…';
				if (messages[messages.length - 1]?.role !== 'assistant') {
					messages = [
						...messages,
						{
							id: assistantId,
							conversationId,
							role: 'assistant',
							content: assistantContent,
							createdAt: new Date().toISOString()
						}
					];
				}
				activeStreamConversationId = conversationId;
				void pollStream(data.activeStream.streamId, assistantId, data.activeStream.cursor || assistantContent.length);
			}
		} catch (err) {
			if (currentLoad !== loadToken) return;
			chatError = err instanceof Error ? err.message : '无法加载对话';
			messages = [];
		} finally {
			if (currentLoad === loadToken) {
				pendingConversationId = '';
			}
			if (currentLoad === loadToken) loadingMessages = false;
		}
	}

	async function pollStream(
		streamId: string,
		assistantId: string,
		initialCursor = 0
	) {
		const currentStream = ++streamToken;
		let cursor = Math.max(initialCursor, 0);
		streaming = true;

		try {
			while (currentStream === streamToken) {
				let result;
				try {
					result = await fetchAiChatStream(streamId, cursor);
				} catch (err) {
					chatError = err instanceof Error ? err.message : '获取流式响应失败';
					break;
				}

				if (currentStream !== streamToken) return;

				if (result.delta) {
					cursor = result.cursor ?? cursor + result.delta.length;
					messages = messages.map((message) =>
						message.id === assistantId
							? {
									...message,
									content:
										message.content === '正在生成…'
											? result.delta
											: `${message.content || ''}${result.delta}`
								}
							: message
					);
				} else if (typeof result.cursor === 'number') {
					cursor = result.cursor;
				}

				if (result.conversation) {
					upsertConversation(result.conversation);
					draftMode = false;
				}

				if (result.done) {
					if (result.conversation) {
						if (result.messages?.length) {
							messages = mergeMessages(result.messages, messages);
						}
						loadedConversationId = result.conversation.id;
						upsertConversation(result.conversation);
					} else if (result.messages?.length) {
						messages = result.messages;
					}
					activeStreamConversationId = '';
					break;
				}

				if (typeof result.cursor === 'number') {
					cursor = result.cursor;
				}

				await new Promise((resolve) => setTimeout(resolve, 140));
			}
		} finally {
			if (currentStream === streamToken) streaming = false;
		}
	}

	async function submitMessage(event: SubmitEvent) {
		event.preventDefault();

		const content = composer.trim();
		if (!content) return;
		const clientRequestId = crypto.randomUUID();

		sending = true;
		chatError = '';
		activeStreamConversationId = '__starting__';

		try {
			const userMessage: AiMessage = {
				id: `local-user-${Date.now()}`,
				conversationId: selectedConversation?.id ?? 'pending',
				role: 'user',
				content,
				createdAt: new Date().toISOString()
			};
			const assistantId = `local-assistant-${Date.now()}`;
			const assistantMessage: AiMessage = {
				id: assistantId,
				conversationId: selectedConversation?.id ?? 'pending',
				role: 'assistant',
				content: '正在生成…',
				createdAt: new Date().toISOString()
			};

			messages = [...messages, userMessage, assistantMessage];
			composer = '';

			let start: Awaited<ReturnType<typeof startAiChatStream>> | null = null;
			let lastError: unknown = null;
			for (let attempt = 0; attempt < 2; attempt += 1) {
				try {
					start = await startAiChatStream({
						conversationId: selectedConversation?.id ?? null,
						moduleSlug: 'chat',
						content,
						clientRequestId
					});
					lastError = null;
					break;
				} catch (err) {
					lastError = err;
					const message = err instanceof Error ? err.message : '发送失败';
					const shouldRetry =
						attempt === 0 &&
						(message.includes('无法开始对话') ||
							message.includes('auth backend timeout') ||
							message.includes('auth backend unreachable') ||
							message.includes('request failed'));
					if (!shouldRetry) break;
					await new Promise((resolve) => setTimeout(resolve, 300));
				}
			}

			if (!start) {
				throw lastError instanceof Error ? lastError : new Error('发送失败');
			}

			upsertConversation(start.conversation);
			draftMode = false;
			activeStreamConversationId = start.conversation.id;
			updateQuery({ conversation: start.conversation.id });
			loadedConversationId = '';
			pendingConversationId = '';
			messages = messages.map((message) =>
				message.id === userMessage.id
					? {
							...message,
							conversationId: start.conversation.id
						}
					: message.id === assistantId
						? {
								...message,
								conversationId: start.conversation.id
							}
						: message
			);

			void pollStream(start.streamId, assistantId);
		} catch (err) {
			messages = messages.filter((message) => !message.id.startsWith('local-'));
			chatError = err instanceof Error ? err.message : '发送失败';
			activeStreamConversationId = '';
		} finally {
			sending = false;
		}
	}

	onMount(() => {
		const htmlOverflow = document.documentElement.style.overflow;
		const bodyOverflow = document.body.style.overflow;
		const bodyPaddingBottom = document.body.style.paddingBottom;

		document.documentElement.style.overflow = 'hidden';
		document.body.style.overflow = 'hidden';
		document.body.style.paddingBottom = '0px';

		if (browser) {
			sidebarCollapsed = localStorage.getItem('ai-sidebar-collapsed') === '1';
		}

		void (async () => {
			session = await fetchAiSession();

			try {
				loading = true;
				error = '';
				const [, status] = await Promise.all([
					refreshConversations(),
					fetchAiModelStatus()
				]);
				modelStatus = status;
			} catch (err) {
				error = err instanceof Error ? err.message : '加载失败';
			} finally {
				loading = false;
			}
		})();

		return () => {
			document.documentElement.style.overflow = htmlOverflow;
			document.body.style.overflow = bodyOverflow;
			document.body.style.paddingBottom = bodyPaddingBottom;
		};
	});

	$effect(() => {
		if (draftMode || streaming || activeStreamConversationId) return;

		const targetConversationId = selectedConversationId || conversations[0]?.id || '';
		if (!targetConversationId) {
			messages = [];
			return;
		}

		void loadConversationMessages(targetConversationId);
	});
</script>

<svelte:head>
	<title>AI 对话 · {siteConfig.title}</title>
	<meta name="description" content="云外拾光的 AI 对话入口。" />
</svelte:head>

<main class="h-[calc(100dvh-5rem)] w-full overflow-hidden px-0 py-0 text-white">
	<section
		style={`--sidebar-width:${sidebarCollapsed ? '3.25rem' : '20rem'}`}
		class="h-full overflow-hidden border-y border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.97),rgba(15,23,42,0.95))] shadow-2xl shadow-black/35 backdrop-blur"
	>
		<div class="grid h-full min-h-0 gap-0 lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
			<aside class={`border-b border-slate-800/80 bg-slate-950/80 transition-[width] duration-300 ease-out lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r scrollbar-hide ${
				sidebarCollapsed ? 'p-1' : 'p-3'
			}`}>
				<div class={`flex items-start ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
					{#if !sidebarCollapsed}
						<div>
							<p class="text-sm uppercase tracking-[0.35em] text-sky-200/60">AI 对话</p>
							<h1 class="mt-2 text-xl font-semibold text-slate-100">功能和历史</h1>
							<p class="mt-2 text-sm leading-6 text-slate-300/80">
								当前只保留已上线的聊天功能。历史对话在下方，新的能力后面再按需加。
							</p>
						</div>
					{/if}

					<button
						type="button"
						class={`rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:bg-slate-800/80 ${
							sidebarCollapsed ? 'mx-auto' : ''
						}`}
						onclick={toggleSidebar}
						aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
					>
						{sidebarCollapsed ? '»' : '«'}
					</button>
				</div>

				{#if !sidebarCollapsed}
					<div class="mt-5 space-y-5">
						<section>
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">功能列表</p>
									<p class="mt-1 text-xs text-slate-300/70">目前只保留 AI 对话</p>
								</div>
								<button
									type="button"
									class="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-slate-200 transition hover:bg-slate-800/80"
									onclick={newConversation}
								>
									新对话
								</button>
							</div>
							<div class="mt-3">
								<button
									type="button"
									class="flex w-full items-start gap-3 rounded-2xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-left transition"
									onclick={newConversation}
								>
									<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-xs uppercase tracking-[0.25em] text-slate-200">
										AI
									</div>
									<div>
										<h2 class="text-sm font-medium text-slate-100">AI 对话</h2>
										<p class="mt-1 text-xs leading-5 text-slate-300/80">基础聊天、历史记录、后续模型接入都从这里开始。</p>
									</div>
								</button>
							</div>
						</section>

						<section>
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">历史对话</p>
									<p class="mt-1 text-xs text-slate-300/70">{historyItems.length} 条记录</p>
								</div>
								<span class="rounded-full border border-slate-700/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">
									chat
								</span>
							</div>

							<div class="scrollbar-hide mt-3 space-y-2 overflow-y-auto">
								{#if error}
									<div class="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-50">
										{error}
									</div>
								{/if}

								{#if loading && !conversations.length}
									<div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
										正在加载历史对话...
									</div>
								{:else if historyItems.length === 0}
									<div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
										暂无历史对话
									</div>
								{:else}
									{#each historyItems as conversation}
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
													对话
												</span>
											</div>
										</button>
									{/each}
								{/if}
							</div>
						</section>

						<div class={`rounded-3xl border border-sky-300/20 bg-slate-900/80 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/60">模型接入</p>
									<p class="mt-1 text-xs text-slate-300/75">给云端大模型留的环境变量入口</p>
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

						<div class={`rounded-3xl border border-slate-700/70 bg-slate-900/70 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
							<div class="flex items-center justify-between gap-3 text-sm">
								<span class="text-slate-300/70">当前登录</span>
								<span class="truncate text-slate-100">{session?.email ?? '未加载'}</span>
							</div>
							<div class="mt-3 flex items-center justify-between gap-3 text-sm">
								<span class="text-slate-300/70">当前对话</span>
								<span class="truncate text-slate-100">{selectedConversation?.title ?? '新对话'}</span>
							</div>
							<div class="mt-4 flex gap-3">
								<button
									type="button"
									class="flex-1 rounded-full bg-sky-300 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-200"
									onclick={newConversation}
								>
									新对话
								</button>
								<button
									type="button"
									class="rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800/80"
									onclick={logout}
								>
									退出
								</button>
							</div>
						</div>
					</div>
				{/if}
			</aside>

			<div class="flex min-h-0 flex-col p-4 md:p-6 lg:p-8">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="text-sm uppercase tracking-[0.35em] text-sky-200/55">Chat Panel</p>
						<h2 class="mt-3 text-3xl font-semibold text-slate-100">AI 聊天</h2>
						<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-300/85">
							右侧只保留聊天。流式输出会通过多次轮询请求拿差异，后面接真实模型时也能直接沿用。
						</p>
					</div>
					<div class="rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
						{selectedConversation?.moduleSlug ?? 'chat'}
					</div>
				</div>

				<div class="mt-6 flex min-h-0 flex-1 flex-col gap-4">
					<div class="min-h-0 flex-1 rounded-3xl border border-slate-700/70 bg-slate-950/75 p-4 md:p-5">
						{#if loadingMessages}
							<div class="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 text-sm text-slate-300">
								正在加载对话...
							</div>
						{/if}

						<div class="scrollbar-hide flex h-full min-h-[18rem] flex-col space-y-4 overflow-y-auto pr-1">
							{#if messages.length === 0}
								<div class="rounded-3xl border border-dashed border-slate-600/70 bg-slate-900/60 p-8 text-center">
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">AI Chat</p>
									<h3 class="mt-3 text-xl font-semibold text-slate-100">从这里开始聊天</h3>
									<p class="mt-3 text-sm leading-7 text-slate-300/80">
										直接输入消息即可，系统会自动创建新会话并开始流式返回差异。
									</p>
								</div>
							{:else}
								{#each messages as message}
									<div class={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
										<div
											class={`max-w-[78%] rounded-[1.5rem] border px-4 py-3 text-sm leading-7 break-words ${
												message.role === 'user'
													? 'border-slate-200/80 bg-slate-100 text-slate-950'
													: 'border-slate-700/70 bg-slate-900/85 text-slate-100'
											}`}
										>
											<div class="mb-2 text-[10px] uppercase tracking-[0.3em] opacity-60">
												{message.role === 'user' ? '你' : '助手'}
											</div>
											<div
												class={`ai-message-markdown ${
													message.role === 'user' ? 'prose prose-sm prose-neutral' : 'prose prose-sm prose-invert'
												} max-w-none break-words`}
											>
												{@html renderAiMarkdown(message.content)}
											</div>
										</div>
									</div>
								{/each}
							{/if}
						</div>
					</div>

					<form onsubmit={submitMessage} class="rounded-3xl border border-slate-700/70 bg-slate-950/75 p-4">
						<div class="flex items-start gap-3">
							<textarea
								class="min-h-[5.5rem] flex-1 resize-none rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-sky-300/40"
								placeholder={selectedConversation ? '继续输入这段对话' : '输入消息，系统会自动创建新会话'}
								bind:value={composer}
								disabled={sending || streaming}
							></textarea>
							<button
								type="submit"
								class="rounded-full bg-sky-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={sending || streaming}
							>
								{sending || streaming ? '发送中...' : '发送'}
							</button>
						</div>

						{#if chatError}
							<p class="mt-3 text-sm text-rose-300">{chatError}</p>
						{/if}

						<div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-slate-400">
							<span>流式：轮询差异</span>
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
