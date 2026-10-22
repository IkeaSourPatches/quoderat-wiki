import { useEffect, useState } from 'react';
import bundled from '../../data/sai-puzzles.json';
import type { Language } from '../i18n';
import { conflicts, restoreColours, solved, type Puzzle } from './rules';
import './game.css';

const puzzles = bundled as Puzzle[];
const paints = ['#b65e50','#c6a451','#46858a','#8876a5'];
const apiBase = (import.meta as unknown as {env:Record<string,string>}).env.VITE_API_BASE;
const api = apiBase ? apiBase.replace(/\/$/, '') : '/api';
const storageKey = 'quoderat-sai-v1';
function loadProgress(): Record<string, number[]> {
  try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
export function SaiGame({language, open}: {language:Language;open:(slug:string)=>void}) {
  const text = (en:string,zh:string) => language === 'zh' ? zh : en;
  const [progress,setProgress] = useState(loadProgress);
  const [index,setIndex] = useState(0);
  const puzzle = puzzles[index];
  const [colours,setColours] = useState(() => restoreColours(loadProgress()[puzzles[0].id],puzzles[0].regions.length));
  const [history,setHistory] = useState<number[][]>([]);
  const [paint,setPaint] = useState(0);
  const [patterns,setPatterns] = useState(false);
  const [intro,setIntro] = useState(true);
  const [adStep,setAdStep] = useState(0);
  const [storageWarning,setStorageWarning] = useState(false);
  const [verification,setVerification] = useState('');
  const [daily,setDaily] = useState<{id:string;date:string}|null>(null);
  const collisions = conflicts(puzzle,colours);
  const won = solved(puzzle,colours);
  const completed = puzzles.filter(p => solved(p,restoreColours(progress[p.id],p.regions.length))).length;
  // Offline play never depends on the server; the daily puzzle is an optional enhancement.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${api}/game/daily/`,{signal:controller.signal}).then(r=>r.ok?r.json():null).then(value=>{if(value && puzzles.some(p=>p.id===value.id))setDaily(value);}).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  useEffect(() => {
    if (!intro) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {setAdStep(2);return;}
    const first=window.setTimeout(()=>setAdStep(1),650);
    const second=window.setTimeout(()=>setAdStep(2),1400);
    return ()=>{clearTimeout(first);clearTimeout(second);};
  },[intro]);
  useEffect(() => {
    try {localStorage.setItem(storageKey,JSON.stringify(progress));setStorageWarning(false);} catch {setStorageWarning(true);}
  },[progress]);
  useEffect(() => {
    setVerification('');
    if (!won) return;
    const controller=new AbortController();
    fetch(`${api}/game/validate/`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Offline');return r.json();}).then(({csrfToken})=>fetch(`${api}/game/validate/`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrfToken},body:JSON.stringify({id:puzzle.id,colours}),signal:controller.signal}))
      .then(r=>r.ok?r.json():null).then(result=>{if(result?.valid)setVerification('verified');else if(result)setVerification('rejected');}).catch(()=>{});
    return ()=>controller.abort();
  },[won,puzzle.id,colours]);
  function commit(next:number[]) {setColours(next);setProgress(old=>({...old,[puzzle.id]:next}));}
  function colourRegion(id:number) {if(colours[id]===paint)return;setHistory(old=>[...old,colours]);commit(colours.map((c,i)=>i===id?paint:c));}
  function selectPuzzle(i:number) {setIndex(i);setColours(restoreColours(progress[puzzles[i].id],puzzles[i].regions.length));setHistory([]);setVerification('');}
  const names = language==='zh'?['朱红','赭金','湖蓝','暮紫']:['Vermilion','Ochre','Teal','Violet'];
  const marks=['/','•','+','—'];
  return <div className="sai-game">
    <header className="game-heading"><p className="eyebrow">{text('QUODERAT / PLAY','证毕 / 游玩')}</p><h1>{text('Sai’s Impossible Advertisement','彩的不可能广告')}</h1><p>{text('Four colours. One map. Absolutely no need for a fifth.','四种颜色，一张地图。绝对不需要第五种。')}</p></header>
    {intro ? <section className="sai-ad"><div className="ad-copy"><small>{text('A MESSAGE FROM OUR VERY QUALIFIED SPONSOR','来自我们非常专业的赞助商')}</small><h2>{text('“Clearly, we need a fifth colour.”','“显然，我们需要第五种颜色。”')}</h2><p>{text('Sai has painted two neighbouring regions the same colour. Again. You could keep watching—or take the brush.','彩又把相邻的区域涂成了同一种颜色。你可以继续看，也可以抢过画笔。')}</p><button className="game-primary" onClick={()=>setIntro(false)}>{text('Give me that. I can do it.','给我，我来。')} →</button><p className="game-fineprint">{text('No timer. No real ads. No account needed.','不限时，无真实广告，无需账号。')}</p></div><svg className="ad-map" viewBox="0 0 220 220" aria-label={text('Sai’s deliberately incorrect map','彩故意涂错的地图')}><path d="M10 10H210L10 210Z" fill={adStep>=1?paints[0]:'#e5dcc5'}/><path d="M210 10V210H10Z" fill={adStep>=2?paints[0]:'#e5dcc5'}/><path d="M210 10L10 210" stroke={adStep===2?'#842d26':'#354b3b'} strokeWidth="5"/>{adStep===2&&<text x="110" y="130" textAnchor="middle" fontSize="74" fill="#fff5db">?</text>}</svg></section> : <>
    <div className="game-progress"><span>{text('Puzzle book','谜题册')} · {completed} / {puzzles.length} {text('complete','已完成')}</span>{daily&&<button onClick={()=>selectPuzzle(puzzles.findIndex(p=>p.id===daily.id))}>{text('Daily challenge','每日挑战')} · {daily.date} ↗</button>}</div>
    <nav className="puzzle-tabs" aria-label={text('Select a puzzle','选择谜题')}>{puzzles.map((p,i)=><button key={p.id} aria-pressed={index===i} onClick={()=>selectPuzzle(i)} title={p.title[language]}>{String(i+1).padStart(2,'0')}{solved(p,restoreColours(progress[p.id],p.regions.length))&&' ✓'}</button>)}</nav>
    <div className="game-layout"><section className="game-board"><div className="board-heading"><span>{String(index+1).padStart(2,'0')} / {String(puzzles.length).padStart(2,'0')}</span><h2>{puzzle.title[language]}</h2></div>
      <div className="paint-options">{paints.map((c,i)=><button key={c} aria-pressed={paint===i} onClick={()=>setPaint(i)}><span style={{background:c}}>{marks[i]}</span>{names[i]}{paint===i&&' ✓'}</button>)}</div>
      <svg className="puzzle-map" viewBox={`-12 -12 ${puzzle.width+24} ${puzzle.height+24}`} aria-label={text('Colour each numbered region. Tab to a region and press Enter or Space to paint.','为编号区域涂色。按 Tab 选择区域，按回车或空格涂色。')}>
        <defs>{paints.map((c,i)=><pattern key={c} id={`sai-pattern-${i}`} width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill={c}/>{i===0?<path d="M-3 3L3-3M0 14L14 0M11 17L17 11" stroke="#fff" opacity=".13"/>:i===1?<circle cx="7" cy="7" r="1.8" fill="#fff" opacity=".18"/>:i===2?<path d="M7 3V11M3 7H11" stroke="#fff" opacity=".16"/>:<path d="M0 7H14" stroke="#fff" opacity=".13"/>}</pattern>)}</defs>
        {puzzle.regions.map(r=>{const c=colours[r.id];const x=r.points.reduce((s,p)=>s+p[0],0)/r.points.length;const y=r.points.reduce((s,p)=>s+p[1],0)/r.points.length;return <g key={r.id}><polygon tabIndex={0} role="button" aria-label={`${text('Region','区域')} ${r.id+1}, ${c<0?text('unpainted','未涂色'):names[c]}`} points={r.points.map(p=>p.join(',')).join(' ')} fill={c<0?'#d9d5c7':patterns?`url(#sai-pattern-${c})`:paints[c]} stroke="#243932" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" onClick={()=>colourRegion(r.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();colourRegion(r.id);}}}/><circle cx={x} cy={y} r="10" fill="#20362f" fillOpacity=".87" stroke="#f5edda" strokeOpacity=".4" strokeWidth=".7" pointerEvents="none"/><text x={x} y={y} textAnchor="middle" dominantBaseline="central" pointerEvents="none" fontSize="11" fill="#fff8e8" fontFamily="Georgia, serif">{r.id+1}</text></g>})}
        {collisions.map(({regions,points})=><line key={regions.join('-')} x1={points[0][0]} y1={points[0][1]} x2={points[1][0]} y2={points[1][1]} stroke="#fff3bd" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeDasharray="6 4" pointerEvents="none"/>)}
      </svg>
      <div className="board-tools"><button disabled={!history.length} onClick={()=>{commit(history[history.length-1]);setHistory(h=>h.slice(0,-1));}}>{text('↶ Undo','↶ 撤销')}</button><button onClick={()=>{setHistory(h=>[...h,colours]);commit(Array(puzzle.regions.length).fill(-1));}}>{text('Reset map','重置地图')}</button><label><input type="checkbox" checked={patterns} onChange={e=>setPatterns(e.target.checked)}/>{text('Patterns','纹样')}</label></div>
    </section><aside className="sai-panel"><p className="eyebrow">{text('A WORD FROM SAI','彩有话说')}</p><p>{text('Select a colour, then paint a region. Regions sharing an edge must differ. Touching at a corner is fine.','先选颜色，再点区域。共边区域不能同色；只在角上相接则可以。')}</p>
    <div className="sai-speech"><small>{text('SAI / THE BORDER-BAITER','彩 / 诱边人')}</small><p>{won?text('“An excellent demonstration. My advertisement worked perfectly.”','“精彩的示范。我的广告效果完美。”'):collisions.length?text('“Those two are neighbours. A technicality, surely.”','“那两个是邻居。只是个技术细节，对吧。”'):text('“Take your time. Every second is excellent engagement.”','“慢慢来。每一秒都是上好的参与度。”')}</p></div>
    <div className={`game-status ${won?'is-solved':''}`} role="status" aria-live="polite">{won?<><strong>□ Q.E.D.</strong><p>{text('Every border agrees. Map complete.','边界再无冲突，地图完成。')}</p>{puzzle.id==='the-fourth-colour'&&<p>{text('Five regions form an odd cycle: the ring needs three colours. The centre touches them all, so a fourth is unavoidable.','外围五区构成奇环，至少需要三种颜色。中央与五区都共边，因此第四种颜色不可避免。')}</p>}{index<puzzles.length-1?<button className="game-primary" onClick={()=>selectPuzzle(index+1)}>{text('Next puzzle','下一题')} →</button>:<p>{text('You finished this map. Revisit the book to complete any remaining puzzles.','此图已完成。可返回谜题册完成其余谜题。')}</p>} <small>{verification==='verified'?text('Solution verified by the server.','服务器已验证解答。'):verification==='rejected'?text('Server validation disagreed. Your local progress is saved.','服务器验证结果不一致。本地进度已保存。'):text('Checked on this device.','已在本机验证。')}</small></>:<p>{colours.filter(c=>c>=0).length} / {colours.length} {text('painted','已涂色')} · {collisions.length} {text('border conflicts','处边界冲突')}</p>}</div>
    </aside></div>{storageWarning&&<p role="status">{text('Browser storage is unavailable. You can play, but progress will not survive a reload.','浏览器存储不可用，刷新后将无法保留进度。')}</p>}</>}
    <footer className="game-footnote"><span>{text('Puzzle maps and dialogue are game adaptations, not canonical geography.','谜题地图与对白为游戏改编，并非正式地理设定。')}</span><button onClick={()=>open('sai')}>{text('Meet Sai','认识彩')} ↗</button></footer>
  </div>;
}
