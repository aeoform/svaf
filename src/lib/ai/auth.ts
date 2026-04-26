import { browser } from '$app/environment';

const TOKEN_KEY = 'ai-auth-token';

export function getAiToken() {
	if (!browser) return null;
	return localStorage.getItem(TOKEN_KEY);
}

export function setAiToken(token: string) {
	if (!browser) return;
	localStorage.setItem(TOKEN_KEY, token);
}

export function clearAiToken() {
	if (!browser) return;
	localStorage.removeItem(TOKEN_KEY);
}

export function createAiToken(email: string) {
	const cleanEmail = email.trim().toLowerCase();
	return `ai:${cleanEmail}:${Date.now()}`;
}
