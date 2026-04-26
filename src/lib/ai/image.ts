export type AiImageStatus = {
	enabled: boolean;
	model: string;
	size: string;
	baseUrl: string;
	path: string;
	variables: Record<string, boolean>;
};

export type AiImageResult = {
	imageUrl: string;
	model: string;
	size: string;
	raw: unknown;
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

export async function fetchAiImageStatus() {
	const response = await fetch('/ai/image-status', {
		credentials: 'include'
	});

	const data = await readJson<ApiSuccess<{ status: AiImageStatus }>>(
		response,
		'无法获取生图状态'
	);

	return data.status;
}

export async function generateAiImage(payload: {
	prompt: string;
	model?: string;
	size?: string;
}) {
	const response = await fetch('/ai/image/generate', {
		method: 'POST',
		credentials: 'include',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			prompt: payload.prompt,
			model: payload.model || 'qwen-image-2.0',
			size: payload.size || '1024*1024'
		})
	});

	const data = await readJson<ApiSuccess<{ image: AiImageResult }>>(
		response,
		'无法生成图片'
	);

	return data.image;
}
