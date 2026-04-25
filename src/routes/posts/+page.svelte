<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { siteConfig } from '$lib/config/site';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('zh-CN', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>文章列表 - {siteConfig.title}</title>
	<meta name="description" content="浏览所有文章" />
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-12">
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold">文章列表</h1>
		<p class="text-muted-foreground">浏览本站已发布的内容</p>
	</div>

	{#if data.posts.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">暂无文章</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each data.posts as post}
				<a href="/posts/{post.slug}" class="block">
					<Card.Root class="group transition-all hover:shadow-lg">
						<Card.Content class="p-6">
							<div class="flex flex-col gap-4 md:flex-row">
								{#if post.metadata.image}
									<div class="md:w-48 md:flex-shrink-0">
										<img
											src={post.metadata.image}
											alt={post.metadata.title}
											class="h-48 w-full rounded-md object-cover md:h-32"
										/>
									</div>
								{/if}

								<div class="flex-1">
									<div class="mb-2 flex items-center gap-2">
										{#if post.metadata.pinned}
											<Badge>置顶</Badge>
										{/if}
										<time class="text-sm text-muted-foreground">
											{formatDate(post.metadata.published)}
										</time>
									</div>

									<h2 class="mb-2 text-2xl font-semibold group-hover:text-primary">
										{post.metadata.title}
									</h2>

									<p class="text-muted-foreground">{post.metadata.description}</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</div>
