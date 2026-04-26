export type AiUser = {
	id: string;
	email: string;
	role: string;
	displayName: string;
};

type AuthResponse =
	| { ok: true; user: AiUser }
	| { ok: false; error?: string };

export async function fetchAiSession() {
	const response = await fetch('/auth/me', {
		credentials: 'include'
	});

	const data = (await response.json().catch(() => null)) as AuthResponse | null;
	if (!response.ok || !data || !data.ok) return null;
	return data.user;
}

export async function loginAi(email: string, password: string) {
	const response = await fetch('/auth/login', {
		method: 'POST',
		credentials: 'include',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email, password })
	});

	const data = (await response.json().catch(() => null)) as AuthResponse | null;
	if (!response.ok || !data || !data.ok) {
		const message = data && !data.ok && 'error' in data ? data.error : '登录失败';
		throw new Error(message);
	}

	return data.user;
}

export async function logoutAi() {
	await fetch('/auth/logout', {
		method: 'POST',
		credentials: 'include'
	});
}
