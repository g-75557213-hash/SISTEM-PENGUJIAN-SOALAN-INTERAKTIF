import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

interface HtmlCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

interface Token {
  text: string;
  className: string;
}

const JS_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'null', 'of', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield'
]);

const JS_GLOBALS = new Set([
  'window', 'document', 'console', 'Math', 'Array', 'Object', 'String', 'Number',
  'Boolean', 'JSON', 'Promise', 'Set', 'Map', 'Date', 'AudioContext', 'webkitAudioContext',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame',
  'alert', 'fetch', 'localStorage'
]);

function tokenizeJS(code: string): Token[] {
  const tokens: Token[] = [];
  const regex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b(?=\s*\()|\b[A-Za-z_$][\w$]*\b|[{}()[\].,:;?+\-*/%=!<>&|^~]+)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ text: code.slice(lastIdx, match.index), className: 'text-slate-200' });
    }
    const val = match[0];
    if (val.startsWith('//') || val.startsWith('/*')) {
      tokens.push({ text: val, className: 'text-slate-500 italic' });
    } else if (val.startsWith('`') || val.startsWith('"') || val.startsWith("'")) {
      tokens.push({ text: val, className: 'text-emerald-400' });
    } else if (/^\d/.test(val)) {
      tokens.push({ text: val, className: 'text-orange-400' });
    } else if (JS_KEYWORDS.has(val)) {
      tokens.push({ text: val, className: 'text-purple-400 font-semibold' });
    } else if (JS_GLOBALS.has(val)) {
      tokens.push({ text: val, className: 'text-amber-300' });
    } else if (/^[A-Za-z_$][\w$]*$/.test(val)) {
      const nextChar = code[regex.lastIndex];
      if (nextChar === '(') {
        tokens.push({ text: val, className: 'text-sky-400' });
      } else {
        tokens.push({ text: val, className: 'text-slate-200' });
      }
    } else {
      tokens.push({ text: val, className: 'text-cyan-400' });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < code.length) {
    tokens.push({ text: code.slice(lastIdx), className: 'text-slate-200' });
  }
  return tokens;
}

function tokenizeCSS(code: string): Token[] {
  const tokens: Token[] = [];
  const regex = /(\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|@[a-zA-Z-]+|#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|s|ms|deg|fr)?\b|[a-zA-Z-]+(?=\s*:)|[.#][a-zA-Z_-][\w-]*|[{}();:,])/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ text: code.slice(lastIdx, match.index), className: 'text-slate-200' });
    }
    const val = match[0];
    if (val.startsWith('/*')) {
      tokens.push({ text: val, className: 'text-slate-500 italic' });
    } else if (val.startsWith('"') || val.startsWith("'")) {
      tokens.push({ text: val, className: 'text-emerald-400' });
    } else if (val.startsWith('@')) {
      tokens.push({ text: val, className: 'text-purple-400 font-semibold' });
    } else if (val.startsWith('#') && /^#[0-9a-fA-F]{3,8}$/.test(val)) {
      tokens.push({ text: val, className: 'text-orange-400' });
    } else if (val.startsWith('.') || val.startsWith('#')) {
      tokens.push({ text: val, className: 'text-amber-300' });
    } else if (/^\d/.test(val)) {
      tokens.push({ text: val, className: 'text-orange-300' });
    } else if (/^[a-zA-Z-]+$/.test(val)) {
      tokens.push({ text: val, className: 'text-sky-300' });
    } else {
      tokens.push({ text: val, className: 'text-slate-400' });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < code.length) {
    tokens.push({ text: code.slice(lastIdx), className: 'text-slate-200' });
  }
  return tokens;
}

function tokenizeTagContent(tagString: string): Token[] {
  const tokens: Token[] = [];
  // Matches `<`, `</`, tag name, attributes, `="value"`, `>`, `/>`
  const openMatch = tagString.match(/^(<\/?)([A-Za-z0-9:-]+)([\s\S]*?)(\/?>)$/);
  if (!openMatch) {
    return [{ text: tagString, className: 'text-rose-400' }];
  }

  const [, openBracket, tagName, attrs, closeBracket] = openMatch;
  tokens.push({ text: openBracket, className: 'text-slate-500' });
  tokens.push({ text: tagName, className: 'text-rose-400 font-semibold' });

  if (attrs) {
    const attrRegex = /(\s+)([A-Za-z0-9_:@.-]+)(\s*=\s*)("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s"'>]+)|(\s+)([A-Za-z0-9_:@.-]+)/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(attrs)) !== null) {
      if (m.index > lastIdx) {
        tokens.push({ text: attrs.slice(lastIdx, m.index), className: 'text-slate-300' });
      }
      if (m[2]) {
        tokens.push({ text: m[1], className: '' });
        tokens.push({ text: m[2], className: 'text-amber-300' });
        tokens.push({ text: m[3], className: 'text-slate-400' });
        tokens.push({ text: m[4], className: 'text-emerald-400' });
      } else if (m[6]) {
        tokens.push({ text: m[5], className: '' });
        tokens.push({ text: m[6], className: 'text-amber-300' });
      }
      lastIdx = attrRegex.lastIndex;
    }
    if (lastIdx < attrs.length) {
      tokens.push({ text: attrs.slice(lastIdx), className: 'text-slate-300' });
    }
  }

  tokens.push({ text: closeBracket, className: 'text-slate-500' });
  return tokens;
}

function tokenizeHTML(code: string): Token[] {
  if (!code) return [];
  const tokens: Token[] = [];
  const regex = /(<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<\/?[A-Za-z0-9:-]+(?:\s+(?:"[^"]*"|'[^']*'|[^>"'])*)?\s*\/?>)/gi;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ text: code.slice(lastIdx, match.index), className: 'text-slate-100' });
    }
    const block = match[0];
    const lower = block.toLowerCase();

    if (block.startsWith('<!--')) {
      tokens.push({ text: block, className: 'text-slate-500 italic' });
    } else if (lower.startsWith('<!doctype')) {
      tokens.push({ text: block, className: 'text-purple-400 font-semibold' });
    } else if (lower.startsWith('<style')) {
      const m = block.match(/^(<style\b[^>]*>)([\s\S]*?)(<\/style>)$/i);
      if (m) {
        tokens.push(...tokenizeTagContent(m[1]));
        tokens.push(...tokenizeCSS(m[2]));
        tokens.push(...tokenizeTagContent(m[3]));
      } else {
        tokens.push({ text: block, className: 'text-rose-400' });
      }
    } else if (lower.startsWith('<script')) {
      const m = block.match(/^(<script\b[^>]*>)([\s\S]*?)(<\/script>)$/i);
      if (m) {
        tokens.push(...tokenizeTagContent(m[1]));
        tokens.push(...tokenizeJS(m[2]));
        tokens.push(...tokenizeTagContent(m[3]));
      } else {
        tokens.push({ text: block, className: 'text-rose-400' });
      }
    } else {
      tokens.push(...tokenizeTagContent(block));
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < code.length) {
    tokens.push({ text: code.slice(lastIdx), className: 'text-slate-100' });
  }
  return tokens;
}

export const HtmlCodeEditor: React.FC<HtmlCodeEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  isGenerating = false,
  placeholder = '<!-- Tampal kod HTML interaktif anda di sini... -->',
  textareaRef
}) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const [copied, setCopied] = useState(false);

  const activeTextareaRef = textareaRef || internalTextareaRef;

  const tokens = useMemo(() => tokenizeHTML(value), [value]);

  // Keep <pre> scroll synced whenever value changes (especially during real-time streaming)
  useEffect(() => {
    const ta = activeTextareaRef.current;
    const pre = preRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }, [value, activeTextareaRef]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div
      className={`flex-1 min-h-[400px] lg:min-h-[480px] flex flex-col rounded-xl overflow-hidden border transition ${
        isGenerating
          ? 'border-indigo-500 ring-2 ring-indigo-300 shadow-md bg-[#0b1120]'
          : 'border-slate-800 bg-[#0d1117] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 shadow-inner'
      }`}
    >
      {/* IDE Header Bar */}
      <div className="px-3 py-1.5 bg-[#161b22] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90"></span>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-300 ml-1">
            index.html
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
            HTML5 • CSS • JS
          </span>
        </div>

        {value.trim().length > 0 && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">Disalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Salin</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Synchronized Layered Syntax Highlighting Surface */}
      <div className="relative flex-1 min-h-[360px] lg:min-h-[440px] w-full overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full m-0 p-3.5 overflow-y-auto overflow-x-hidden pointer-events-none font-mono text-[12px] leading-[1.6] whitespace-pre-wrap break-words"
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            tabSize: 2,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            scrollbarGutter: 'stable',
          }}
        >
          {value ? (
            <>
              {tokens.map((tok, i) => (
                <span key={i} className={tok.className}>
                  {tok.text}
                </span>
              ))}
              {value.endsWith('\n') ? ' ' : ''}
            </>
          ) : (
            <span className="text-slate-500 italic">{placeholder}</span>
          )}
        </pre>

        <textarea
          ref={activeTextareaRef}
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          onScroll={handleScroll}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Kod HTML Soalan"
          className="absolute inset-0 z-10 w-full h-full m-0 p-3.5 overflow-y-auto overflow-x-hidden bg-transparent text-transparent caret-amber-300 selection:bg-indigo-500/40 selection:text-transparent font-mono text-[12px] leading-[1.6] whitespace-pre-wrap break-words resize-none outline-none"
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            tabSize: 2,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            scrollbarGutter: 'stable',
          }}
        />
      </div>
    </div>
  );
};
