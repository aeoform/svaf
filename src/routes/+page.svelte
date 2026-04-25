<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { siteConfig } from '$lib/config/site';
	import Icon from '@iconify/svelte';
	import Announcement from '$lib/components/Announcement.svelte';

	const iconColors: Record<string, string> = {
		Bilibili: '#fb7299',
		GitHub: '#333333'
	};
</script>

<svelte:head>
	<title>{siteConfig.title} - 首页</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
	<Announcement />

	<img src={siteConfig.bio.avatar} alt={siteConfig.bio.name} class="h-32 w-32 rounded-full" />

	<div class="text-center">
		<h1 class="text-4xl font-bold mb-2">{siteConfig.bio.name}</h1>
		<p class="text-lg text-muted-foreground mb-4">{siteConfig.bio.bio}</p>
	</div>

	{#if siteConfig.bio.links.length > 0}
		<div class="flex flex-wrap gap-3 justify-center">
			{#each siteConfig.bio.links as link}
				<a href={link.url} target="_blank" rel="noopener noreferrer">
					<Button variant="outline" class="flex items-center gap-2">
						<Icon icon={link.icon} class="w-5 h-5" style={`color: ${iconColors[link.name] ?? 'currentColor'}`} />
						<span class="text-sm font-medium">{link.name}</span>
					</Button>
				</a>
			{/each}
		</div>

		<Separator class="max-w-xs" />
	{/if}

	<div class="flex flex-wrap gap-3 justify-center">
		<a href="/posts">
			<Button class="flex items-center gap-2">
				<Icon icon="mdi:post-outline" class="w-5 h-5" />
				博客
			</Button>
		</a>
	</div>
</div>
