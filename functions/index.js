function getAuthApiOrigin() {
	const raw = globalThis.process?.env?.AUTH_API_ORIGIN;
	if (typeof raw === 'string') {
		const value = raw.trim();
		if (value) return value;
	}

	return 'https://ai.aeoform.com';
}

const AUTH_API_ORIGIN = getAuthApiOrigin();

function json(body, init = {}) {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			...(init.headers || {})
		}
	});
}

function cookieAttrs(request) {
	const url = new URL(request.url);
	const secure = url.protocol === 'https:';
	return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function readCookie(request, name) {
	const cookie = request.headers.get('cookie') || '';
	const prefix = `${name}=`;
	const part = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(prefix));
	return part ? decodeURIComponent(part.slice(prefix.length)) : '';
}

async function fetchJsonWithTimeout(url, init = {}, timeoutMs = 20000) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);

	try {
		const response = await fetch(url, {
			...init,
			signal: controller.signal
		});
		const data = await response.json().catch(() => null);
		return { response, data };
	} finally {
		clearTimeout(timeout);
	}
}

async function proxyLogin(request) {
	const requestOrigin = new URL(request.url).origin;
	if (AUTH_API_ORIGIN === requestOrigin) {
		return json(
			{
				ok: false,
				error: 'auth backend misconfigured: AUTH_API_ORIGIN points to the same origin'
			},
			{ status: 500 }
		);
	}

	try {
		const body = await request.text();
		const { response: upstream, data } = await fetchJsonWithTimeout(
			`${AUTH_API_ORIGIN}/auth/login`,
			{
				method: 'POST',
				headers: {
					'content-type': request.headers.get('content-type') || 'application/json'
				},
				body
			}
		);
		if (!upstream.ok || !data || !data.ok || !data.token) {
			return json(data || { ok: false, error: 'login failed' }, { status: upstream.status || 502 });
		}

		const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
		headers.append('set-cookie', `ai-session=${encodeURIComponent(data.token)}; ${cookieAttrs(request)}`);

		return new Response(JSON.stringify({ ok: true, user: data.user }), {
			status: 200,
			headers
		});
	} catch (error) {
		const message =
			error instanceof Error && error.name === 'AbortError'
				? 'auth backend timeout'
				: 'auth backend unreachable';
		return json({ ok: false, error: message }, { status: 502 });
	}
}

async function proxyMe(request) {
	const requestOrigin = new URL(request.url).origin;
	if (AUTH_API_ORIGIN === requestOrigin) {
		return json(
			{
				ok: false,
				error: 'auth backend misconfigured: AUTH_API_ORIGIN points to the same origin'
			},
			{ status: 500 }
		);
	}

	const token = readCookie(request, 'ai-session');
	if (!token) {
		return json({ ok: false, error: 'missing token' }, { status: 401 });
	}

	try {
		const { response: upstream, data } = await fetchJsonWithTimeout(
			`${AUTH_API_ORIGIN}/auth/me`,
			{
				headers: {
					authorization: `Bearer ${token}`
				}
			}
		);

		if (!upstream.ok || !data || !data.ok) {
			return json(data || { ok: false, error: 'invalid token' }, { status: upstream.status || 502 });
		}

		return json({ ok: true, user: data.user });
	} catch (error) {
		const message =
			error instanceof Error && error.name === 'AbortError'
				? 'auth backend timeout'
				: 'auth backend unreachable';
		return json({ ok: false, error: message }, { status: 502 });
	}
}

async function proxyAiData(request, backendPath) {
	const requestOrigin = new URL(request.url).origin;
	if (AUTH_API_ORIGIN === requestOrigin) {
		return json(
			{
				ok: false,
				error: 'auth backend misconfigured: AUTH_API_ORIGIN points to the same origin'
			},
			{ status: 500 }
		);
	}

	const token = readCookie(request, 'ai-session');
	if (!token) {
		return json({ ok: false, error: 'missing token' }, { status: 401 });
	}

	try {
		const backendUrl = new URL(backendPath, AUTH_API_ORIGIN);
		backendUrl.search = new URL(request.url).search;

		const { response: upstream, data } = await fetchJsonWithTimeout(backendUrl.toString(), {
			headers: {
				authorization: `Bearer ${token}`
			}
		});

		if (!upstream.ok || !data || !data.ok) {
			return json(data || { ok: false, error: 'request failed' }, { status: upstream.status || 502 });
		}

		return json(data);
	} catch (error) {
		const message =
			error instanceof Error && error.name === 'AbortError'
				? 'auth backend timeout'
				: 'auth backend unreachable';
		return json({ ok: false, error: message }, { status: 502 });
	}
}

async function proxyAiEndpoint(request, backendPath) {
	const requestOrigin = new URL(request.url).origin;
	if (AUTH_API_ORIGIN === requestOrigin) {
		return json(
			{
				ok: false,
				error: 'auth backend misconfigured: AUTH_API_ORIGIN points to the same origin'
			},
			{ status: 500 }
		);
	}

	const token = readCookie(request, 'ai-session');
	if (!token) {
		return json({ ok: false, error: 'missing token' }, { status: 401 });
	}

	try {
		const backendUrl = new URL(backendPath, AUTH_API_ORIGIN);
		backendUrl.search = new URL(request.url).search;
		const method = request.method;
		const headers = {
			authorization: `Bearer ${token}`
		};
		let body;

		if (method !== 'GET' && method !== 'HEAD') {
			body = await request.text();
			headers['content-type'] = request.headers.get('content-type') || 'application/json';
		}

		const timeoutMs = backendPath === '/ai/chat/start' ? 45000 : 20000;
		const { response: upstream, data } = await fetchJsonWithTimeout(backendUrl.toString(), {
			method,
			headers,
			body
		}, timeoutMs);

		if (!upstream.ok || !data || !data.ok) {
			return json(data || { ok: false, error: 'request failed' }, { status: upstream.status || 502 });
		}

		return json(data);
	} catch (error) {
		const message =
			error instanceof Error && error.name === 'AbortError'
				? 'auth backend timeout'
				: 'auth backend unreachable';
		return json({ ok: false, error: message }, { status: 502 });
	}
}

function logout(request) {
	const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
	const attrs = cookieAttrs(request).replace('HttpOnly; ', '');
	headers.append('set-cookie', `ai-session=; Max-Age=0; ${attrs}`);
	return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export default {
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === '/auth/login' && request.method === 'POST') {
			return proxyLogin(request);
		}

		if (url.pathname === '/auth/me' && request.method === 'GET') {
			return proxyMe(request);
		}

		if (url.pathname === '/ai/conversations' && request.method === 'GET') {
			return proxyAiData(request, '/ai/conversations');
		}

		if (url.pathname === '/ai/chat/start' && request.method === 'POST') {
			return proxyAiEndpoint(request, '/ai/chat/start');
		}

		if (/^\/ai\/chat\/stream\/[^/]+$/.test(url.pathname) && request.method === 'GET') {
			return proxyAiEndpoint(request, url.pathname);
		}

		if (/^\/ai\/conversations\/\d+\/messages$/.test(url.pathname) && request.method === 'GET') {
			return proxyAiEndpoint(request, url.pathname);
		}

		if (url.pathname === '/ai/model-status' && request.method === 'GET') {
			return proxyAiEndpoint(request, '/ai/model-status');
		}

		if (url.pathname === '/auth/logout' && request.method === 'POST') {
			return logout(request);
		}

		return fetch(request);
	}
};
