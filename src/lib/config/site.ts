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
		links: [
			{
				name: 'Bilibili',
				url: 'https://space.bilibili.com/1163451547',
				icon: 'simple-icons:bilibili'
			}
		]
	},
	links: {
		github: ''
	},
	announcement: {
		enable: false,
		// 可选: info | note | tip | important | warning | caution | happy
		level: 'info' as 'info' | 'note' | 'tip' | 'important' | 'warning' | 'caution' | 'happy',
		// 支持 HTML
		content: '欢迎来到云外拾光。'
	}
};

export type SiteConfig = typeof siteConfig;
