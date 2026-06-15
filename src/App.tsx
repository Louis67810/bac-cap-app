import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, BookOpen, CalendarDays, Check, ChevronRight, Flame, GraduationCap,
  Home, Layers3, RotateCcw, Search, Sparkles, Target, X,
} from 'lucide-react'
import rawTexts from './data/texts.json'
import { syncProgress } from './lib/supabase'
import './App.css'

type Analysis = { procedure: string; citation: string; line: string; interpretation: string }
type Movement = { number: number; title: string; summary: string; idea: string; analyses: Analysis[] }
type Card = { id: string; kind: string; movement?: number; question: string; answer: string }
type TextData = {
  id: string; title: string; author: string; work: string; family: string; situation: string;
  problem: string; bilan: string; opening: string; transcription: string; photoPaths: string[];
  movements: Movement[]; cards: Card[];
}
type Progress = Record<string, { known: string[]; attempts: number }>
type Session = { scope: string; queue: string[]; retry: string[]; known: string[]; current: number }
type View = { page: 'home' | 'sheets' | 'plan' | 'text' | 'learn'; textId?: string }

const texts = rawTexts as TextData[]
const STORAGE_KEY = 'cap-progress-v1'
const SESSION_KEY = 'cap-session-v1'
const DEVICE_KEY = 'cap-device-v1'

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}

function App() {
  const [view, setView] = useState<View>({ page: 'home' })
  const [progress, setProgress] = useState<Progress>(() => load(STORAGE_KEY, {}))
  const [session, setSession] = useState<Session | null>(() => load(SESSION_KEY, null))
  const [filter, setFilter] = useState('')
  const [family, setFamily] = useState('Toutes les familles')
  const [deviceId] = useState(() => {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, created)
    return created
  })

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)), [progress])
  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  }, [session])
  useEffect(() => {
    const timer = window.setTimeout(() => void syncProgress(deviceId, { progress, session }), 800)
    return () => window.clearTimeout(timer)
  }, [deviceId, progress, session])

  const percent = (text: TextData) => Math.round(((progress[text.id]?.known.length || 0) / text.cards.length) * 100)
  const startLearning = (textIds: string[], resume = false) => {
    const scope = textIds.join(',')
    if (resume && session?.scope === scope) return setView({ page: 'learn' })
    const queue = texts.filter(t => textIds.includes(t.id)).flatMap(t => t.cards.map(c => `${t.id}:${c.id}`))
    setSession({ scope, queue, retry: [], known: [], current: 0 })
    setView({ page: 'learn' })
  }

  const navigate = (page: View['page']) => setView({ page })
  const selected = texts.find(t => t.id === view.textId)

  return (
    <div className="app-shell">
      {view.page !== 'learn' && <Header onLearnAll={() => startLearning(texts.map(t => t.id), session?.scope === texts.map(t => t.id).join(','))} />}
      <main>
        {view.page === 'home' && <HomePage texts={texts} percent={percent} progress={progress} onText={id => setView({ page: 'text', textId: id })} onLearn={id => startLearning([id], session?.scope === id)} onLearnAll={() => startLearning(texts.map(t => t.id), false)} />}
        {view.page === 'sheets' && <SheetsPage texts={texts} filter={filter} family={family} setFilter={setFilter} setFamily={setFamily} onText={id => setView({ page: 'text', textId: id })} onLearn={id => startLearning([id], false)} />}
        {view.page === 'plan' && <PlanPage texts={texts} percent={percent} onLearn={ids => startLearning(ids, false)} />}
        {view.page === 'text' && selected && <TextPage text={selected} percent={percent(selected)} onBack={() => navigate('home')} onLearn={() => startLearning([selected.id], session?.scope === selected.id)} />}
        {view.page === 'learn' && session && <LearnPage texts={texts} session={session} setSession={setSession} setProgress={setProgress} onClose={() => navigate('home')} />}
      </main>
      {view.page !== 'learn' && <BottomNav page={view.page} navigate={navigate} />}
    </div>
  )
}

function Header({ onLearnAll }: { onLearnAll: () => void }) {
  return <header className="topbar">
    <div className="brand"><span className="brand-mark"><GraduationCap size={20} /></span><div><strong>CAP.</strong><small>Oral de français</small></div></div>
    <button className="primary compact" onClick={onLearnAll}><Sparkles size={16} /> Tout apprendre</button>
  </header>
}

function BottomNav({ page, navigate }: { page: string; navigate: (page: View['page']) => void }) {
  return <nav className="bottom-nav">
    <NavButton active={page === 'home'} icon={<Home />} label="Accueil" onClick={() => navigate('home')} />
    <NavButton active={page === 'sheets'} icon={<BookOpen />} label="Fiches" onClick={() => navigate('sheets')} />
    <NavButton active={page === 'plan'} icon={<CalendarDays />} label="Planning" onClick={() => navigate('plan')} />
  </nav>
}
function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>
}

function HomePage({ texts, percent, progress, onText, onLearn, onLearnAll }: { texts: TextData[]; percent: (t: TextData) => number; progress: Progress; onText: (id: string) => void; onLearn: (id: string) => void; onLearnAll: () => void }) {
  const mastered = texts.filter(t => percent(t) === 100).length
  const started = texts.filter(t => (progress[t.id]?.attempts || 0) > 0).length
  return <div className="page">
    <section className="hero-panel">
      <div><span className="eyebrow"><Flame size={14} /> OBJECTIF ORAL</span><h1>Maîtrise tes <em>16 textes.</em></h1><p>Une méthode simple : comprends le mouvement, mémorise les procédés, valide chaque texte à 100 %.</p></div>
      <button className="primary hero-button" onClick={onLearnAll}><Sparkles size={19} /> Tout apprendre <ChevronRight size={18} /></button>
    </section>
    <section className="stats-grid">
      <Stat label="Textes validés" value={`${mastered}/16`} icon={<Check />} />
      <Stat label="En cours" value={`${started - mastered}`} icon={<Target />} />
      <Stat label="Cartes disponibles" value={`${texts.reduce((n, t) => n + t.cards.length, 0)}`} icon={<Layers3 />} />
    </section>
    <SectionTitle title="Tes textes" subtitle="Valide toutes les cartes pour maîtriser un texte." />
    <div className="text-grid">{texts.map(t => <TextCard key={t.id} text={t} percent={percent(t)} onText={onText} onLearn={onLearn} />)}</div>
  </div>
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="stat-card"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>
}
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>
}
function TextCard({ text, percent, onText, onLearn }: { text: TextData; percent: number; onText: (id: string) => void; onLearn: (id: string) => void }) {
  return <article className="text-card">
    <div className="card-top"><span className="number">{text.id}</span><span className={`status ${percent === 100 ? 'done' : ''}`}>{percent === 100 ? 'Validé' : percent ? 'En cours' : 'À commencer'}</span></div>
    <span className="family">{text.family}</span><h3>{text.title}</h3><p>{text.author}</p>
    <Progress value={percent} />
    <div className="card-actions"><button className="secondary" onClick={() => onText(text.id)}>Voir la fiche</button><button className="primary" onClick={() => onLearn(text.id)}>Apprendre</button></div>
  </article>
}
function Progress({ value }: { value: number }) {
  return <div className="progress-block"><div><span>Maîtrise</span><strong>{value} %</strong></div><div className="progress-track"><span style={{ width: `${value}%` }} /></div></div>
}

function SheetsPage({ texts, filter, family, setFilter, setFamily, onText, onLearn }: { texts: TextData[]; filter: string; family: string; setFilter: (s: string) => void; setFamily: (s: string) => void; onText: (id: string) => void; onLearn: (id: string) => void }) {
  const families = ['Toutes les familles', ...new Set(texts.map(t => t.family))]
  const shown = texts.filter(t => (family === families[0] || t.family === family) && `${t.title} ${t.author}`.toLowerCase().includes(filter.toLowerCase()))
  return <div className="page"><SectionTitle title="Fiches CAP" subtitle="Des fiches bristol numériques, fidèles à tes analyses." />
    <div className="filters"><label><Search size={17} /><input placeholder="Rechercher un texte..." value={filter} onChange={e => setFilter(e.target.value)} /></label><select value={family} onChange={e => setFamily(e.target.value)}>{families.map(f => <option key={f}>{f}</option>)}</select></div>
    <div className="sheet-list">{shown.map(t => <article className="sheet-row" key={t.id}><span className="number">{t.id}</span><div><span className="family">{t.family}</span><h3>{t.title}</h3><p>{t.author} · {t.movements.length} mouvements · {t.cards.length} cartes</p></div><div className="row-actions"><button className="secondary" onClick={() => onText(t.id)}>Lire</button><button className="primary" onClick={() => onLearn(t.id)}>Apprendre</button></div></article>)}</div>
  </div>
}

function TextPage({ text, percent, onBack, onLearn }: { text: TextData; percent: number; onBack: () => void; onLearn: () => void }) {
  const [tab, setTab] = useState<'sheet' | 'text' | 'photo'>('sheet')
  return <div className="page detail-page">
    <button className="back" onClick={onBack}><ArrowLeft size={17} /> Retour</button>
    <div className="detail-heading"><div><span className="family">{text.family}</span><h1>{text.title}</h1><p>{text.author}</p></div><div className="detail-actions"><div className="ring">{percent}%</div><button className="primary" onClick={onLearn}><Sparkles size={17} /> Apprendre</button></div></div>
    <div className="tabs"><button className={tab === 'sheet' ? 'active' : ''} onClick={() => setTab('sheet')}>Fiche CAP</button><button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>Texte</button><button className={tab === 'photo' ? 'active' : ''} onClick={() => setTab('photo')}>Photo</button></div>
    {tab === 'sheet' && <CapSheet text={text} />}
    {tab === 'text' && <pre className="transcription">{text.transcription}</pre>}
    {tab === 'photo' && <div className="photo-list">{text.photoPaths.map(p => <img key={p} src={p} alt={`Photographie du texte ${text.title}`} />)}</div>}
  </div>
}

function CapSheet({ text }: { text: TextData }) {
  return <article className="cap-sheet">
    <CapTitle tone="blue">BLOC INTRO</CapTitle><div className="cap-intro"><p><b>AUTEUR :</b> {text.author}</p><p><b>ŒUVRE :</b> {text.work}</p><p><b>SITUATION :</b> {text.situation}</p><p><b><i>PROBLÉMATIQUE :</i></b> {text.problem}</p></div>
    <CapTitle tone="orange">BLOC DÉVELOPPEMENT</CapTitle>
    {text.movements.map(m => <section className="movement" key={m.number}><h3>MOUVEMENT {m.number} : {m.title}</h3><div className="summary"><b>CE QUI SE PASSE :</b> {m.summary}</div><p className="idea"><i>Idée directrice : {m.idea}</i></p>{m.analyses.map((a, i) => <p className="analysis" key={`${a.citation}-${i}`}><b>{a.procedure}</b> → <span>« {a.citation} » (l. {a.line})</span> → {a.interpretation}</p>)}</section>)}
    <CapTitle tone="gray">BLOC CONCLUSION</CapTitle><div className="conclusion"><i><b>BILAN :</b> {text.bilan}</i>{text.opening && <p><i><b>OUVERTURE :</b> {text.opening}</i></p>}</div>
  </article>
}
function CapTitle({ children, tone }: { children: React.ReactNode; tone: string }) { return <h2 className={`cap-title ${tone}`}>{children}</h2> }

function PlanPage({ texts, percent, onLearn }: { texts: TextData[]; percent: (t: TextData) => number; onLearn: (ids: string[]) => void }) {
  const days = Array.from({ length: 4 }, (_, i) => texts.slice(i * 4, i * 4 + 4))
  const activeDay = days.findIndex(day => day.some(t => percent(t) < 100))
  const today = activeDay < 0 ? 3 : activeDay
  return <div className="page"><section className="plan-hero"><span className="eyebrow"><CalendarDays size={14} /> ORAL LE 24</span><h1>4 textes par jour.</h1><p>Les textes sont groupés dans un ordre logique. Une journée est réussie lorsque ses quatre textes sont validés à 100 %.</p></section>
    <SectionTitle title="Programme" subtitle={`${texts.filter(t => percent(t) < 100).length} textes restants`} />
    <div className="days">{days.map((day, i) => { const done = day.every(t => percent(t) === 100); return <section className={`day-card ${i === today ? 'today' : ''}`} key={i}><div className="day-heading"><div><span>JOUR {i + 1}</span><h3>{i === today ? "Aujourd'hui" : done ? 'Journée réussie' : `Groupe ${i + 1}`}</h3></div><strong>{day.filter(t => percent(t) === 100).length}/4</strong></div>{day.map(t => <div className="day-text" key={t.id}><span className={percent(t) === 100 ? 'checked' : ''}>{percent(t) === 100 ? <Check size={14} /> : t.id}</span><div><b>{t.title}</b><small>{t.author}</small></div><em>{percent(t)}%</em></div>)}<button className="primary full" onClick={() => onLearn(day.map(t => t.id))}>{done ? 'Revoir cette journée' : 'Apprendre ces 4 textes'}</button></section> })}</div>
  </div>
}

function LearnPage({ texts, session, setSession, setProgress, onClose }: { texts: TextData[]; session: Session; setSession: React.Dispatch<React.SetStateAction<Session | null>>; setProgress: React.Dispatch<React.SetStateAction<Progress>>; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false)
  const [drag, setDrag] = useState(0)
  const startX = useRef<number | null>(null)
  const cards = useMemo(() => texts.flatMap(t => t.cards.map(c => ({ ...c, textId: t.id, textTitle: t.title }))), [texts])
  const lookup = useMemo(() => new Map(cards.map(c => [`${c.textId}:${c.id}`, c])), [cards])
  const currentKey = session.queue[session.current]
  const card = lookup.get(currentKey)
  const allMode = session.scope.includes(',')
  const total = session.queue.length

  const decide = (known: boolean) => {
    if (!card) return
    setProgress(prev => {
      const entry = prev[card.textId] || { known: [], attempts: 0 }
      return { ...prev, [card.textId]: { attempts: entry.attempts + 1, known: known ? [...new Set([...entry.known, card.id])] : entry.known.filter(id => id !== card.id) } }
    })
    const retry = known ? session.retry : [...session.retry, currentKey]
    if (session.current + 1 >= total) {
      if (retry.length) setSession({ ...session, queue: retry, retry: [], current: 0, known: known ? [...session.known, currentKey] : session.known })
      else { setSession(null); onClose() }
    } else setSession({ ...session, retry, current: session.current + 1, known: known ? [...session.known, currentKey] : session.known })
    setFlipped(false); setDrag(0)
  }
  if (!card) return <div className="learn-complete"><Sparkles /><h1>Session terminée</h1><p>Toutes les cartes ont été validées.</p><button className="primary" onClick={onClose}>Retour à l'accueil</button></div>
  return <div className="learn-page">
    <header className="learn-header"><button className="icon-button" onClick={onClose}><X /></button><div><strong>{allMode ? 'Tout apprendre' : card.textTitle}</strong><small>Tour en cours · {session.retry.length} à revoir</small></div><span>{session.current + 1}/{total}</span></header>
    <div className="learn-progress"><span style={{ width: `${((session.current + 1) / total) * 100}%` }} /></div>
    <div className="swipe-labels"><span className={drag < -50 ? 'show no' : ''}>À revoir</span><span className={drag > 50 ? 'show yes' : ''}>Je connais</span></div>
    <div className="flashcard-wrap">
      <button className={`flashcard ${flipped ? 'flipped' : ''}`} style={{ transform: `translateX(${drag}px) rotate(${drag / 20}deg)` }} onClick={() => setFlipped(!flipped)}
        onPointerDown={e => { startX.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={e => { if (startX.current !== null) setDrag(e.clientX - startX.current) }}
        onPointerUp={() => { if (drag > 100) decide(true); else if (drag < -100) decide(false); else setDrag(0); startX.current = null }}>
        <div className="flash-inner"><section className="flash-front">{allMode && <span className="source">{card.textTitle}</span>}<small>{card.kind} {card.movement ? `· Mouvement ${card.movement}` : ''}</small><h2>{card.question}</h2><p>Appuie pour voir la réponse</p></section><section className="flash-back">{allMode && <span className="source">{card.textTitle}</span>}<small>Réponse</small><p>{card.answer}</p><span>Appuie pour retourner</span></section></div>
      </button>
    </div>
    <div className="learn-actions"><button className="no-button" onClick={() => decide(false)}><RotateCcw /> À revoir</button><button className="yes-button" onClick={() => decide(true)}><Check /> Je connais</button></div>
    <p className="gesture-help">Glisse à gauche pour revoir · à droite si tu connais</p>
  </div>
}

export default App
