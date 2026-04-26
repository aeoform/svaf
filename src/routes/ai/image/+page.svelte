<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fetchAiSession, logoutAi } from '$lib/ai/auth';
	import { fetchAiImageStatus, generateAiImage, type AiImageStatus, type AiImageResult } from '$lib/ai/image';
	import { siteConfig } from '$lib/config/site';

	let session = $state<Awaited<ReturnType<typeof fetchAiSession>> | null>(null);
	let imageStatus = $state<AiImageStatus | null>(null);
	let loading = $state(true);
	let sending = $state(false);
	let error = $state('');
	let prompt = $state('');
	let model = $state('qwen-image-2.0');
	let size = $state('1024*1024');
	let sidebarCollapsed = $state(false);
	let result = $state<AiImageResult | null>(null);
	let lastPrompt = $state('');

	function persistSidebarState() {
		if (!browser) return;
		localStorage.setItem('ai-image-sidebar-collapsed', sidebarCollapsed ? '1' : '0');
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		persistSidebarState();
	}

	function goToChat() {
		void goto('/ai/', { replaceState: true, noScroll: true });
	}

	function logout() {
		void (async () => {
			await logoutAi();
			goto('/ai/auth/login/', { replaceState: true });
		})();
	}

	async function refreshImageStatus() {
		imageStatus = await fetchAiImageStatus();
		model = imageStatus.model || model;
		size = imageStatus.size || size;
	}

	async function submitPrompt(event: SubmitEvent) {
		event.preventDefault();

		const content = prompt.trim();
		if (!content) return;

		sending = true;
		error = '';

		try {
			lastPrompt = content;
			result = await generateAiImage({
				prompt: content,
				model,
				size
			});
			prompt = '';
		} catch (err) {
			error = err instanceof Error ? err.message : '图片生成失败';
		} finally {
			sending = false;
		}
	}

	onMount(() => {
		if (browser) {
			sidebarCollapsed = localStorage.getItem('ai-image-sidebar-collapsed') === '1';
		}

		void (async () => {
			session = await fetchAiSession();

			try {
				loading = true;
				error = '';
				await refreshImageStatus();
			} catch (err) {
				error = err instanceof Error ? err.message : '加载失败';
			} finally {
				loading = false;
			}
		})();
	});
</script>

<svelte:head>
	<title>AI 生图 · {siteConfig.title}</title>
	<meta name="description" content="云外拾光的 AI 生图入口。" />
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
							<p class="text-sm uppercase tracking-[0.35em] text-sky-200/60">AI 生图</p>
							<h1 class="mt-2 text-xl font-semibold text-slate-100">工具栏</h1>
							<p class="mt-2 text-sm leading-6 text-slate-300/80">
								这里是图像生成工具，不保留历史记录。直接输入描述并生成图片。
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
					<div class="mt-5 grid gap-4">
						<div class="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">工具切换</p>
									<p class="mt-1 text-xs text-slate-300/70">在对话和生图之间切换</p>
								</div>
								<span class="rounded-full border border-slate-700/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">
									tool
								</span>
							</div>
							<div class="mt-4 grid gap-2">
								<button
									type="button"
									class="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-500/70 hover:bg-slate-800/80"
									onclick={goToChat}
								>
									AI 对话
								</button>
								<button
									type="button"
									class="rounded-2xl border border-sky-300/40 bg-sky-400/10 px-4 py-3 text-left text-sm text-slate-100"
								>
									AI 生图
								</button>
							</div>
						</div>

						<div class="rounded-3xl border border-sky-300/20 bg-slate-900/80 p-4">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/60">模型状态</p>
									<p class="mt-1 text-xs text-slate-300/75">Token Plan 生图接口接入情况</p>
								</div>
								<span class={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] ${
									imageStatus?.enabled
										? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
										: 'border-amber-300/30 bg-amber-400/10 text-amber-100'
								}`}>
									{imageStatus?.enabled ? '已启用' : '未启用'}
								</span>
							</div>
							<div class="mt-4 grid gap-2 text-xs text-slate-300/80">
								<div class="flex items-center justify-between gap-3">
									<span>TOKEN_PLAN_API_KEY</span>
									<span>{imageStatus?.variables?.TOKEN_PLAN_API_KEY ? 'yes' : 'no'}</span>
								</div>
								<div class="flex items-center justify-between gap-3">
									<span>TOKEN_PLAN_MODEL</span>
									<span>{imageStatus?.model ?? 'qwen-image-2.0'}</span>
								</div>
								<div class="flex items-center justify-between gap-3">
									<span>TOKEN_PLAN_IMAGE_SIZE</span>
									<span>{imageStatus?.size ?? '1024*1024'}</span>
								</div>
								<div class="flex items-center justify-between gap-3">
									<span>TOKEN_PLAN_BASE_URL</span>
									<span>{imageStatus?.baseUrl ? 'yes' : 'no'}</span>
								</div>
							</div>
						</div>

						<div class="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4">
							<div class="flex items-center justify-between gap-3 text-sm">
								<span class="text-slate-300/70">当前登录</span>
								<span class="truncate text-slate-100">{session?.email ?? '未加载'}</span>
							</div>
							<div class="mt-3 flex items-center justify-between gap-3 text-sm">
								<span class="text-slate-300/70">当前工具</span>
								<span class="truncate text-slate-100">AI 生图</span>
							</div>
							<div class="mt-4 flex gap-3">
								<button
									type="button"
									class="flex-1 rounded-full bg-sky-300 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-200"
									onclick={goToChat}
								>
									去聊天
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
						<p class="text-sm uppercase tracking-[0.35em] text-sky-200/55">Image Panel</p>
						<h2 class="mt-3 text-3xl font-semibold text-slate-100">AI 生图</h2>
						<p class="mt-3 max-w-2xl text-sm leading-7 text-slate-300/85">
							输入文字描述后，后端会调用阿里云的 qwen-image-2.0 生成图片，页面只保留当前结果，不做历史记录。
						</p>
					</div>
					<div class="rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
						{model}
					</div>
				</div>

				<div class="mt-6 grid min-h-0 flex-1 gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">
					<form onsubmit={submitPrompt} class="rounded-3xl border border-slate-700/70 bg-slate-950/75 p-4 md:p-5">
						<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
							<textarea
								class="min-h-[9rem] resize-none rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-sky-300/40"
								placeholder="输入你想生成的图片描述，例如：一座漂浮在云上的中文书店，温暖黄昏光线，电影感"
								bind:value={prompt}
								disabled={sending}
							></textarea>

							<div class="grid gap-3">
								<label class="grid gap-2 text-sm text-slate-200">
									<span class="text-xs uppercase tracking-[0.25em] text-slate-400">模型</span>
									<select
										class="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none"
										bind:value={model}
										disabled={sending}
									>
										<option value="qwen-image-2.0">qwen-image-2.0</option>
										<option value="qwen-image-2.0-pro">qwen-image-2.0-pro</option>
									</select>
								</label>

								<label class="grid gap-2 text-sm text-slate-200">
									<span class="text-xs uppercase tracking-[0.25em] text-slate-400">尺寸</span>
									<select
										class="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none"
										bind:value={size}
										disabled={sending}
									>
										<option value="1024*1024">1024 × 1024</option>
										<option value="1280*720">1280 × 720</option>
										<option value="720*1280">720 × 1280</option>
									</select>
								</label>

								<button
									type="submit"
									class="rounded-full bg-sky-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
									disabled={sending || !prompt.trim()}
								>
									{sending ? '生成中...' : '生成图片'}
								</button>
							</div>
						</div>

						{#if error}
							<p class="mt-3 text-sm text-rose-300">{error}</p>
						{/if}
					</form>

					<div class="min-h-0 rounded-3xl border border-slate-700/70 bg-slate-950/75 p-4 md:p-5">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">预览</p>
								<p class="mt-1 text-xs text-slate-300/70">{lastPrompt || '等待生成'}</p>
							</div>
							<span class="rounded-full border border-slate-700/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">
								{size}
							</span>
						</div>

						<div class="mt-4 flex h-full min-h-[24rem] items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-700/70 bg-slate-900/60 p-4">
							{#if result?.imageUrl}
								<div class="grid w-full gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
									<div class="overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/70">
										<img
											src={result.imageUrl}
											alt={lastPrompt || '生成图片'}
											class="h-full w-full object-contain"
										/>
									</div>
									<div class="rounded-3xl border border-slate-700/70 bg-slate-950/80 p-4">
										<p class="text-sm font-medium text-slate-100">生成完成</p>
										<p class="mt-2 text-xs leading-6 text-slate-300/80">
											模型：{result.model}<br />
											尺寸：{result.size}
										</p>
										<a
											class="mt-4 inline-flex rounded-full bg-sky-300 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-200"
											href={result.imageUrl}
											target="_blank"
											rel="noreferrer"
										>
											打开原图
										</a>
									</div>
								</div>
							{:else}
								<div class="text-center">
									<p class="text-sm uppercase tracking-[0.3em] text-sky-200/55">AI Image</p>
									<h3 class="mt-3 text-xl font-semibold text-slate-100">这里显示生成结果</h3>
									<p class="mt-3 text-sm leading-7 text-slate-300/80">
										先输入一句图像描述，再点生成。当前不会保留历史图记录。
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>
