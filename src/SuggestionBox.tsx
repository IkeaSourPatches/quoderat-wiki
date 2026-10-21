import { useState, type FormEvent } from 'react';
import type { Language } from './i18n';

export function SuggestionBox({ language }: { language: Language }) {
  const zh = language === 'zh';
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const base = ((import.meta as unknown as {env: Record<string,string>}).env.VITE_API_BASE || '/api').replace(/\/$/, '');
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus('sending');
    try {
      const tokenResponse = await fetch(`${base}/suggestions/`, { credentials: 'same-origin' });
      if (!tokenResponse.ok) throw new Error();
      const { csrfToken } = await tokenResponse.json();
      const response = await fetch(`${base}/suggestions/`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ name, message }),
      });
      if (!response.ok) throw new Error();
      setStatus('sent'); setMessage('');
    } catch { setStatus('error'); }
  }
  return <section className="suggestion-box"><div><p className="eyebrow">{zh ? '为这个世界留一句话' : 'A NOTE FOR THIS WORLD'}</p><h2>{zh ? '你看见了什么可能？' : 'What could this world become?'}</h2><p>{zh ? '分享想法、提出问题，或指出设定中的疑点。建议会私下交给作者，不会公开发布。' : 'Share an idea, ask a question, or point out a detail worth revisiting. Suggestions go privately to the author.'}</p></div><form onSubmit={submit}><label>{zh ? '名字（选填）' : 'Name (optional)'}<input maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={status==='sending'}/></label><label>{zh ? '你的建议' : 'Your suggestion'}<textarea required maxLength={3000} rows={5} value={message} onChange={e=>{setMessage(e.target.value);if(status!=='sending')setStatus('idle')}} disabled={status==='sending'}/></label><button disabled={status==='sending' || !message.trim()}>{status==='sending' ? (zh?'提交中…':'Sending…') : (zh?'提交建议 ↗':'Send suggestion ↗')}</button><p role="status">{status==='sent' ? (zh?'已收到，谢谢你的建议。':'Received. Thank you for your suggestion.') : status==='error' ? (zh?'暂时无法提交，请稍后重试。你的文字仍保留在此处。':'Could not send right now. Please retry later; your text is still here.') : ''}</p></form></section>;
}
