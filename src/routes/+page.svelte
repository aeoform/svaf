<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { siteConfig } from '$lib/config/site';
	import Icon from '@iconify/svelte';
	import Announcement from '$lib/components/Announcement.svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
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

	<!-- 社交 -->
	<div class="w-full max-w-2xl mx-auto">
		<Card class="relative overflow-hidden">
			<CardHeader class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
				<CardTitle class="text-center text-5xl font-black tracking-widest text-foreground/[0.04] dark:text-foreground/[0.06] select-none">社交</CardTitle>
			</CardHeader>
			<CardContent class="relative z-10">
				<div class="flex flex-wrap gap-3 justify-center">
					{#each siteConfig.bio.social as link}
						{@const isLocalImage = link.icon.startsWith('/')}
						<a href={link.url} target="_blank" rel="noopener noreferrer">
							<Button variant="outline" class="flex items-center gap-2">
								{#if isLocalImage}
									<img src={link.icon} alt={link.name} class="w-5 h-5" />
								{:else}
									<Icon
										icon={link.icon}
										class="w-5 h-5"
										style={link.color ? `color: ${link.color}` : ''}
									/>
								{/if}
								<span class="text-sm font-medium">{link.name}</span>
							</Button>
						</a>
					{/each}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- 导航 -->
	<div class="w-full max-w-2xl mx-auto">
		<Card class="relative overflow-hidden">
			<CardHeader class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
				<CardTitle class="text-center text-5xl font-black tracking-widest text-foreground/[0.04] dark:text-foreground/[0.06] select-none">导航</CardTitle>
			</CardHeader>
			<CardContent class="relative z-10">
				<div class="flex flex-wrap gap-3 justify-center">
					{#each siteConfig.navLinks as link}
						{@const isExternal = link.href.startsWith('http')}
						<a href={link.href} {...isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}}>
							<Button
								variant={link.highlight ? 'default' : 'outline'}
								class="flex items-center gap-2 {link.highlight ? 'ring-2 ring-primary/40 shadow-md shadow-primary/20' : ''}"
							>
								<Icon icon={link.icon} class="w-5 h-5" />
								{link.label}
								{#if link.badge}
									<Badge variant="secondary" class="ml-0.5">{link.badge}</Badge>
								{/if}
								{#if isExternal}
									<Icon icon="mdi:open-in-new" class="w-3.5 h-3.5 opacity-60" />
								{/if}
							</Button>
						</a>
					{/each}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- 个人使用 -->
	<div class="w-full max-w-2xl mx-auto">
		<Card class="relative overflow-hidden">
			<CardHeader class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
				<CardTitle class="text-center text-5xl font-black tracking-widest text-foreground/[0.04] dark:text-foreground/[0.06] select-none">个人使用</CardTitle>
			</CardHeader>
			<CardContent class="relative z-10">
				<div class="flex flex-wrap gap-3 justify-center">
					{#each siteConfig.bio.personal as link}
						{@const isLocalImage = link.icon.startsWith('/')}
						<a href={link.url} target="_blank" rel="noopener noreferrer">
							<Button variant="outline" class="flex items-center gap-2">
								{#if isLocalImage}
									<img src={link.icon} alt={link.name} class="w-5 h-5" />
								{:else}
									<Icon icon={link.icon} class="w-5 h-5" />
								{/if}
								<span class="text-sm font-medium">{link.name}</span>
							</Button>
						</a>
					{/each}
				</div>
			</CardContent>
		</Card>
	</div>
</div>
