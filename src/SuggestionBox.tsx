import { useEffect, useState, type FormEvent } from 'react';
import type { Language } from './i18n';

// Decorative suggestions only: these are never submitted as the visitor's name.
const visitorRoles = {
  en: ['A visitor to this world', 'A curious traveller', 'A seeker of answers', 'A voice from beyond'],
  zh: ['一位来访者', '一位好奇的旅人', '一位求索者', '一个来自世界之外的声音'],
};

export function SuggestionBox({ language }: { language: Language }) {
  const zh = language === 'zh';
  const [name, setName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [roleText, setRoleText] = useState(visitorRoles[language][0]);
  // Restart on locale changes; clean up timers when leaving the page or typing.
  useEffect(() => {
    const roles = visitorRoles[language];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    let index = 0,
      length = roles[0].length,
      deleting = true;
    const tick = () => {
      length += deleting ? -1 : 1;
      setRoleText(roles[index].slice(0, length));
      let delay = deleting ? 45 : 85;
      if (length === 0) {
        index = (index + 1) % roles.length;
        deleting = false;
        delay = 300;
      } else if (length === roles[index].length && !deleting) {
        deleting = true;
        delay = 2200;
      }
      timer = setTimeout(tick, delay);
    };
    const restart = () => {
      clearTimeout(timer);
      index = 0;
      length = roles[0].length;
      deleting = true;
      setRoleText(roles[0]);
      if (!motion.matches && !name && !nameFocused) timer = setTimeout(tick, 2200);
    };
    restart();
    motion.addEventListener('change', restart);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener('change', restart);
    };
  }, [language, name, nameFocused]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limited'>('idle');
  const base = ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE || '/api').replace(
    /\/$/,
    '',
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');
    try {
      const tokenResponse = await fetch(`${base}/suggestions/`, { credentials: 'same-origin' });
      if (!tokenResponse.ok) throw new Error();
      const { csrfToken } = await tokenResponse.json();
      const response = await fetch(`${base}/suggestions/`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ name, message }),
      });
      if (response.status === 429) {
        setStatus('limited');
        return;
      }
      if (!response.ok) throw new Error();
      setStatus('sent');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }
  return (
    <section className="correspondence-page">
      <header className="letter-heading">
        <p className="eyebrow">EPISTULAE · QUODERAT</p>
        <h1>{zh ? '致世界的作者' : 'A letter to the author'}</h1>
        <p className="letter-subtitle">
          {zh ? '每一个问题，都可能打开另一种可能。' : 'Every question opens another possibility.'}
        </p>
        <p>
          {zh
            ? '关于证毕的疑问、尚未成形的想法，或设定中值得细看的地方，都可以写在这里。'
            : 'A question about Quoderat, an unfinished idea, or a detail that deserves a closer look. There is room for all of them here.'}
        </p>
      </header>
      <form className="letter-paper" onSubmit={submit} aria-busy={status === 'sending'}>
        <div className="letter-address">
          <span>Correspondence / 01</span>
          <span>{zh ? '致 · Axiom' : 'To · Axiom'}</span>
        </div>
        <label>
          {zh ? '如何称呼你' : 'What should I call you?'}
          <small>{zh ? '选填 · 留空亦可' : 'Optional · anonymous is welcome'}</small>
          <span className="visitor-name-field">
            <input
              autoComplete="nickname"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={status === 'sending'}
            />
            {!name && !nameFocused && (
              <span className="dynamic-role" aria-hidden="true">
                {roleText}
              </span>
            )}
          </span>
        </label>
        <label>
          {zh ? '你想说些什么？' : 'What is on your mind?'}
          <textarea
            required
            maxLength={3000}
            rows={7}
            placeholder={zh ? '我在想……' : 'I have been wondering…'}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (status !== 'sending') setStatus('idle');
            }}
            disabled={status === 'sending'}
          />
        </label>
        <div className="letter-signature">
          <span>&#x220E; Q.E.D.</span>
          <small>{message.length.toLocaleString()} / 3,000</small>
        </div>
        <div className="letter-send">
          <span className="wax-seal" aria-hidden="true">
            Q
          </span>
          <button disabled={status === 'sending' || !message.trim()}>
            {status === 'sending' ? (zh ? '正在寄出…' : 'Sending…') : zh ? '封缄并寄出 ↗' : 'Seal & send ↗'}
          </button>
        </div>
        <p className={`letter-status ${status}`} role="status">
          {status === 'sent'
            ? zh
              ? '信已送达。谢谢你为这个世界留下的想法。'
              : 'Your letter has arrived. Thank you for adding your voice to this world.'
            : status === 'limited'
              ? zh
                ? '今天的信件已经够多了。文字已保留，请过一会儿再寄。'
                : 'The post is full for now. Your text is still here; please try again later.'
              : status === 'error'
                ? zh
                  ? '暂时未能寄出。文字已保留，请稍后重试。'
                  : 'Your letter could not be sent. Your text is still here; please try again.'
                : ''}
        </p>
      </form>
      <p className="letter-privacy">
        {zh
          ? '仅作者可在管理后台阅读。不会公开发布，也不需要提供邮箱。'
          : 'Read privately by the author in the admin panel. Not published publicly. No email required.'}
      </p>
    </section>
  );
}
