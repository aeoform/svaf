export type AiModule = {
	slug: string;
	name: string;
	tag: string;
	description: string;
	action: string;
	note: string;
	sortOrder: number;
	isActive: boolean;
};

export type AiConversation = {
	id: string;
	userId: string;
	moduleSlug: string;
	title: string;
	summary: string;
	isArchived: boolean;
	lastMessageAt: string;
	createdAt: string;
	updatedAt: string;
};

type ApiSuccess<T> = { ok: true } & T;
type ApiFailure = { ok: false; error?: string };

async function readJson<T>(response: Response, fallbackError: string): Promise<T> {
	const data = (await response.json().catch(() => null)) as T | ApiFailure | null;
	if (!response.ok || !data || ('ok' in data && data.ok === false)) {
		const message =
			data && 'ok' in data && !data.ok && 'error' in data && data.error
				? data.error
				: fallbackError;
		throw new Error(message);
	}

	return data as T;
}

export async function fetchAiModules() {
	const response = await fetch('/ai/modules', {
		credentials: 'include'
	});

	const data = await readJson<ApiSuccess<{ modules: AiModule[] }>>(response, '无法获取功能列表');
	return data.modules;
}

export async function fetchAiConversations(moduleSlug = '') {
	const query = moduleSlug ? `?module=${encodeURIComponent(moduleSlug)}` : '';

	const response = await fetch(`/ai/conversations${query}`, {
		credentials: 'include'
	});

	const data = await readJson<ApiSuccess<{ conversations: AiConversation[] }>>(
		response,
		'无法获取历史对话'
	);
	return data.conversations;
}
