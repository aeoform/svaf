const AUTH_API_ORIGIN = process.env.AUTH_API_ORIGIN || 'https://ai.aeoform.com';

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

	const body = await request.text();
	const upstream = await fetch(`${AUTH_API_ORIGIN}/auth/login`, {
		method: 'POST',
		headers: {
			'content-type': request.headers.get('content-type') || 'application/json'
		},
		body
	});
	const data = await upstream.json().catch(() => null);
	if (!upstream.ok || !data || !data.ok || !data.token) {
		return json(data || { ok: false, error: 'login failed' }, { status: upstream.status || 401 });
	}

	const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
	headers.append('set-cookie', `ai-session=${encodeURIComponent(data.token)}; ${cookieAttrs(request)}`);

	return new Response(JSON.stringify({ ok: true, user: data.user }), {
		status: 200,
		headers
	});
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

	const upstream = await fetch(`${AUTH_API_ORIGIN}/auth/me`, {
		headers: {
			authorization: `Bearer ${token}`
		}
	});

	const data = await upstream.json().catch(() => null);
	if (!upstream.ok || !data || !data.ok) {
		return json(data || { ok: false, error: 'invalid token' }, { status: upstream.status || 401 });
	}

	return json({ ok: true, user: data.user });
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

		if (url.pathname === '/auth/logout' && request.method === 'POST') {
			return logout(request);
		}

		return fetch(request);
	}
};
