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

export type AiListResponse<T> = {
	hasMore: boolean;
	nextOffset: number;
} & T;

type ApiSuccess<T> = { ok: true } & T;
type ApiFailure = { ok: false; error?: string };

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
	const conversations: AiConversation[] = [];
	let offset = 0;

	while (true) {
		const params = new URLSearchParams();
		if (moduleSlug) params.set('module', moduleSlug);
		params.set('limit', '200');
		params.set('offset', String(offset));
		const query = params.toString() ? `?${params.toString()}` : '';

		const response = await fetch(`/ai/conversations${query}`, {
			credentials: 'include'
		});

		const data = await readJson<
			ApiSuccess<AiListResponse<{ conversations: AiConversation[] }>>
		>(response, '无法获取历史对话');

		conversations.push(...data.conversations);
		if (!data.hasMore || !data.conversations.length) break;
		offset = data.nextOffset;
	}

	return conversations;
}

export async function fetchAiConversationMessages(conversationId: string) {
	const messages: AiMessage[] = [];
	let conversation: AiConversation | null = null;
	let offset = 0;

	while (true) {
		const response = await fetch(
			`/ai/conversations/${conversationId}/messages?limit=400&offset=${offset}`,
			{
				credentials: 'include'
			}
		);

		const data = await readJson<
			ApiSuccess<
				AiListResponse<{ messages: AiMessage[]; conversation: AiConversation }>
			>
		>(response, '无法获取消息');

		conversation = data.conversation;
		messages.push(...data.messages);
		if (!data.hasMore || !data.messages.length) break;
		offset = data.nextOffset;
	}

	if (!conversation) {
		throw new Error('无法获取消息');
	}

	return {
		conversation,
		messages
	};
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
