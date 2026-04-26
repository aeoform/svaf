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

export type AiMessage = {
	id: string;
	conversationId: string;
	role: 'user' | 'assistant' | string;
	content: string;
	createdAt: string;
};

export type AiModelStatus = {
	enabled: boolean;
	provider: string;
	model: string;
	baseUrl: string;
	path: string;
	variables: Record<string, boolean>;
};

export type AiChatStartResponse = {
	streamId: string;
	conversation: AiConversation;
	userMessage: AiMessage;
};

export type AiChatStreamResponse = {
	delta: string;
	done: boolean;
	conversation?: AiConversation | null;
	messages?: AiMessage[];
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

export async function fetchAiConversationMessages(conversationId: string) {
	const response = await fetch(`/ai/conversations/${conversationId}/messages`, {
		credentials: 'include'
	});

	const data = await readJson<ApiSuccess<{ messages: AiMessage[]; conversation: AiConversation }>>(
		response,
		'无法获取消息'
	);

	return data;
}

export async function startAiChatStream(payload: {
	conversationId?: string | null;
	moduleSlug?: string;
	content: string;
}) {
	const response = await fetch('/ai/chat/start', {
		method: 'POST',
		credentials: 'include',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			conversationId: payload.conversationId || null,
			moduleSlug: payload.moduleSlug || 'chat',
			content: payload.content
		})
	});

	const data = await readJson<ApiSuccess<AiChatStartResponse>>(response, '无法开始对话');
	return data;
}

export async function fetchAiChatStream(streamId: string) {
	const response = await fetch(`/ai/chat/stream/${streamId}`, {
		credentials: 'include'
	});

	const data = await readJson<ApiSuccess<AiChatStreamResponse>>(response, '无法获取流式响应');
	return data;
}

export async function fetchAiModelStatus() {
	const response = await fetch('/ai/model-status', {
		credentials: 'include'
	});

	const data = await readJson<ApiSuccess<{ model: AiModelStatus }>>(
		response,
		'无法获取模型状态'
	);

	return data.model;
}
