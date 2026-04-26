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
	cursor: number;
	conversation?: AiConversation | null;
	messages?: AiMessage[];
};

type ApiSuccess<T> = { ok: true } & T;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

async function readJson<T>(response: Response, fallbackError: string): Promise<T> {
	const data: unknown = await response.json().catch(() => null);
	if (!response.ok || !isRecord(data) || ('ok' in data && data.ok === false)) {
		const message =
			isRecord(data) && 'ok' in data && !data.ok && 'error' in data && typeof data.error === 'string'
				? data.error
				: fallbackError;
		throw new Error(message);
	}

	return data as T;
}

export async function fetchAiConversations(moduleSlug = '') {
	const params = new URLSearchParams();
	if (moduleSlug) params.set('module', moduleSlug);
	params.set('limit', '10000');

	const response = await fetch(`/ai/conversations?${params.toString()}`, {
		credentials: 'include'
	});

	const data = await readJson<ApiSuccess<{ conversations: AiConversation[] }>>(
		response,
		'无法获取历史对话'
	);
	return data.conversations;
}

export async function fetchAiConversationMessages(conversationId: string) {
	const response = await fetch(`/ai/conversations/${conversationId}/messages?limit=20000`, {
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

export async function fetchAiChatStream(streamId: string, cursor = 0) {
	const response = await fetch(`/ai/chat/stream/${streamId}?cursor=${encodeURIComponent(cursor)}`, {
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
