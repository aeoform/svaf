import MarkdownIt from 'markdown-it';

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function mathPlugin(md: MarkdownIt) {
	md.inline.ruler.after('escape', 'ai_math_inline', (state, silent) => {
		const start = state.pos;
		const max = state.posMax;
		if (state.src.charCodeAt(start) !== 0x24 /* $ */) return false;

		const isDouble = start + 1 < max && state.src.charCodeAt(start + 1) === 0x24;
		const marker = isDouble ? '$$' : '$';
		let pos = start + marker.length;
		let end = -1;

		while (pos < max) {
			end = state.src.indexOf(marker, pos);
			if (end < 0) return false;

			let backslashCount = 0;
			for (let i = end - 1; i >= 0 && state.src.charCodeAt(i) === 0x5c /* \\ */; i--) {
				backslashCount += 1;
			}

			if (backslashCount % 2 === 0) break;
			pos = end + marker.length;
		}

		if (end < 0) return false;

		const content = state.src.slice(start + marker.length, end);
		if (!content.trim()) return false;
		if (content.startsWith(' ') || content.endsWith(' ')) return false;

		if (silent) return true;

		const token = state.push(isDouble ? 'ai_math_inline_double' : 'ai_math_inline', 'math', 0);
		token.content = content;
		state.pos = end + marker.length;
		return true;
	});

	md.block.ruler.before('fence', 'ai_math_block', (state, startLine, endLine, silent) => {
		const start = state.bMarks[startLine] + state.tShift[startLine];
		const max = state.eMarks[startLine];
		const firstLine = state.src.slice(start, max).trim();
		if (firstLine !== '$$') return false;

		let nextLine = startLine + 1;
		while (nextLine < endLine) {
			const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
			const lineEnd = state.eMarks[nextLine];
			if (state.src.slice(lineStart, lineEnd).trim() === '$$') break;
			nextLine += 1;
		}

		if (nextLine >= endLine) return false;
		if (silent) return true;

		const token = state.push('ai_math_block', 'math', 0);
		token.block = true;
		token.content = state.getLines(startLine + 1, nextLine, 0, false).trim();
		token.map = [startLine, nextLine + 1];
		state.line = nextLine + 1;
		return true;
	});

	md.renderer.rules.ai_math_inline = (tokens, index) =>
		`<span class="ai-math-inline">${escapeHtml(tokens[index].content || '')}</span>`;

	md.renderer.rules.ai_math_inline_double = (tokens, index) =>
		`<span class="ai-math-inline ai-math-inline-double">${escapeHtml(tokens[index].content || '')}</span>`;

	md.renderer.rules.ai_math_block = (tokens, index) =>
		`<div class="ai-math-block">${escapeHtml(tokens[index].content || '').replaceAll('\n', '<br />')}</div>`;
}

const aiMarkdown = new MarkdownIt({
	html: false,
	linkify: true,
	breaks: true
}).use(mathPlugin);

export function renderAiMarkdown(content: string) {
	return aiMarkdown.render(String(content || '').trim());
}
