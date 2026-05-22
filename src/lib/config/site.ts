export const siteConfig = {
	name: '云外拾光',
	title: '云外拾光',
	subtitle: '个人站点',
	url: 'https://example.com',
	icon: '/avatar-home.png',
	description: '云外拾光是一个只保留基础主页与博客功能的个人站点。',
	keywords: ['云外拾光', '博客', '个人站点'],
	lang: 'zh_CN',
	author: {
		name: '云外拾光',
		url: 'https://example.com'
	},
	bio: {
		avatar: '/avatar-home.png',
		name: '云外拾光',
		bio: '记录、整理与分享。',
		social: [
			{
				name: 'GitHub',
				url: 'https://github.com/aeoform/svaf',
				icon: 'simple-icons:github',
				color: '#333333'
			},
			{
				name: 'Bilibili',
				url: 'https://space.bilibili.com/1163451547',
				icon: 'simple-icons:bilibili',
				color: '#fb7299'
			}
		],
		personal: [
			{
				name: 'Alist',
				url: 'https://alist.aeoform.com',
				icon: 'mdi:file-tree'
			},
			{
				name: 'Immich',
				url: 'https://immich.aeoform.com',
				icon: 'mdi:image-multiple'
			}
		]
	},
	navLinks: [
		{ label: '博客', icon: 'mdi:post-outline', href: '/posts' }
	],
	links: {
		github: 'https://github.com/aeoform/svaf'
	},
	announcement: {
		enable: false,
		level: 'info' as 'info' | 'note' | 'tip' | 'important' | 'warning' | 'caution' | 'happy',
		content: '欢迎来到云外拾光。'
	}
};

export type SiteConfig = typeof siteConfig;
