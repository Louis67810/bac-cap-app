import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain, Check, ChevronLeft, ChevronRight, Eraser, Hand,
  Image, PenLine, RotateCcw, Trash2, Type, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import rawTexts from './data/texts.json'

type Analysis = { procedure: string; citation: string; line: string; interpretation: string }
type Movement = { number: number; title: string; summary: string; idea: string; analyses: Analysis[] }
type Card = { id: string; kind: string; question: string; answer: string }
type TextData = {
  id: string; title: string; author: string; transcription: string; photoPaths: string[];
  movements: Movement[]; cards: Card[];
}
type AuthorCard = { id: string; author: string; question: string; answer: string }
type AuthorQuizState = { current: number; queue?: number[]; retry: number[]; known: number[]; complete: boolean }
type DrawingTool = 'move' | 'pen' | 'eraser'
type Match = { start: number; end: number; analyses: Analysis[] }

const texts = rawTexts as TextData[]
const AUTHOR_QUIZ_KEY = 'cap-author-quiz-v1'
const ANNOTATIONS_KEY = 'cap-photo-annotations-v1'
const TEXT_STUDY_KEY = 'cap-text-study-v1'

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}

function authorCards(): AuthorCard[] {
  const seen = new Set<string>()
  return texts.flatMap(text => {
    const author = text.author.split(',')[0].trim()
    if (seen.has(author)) return []
    seen.add(author)
    const source = text.cards.find(card => card.kind === 'intro' && card.question.toLowerCase().includes('auteur'))
    if (!source) return []
    return [{ id: text.id, author, question: `Présente ${author}.`, answer: source.answer }]
  })
}

export function AuthorQuizPage({ onClose }: { onClose: () => void }) {
  const cards = useMemo(() => authorCards(), [])
  const [state, setState] = useState<AuthorQuizState>(() => load(AUTHOR_QUIZ_KEY, { current: 0, retry: [], known: [], complete: false }))
  const [flipped, setFlipped] = useState(false)
  const [drag, setDrag] = useState(0)
  const startX = useRef<number | null>(null)
  const queue = state.queue?.length ? state.queue : cards.map((_, index) => index)
  const cardIndex = queue[state.current]
  const card = cards[cardIndex]

  useEffect(() => localStorage.setItem(AUTHOR_QUIZ_KEY, JSON.stringify(state)), [state])

  const decide = (known: boolean) => {
    if (!card) return
    const knownCards = known ? [...new Set([...state.known, cardIndex])] : state.known.filter(index => index !== cardIndex)
    const retry = known ? state.retry.filter(index => index !== cardIndex) : [...new Set([...state.retry, cardIndex])]
    const atEnd = state.current + 1 >= queue.length
    setState({ current: atEnd ? state.current : state.current + 1, queue, retry, known: knownCards, complete: atEnd })
    setFlipped(false)
    setDrag(0)
  }

  const continueRetry = () => {
    if (!state.retry.length) return restart()
    setState({ current: 0, queue: state.retry, retry: [], known: state.known, complete: false })
  }

  const restart = () => setState({ current: 0, queue: cards.map((_, index) => index), retry: [], known: [], complete: false })

  if (state.complete) {
    const percent = Math.round((state.known.length / cards.length) * 100)
    return <div className="learn-page complete-view">
      <ModeHeader title={`${cards.length} / ${cards.length}`} onClose={onClose} />
      <section className="complete-panel author-complete">
        <Brain size={52} />
        <h1>Quiz auteurs terminé.</h1>
        <h2>Votre progression · {percent} %</h2>
        <div className="complete-ring" style={{ background: `conic-gradient(#54e7b4 ${percent}%, #202746 0)` }}><Check size={48} /></div>
        {state.retry.length > 0 && <button className="primary complete-button" onClick={continueRetry}>Revoir les auteurs à apprendre</button>}
        <button className="secondary complete-button" onClick={restart}><RotateCcw size={18} /> Recommencer</button>
        <button className="ghost-button complete-button" onClick={onClose}>Retour à l'accueil</button>
      </section>
    </div>
  }

  return <div className="learn-page">
    <ModeHeader title={`${state.current + 1} / ${queue.length}`} onClose={onClose} />
    <div className="learn-progress"><span style={{ width: `${((state.current + 1) / queue.length) * 100}%` }} /></div>
    <div className="learn-counts"><span className="count-pill learning"><em>{state.retry.length}</em><b>À revoir</b></span><span className="count-pill known"><b>Connus</b><em>{state.known.length}</em></span></div>
    <div className="flashcard-wrap">
      <button className={`flashcard ${flipped ? 'flipped' : ''}`} style={{ transform: `translateX(${drag}px) rotate(${drag / 20}deg)` }} onClick={() => setFlipped(value => !value)}
        onPointerDown={event => { startX.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId) }}
        onPointerMove={event => { if (startX.current !== null) setDrag(event.clientX - startX.current) }}
        onPointerUp={() => { if (drag > 100) decide(true); else if (drag < -100) decide(false); else setDrag(0); startX.current = null }}>
        <div className="flash-inner">
          <section className="flash-front"><small>Présentation de l'auteur</small><h2>{card.question}</h2><p>Appuie pour voir la réponse</p><span className="card-origin">Quiz auteurs · une seule carte par auteur</span></section>
          <section className="flash-back"><small>Réponse</small><p>{card.answer}</p><span>Appuie pour retourner</span><span className="card-origin">{card.author}</span></section>
        </div>
      </button>
    </div>
    <div className="learn-actions"><button className="no-button" onClick={() => decide(false)}><X /> À revoir</button><button className="yes-button" onClick={() => decide(true)}><Check /> Je connais</button></div>
  </div>
}

function ModeHeader({ title, onClose, children }: { title: string; onClose: () => void; children?: React.ReactNode }) {
  return <header className="learn-header"><div className="learn-brand"><Brain size={20} /></div><strong>{title}</strong><div className="learn-tools">{children}<button className="icon-button" onClick={onClose} aria-label="Fermer"><X /></button></div></header>
}

export function TextAnnotationMode({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [side, setSide] = useState<'photo' | 'text'>('photo')
  const [tool, setTool] = useState<DrawingTool>('pen')
  const [zoom, setZoom] = useState(1)
  const [annotations, setAnnotations] = useState<Record<string, string>>(() => load(ANNOTATIONS_KEY, {}))
  const [study, setStudy] = useState<Record<string, 'known' | 'learning'>>(() => load(TEXT_STUDY_KEY, {}))
  const [selected, setSelected] = useState<Analysis[] | null>(null)
  const text = texts[index]
  const matches = useMemo(() => locateAnalyses(text), [text])

  useEffect(() => localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(annotations)), [annotations])
  useEffect(() => localStorage.setItem(TEXT_STUDY_KEY, JSON.stringify(study)), [study])

  const goTo = (nextIndex: number) => {
    setSelected(null)
    setSide('photo')
    setZoom(1)
    setIndex(nextIndex)
  }

  const judge = (value: 'known' | 'learning') => {
    setStudy(previous => ({ ...previous, [text.id]: value }))
    if (index < texts.length - 1) goTo(index + 1)
  }

  return <div className="annotation-page">
    <ModeHeader title={`${index + 1} / ${texts.length}`} onClose={onClose}>
      <span className={`study-status ${study[text.id] || ''}`}>{study[text.id] === 'known' ? 'Connu' : study[text.id] === 'learning' ? 'À revoir' : 'Non classé'}</span>
    </ModeHeader>
    <div className="annotation-heading">
      <button className="icon-button" disabled={index === 0} onClick={() => goTo(index - 1)} aria-label="Texte précédent"><ChevronLeft /></button>
      <div><small>Texte {text.id}</small><h1>{text.title}</h1><p>{text.author}</p></div>
      <button className="icon-button" disabled={index === texts.length - 1} onClick={() => goTo(index + 1)} aria-label="Texte suivant"><ChevronRight /></button>
    </div>
    <div className="side-toggle-wrap"><Image size={17} /><span>Photo</span><label className="side-toggle"><input type="checkbox" checked={side === 'text'} onChange={event => setSide(event.target.checked ? 'text' : 'photo')} /><span /></label><span>Texte analysé</span><Type size={17} /></div>

    {side === 'photo' ? <>
      <div className="annotation-tools">
        <button className={tool === 'move' ? 'active' : ''} onClick={() => setTool('move')}><Hand /> Déplacer</button>
        <button className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')}><PenLine /> Annoter</button>
        <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}><Eraser /> Gommer</button>
        <button onClick={() => setZoom(Math.max(.75, zoom - .25))} aria-label="Dézoomer"><ZoomOut /></button>
        <b>{Math.round(zoom * 100)} %</b>
        <button onClick={() => setZoom(Math.min(2.5, zoom + .25))} aria-label="Zoomer"><ZoomIn /></button>
      </div>
      <div className="annotated-photos">{text.photoPaths.map((path, photoIndex) => {
        const key = `${text.id}:${photoIndex}`
        return <AnnotatablePhoto key={key} path={path} title={text.title} tool={tool} zoom={zoom} drawing={annotations[key]} onChange={drawing => setAnnotations(previous => ({ ...previous, [key]: drawing }))} onClear={() => setAnnotations(previous => { const next = { ...previous }; delete next[key]; return next })} />
      })}</div>
    </> : <HighlightedText text={text} matches={matches} onSelect={setSelected} />}

    <div className="annotation-judgement"><button className="no-button" onClick={() => judge('learning')}><X /> À revoir</button><button className="yes-button" onClick={() => judge('known')}><Check /> Je connais</button></div>

    {selected && <div className="analysis-popover" onClick={() => setSelected(null)}><section onClick={event => event.stopPropagation()}><button className="icon-button" onClick={() => setSelected(null)} aria-label="Fermer"><X /></button><h2>Analyse de la citation</h2>{selected.map((analysis, analysisIndex) => <article key={`${analysis.citation}-${analysisIndex}`}><b>{analysis.procedure}</b><blockquote>« {analysis.citation} » {analysis.line && `(l. ${analysis.line})`}</blockquote><p>{analysis.interpretation}</p></article>)}</section></div>}
  </div>
}

function AnnotatablePhoto({ path, title, tool, zoom, drawing, onChange, onClear }: { path: string; title: string; tool: DrawingTool; zoom: number; drawing?: string; onChange: (drawing: string) => void; onClear: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const drawingRef = useRef(false)

  const restore = () => {
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas || !image.naturalWidth) return
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    context?.clearRect(0, 0, canvas.width, canvas.height)
    if (drawing) {
      const saved = new window.Image()
      saved.onload = () => context?.drawImage(saved, 0, 0, canvas.width, canvas.height)
      saved.src = drawing
    }
  }

  useEffect(restore, [drawing])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }
  }

  const begin = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'move') return
    drawingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const context = event.currentTarget.getContext('2d')
    const current = point(event)
    if (!context) return
    context.beginPath()
    context.moveTo(current.x, current.y)
  }

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || tool === 'move') return
    const context = event.currentTarget.getContext('2d')
    const current = point(event)
    if (!context) return
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    context.strokeStyle = '#4257ff'
    context.lineWidth = tool === 'eraser' ? 36 : 7
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineTo(current.x, current.y)
    context.stroke()
  }

  const finish = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  return <section className="photo-annotation-card">
    <div className="photo-scroll"><div className="photo-stage" style={{ width: `${zoom * 100}%` }}><img ref={imageRef} src={path} alt={`Photographie du texte ${title}`} onLoad={restore} /><canvas ref={canvasRef} className={tool === 'move' ? 'move' : ''} onPointerDown={begin} onPointerMove={draw} onPointerUp={finish} onPointerCancel={finish} /></div></div>
    <button className="clear-annotation" onClick={onClear}><Trash2 size={16} /> Effacer les annotations de cette page</button>
  </section>
}

function normalizeWithMap(value: string) {
  const normalized: string[] = []
  const map: number[] = []
  for (let index = 0; index < value.length; index += 1) {
    const expanded = value[index].replace(/œ/giu, 'oe').replace(/æ/giu, 'ae').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    for (const character of expanded) {
      if (!/\p{L}/u.test(character)) continue
      normalized.push(character)
      map.push(index)
    }
  }
  return { value: normalized.join(''), map }
}

function normalized(value: string) {
  return normalizeWithMap(value).value
}

const STOP_WORDS = new Set(['a', 'au', 'aux', 'ce', 'ces', 'd', 'de', 'des', 'du', 'et', 'l', 'la', 'le', 'les', 'un', 'une'])

function wordsWithMap(value: string) {
  return [...value.matchAll(/\p{L}+/gu)].map(match => ({
    value: normalized(match[0]),
    start: match.index,
    end: match.index + match[0].length,
  })).filter(word => word.value.length > 1 && !STOP_WORDS.has(word.value))
}

function lineAt(value: string, index: number) {
  return value.slice(0, index).split('\n').length
}

function lineNumber(line: string) {
  const match = line.match(/\d+/)
  return match ? Number(match[0]) : null
}

function closestByLine<T extends { start: number }>(items: T[], transcription: string, targetLine: number | null) {
  if (!items.length) return null
  if (targetLine === null) return items[0]
  return [...items].sort((left, right) => Math.abs(lineAt(transcription, left.start) - targetLine) - Math.abs(lineAt(transcription, right.start) - targetLine))[0]
}

function findWordSequence(transcription: string, citation: string, targetLine: number | null) {
  const textWords = wordsWithMap(transcription)
  const citationWords = wordsWithMap(citation)
  if (citationWords.length < 2) return null
  const matches: { start: number; end: number }[] = []
  for (let start = 0; start < textWords.length; start += 1) {
    if (textWords[start].value !== citationWords[0].value) continue
    let cursor = start
    let valid = true
    for (const expected of citationWords.slice(1)) {
      const next = textWords.findIndex((word, index) => index > cursor && index <= cursor + 8 && word.value === expected.value)
      if (next < 0) { valid = false; break }
      cursor = next
    }
    if (valid) matches.push({ start: textWords[start].start, end: textWords[cursor].end })
  }
  return closestByLine(matches, transcription, targetLine)
}

function findCitation(transcription: string, citation: string, line: string): { start: number; end: number } | null {
  const haystack = normalizeWithMap(transcription)
  const needle = normalized(citation)
  const targetLine = lineNumber(line)
  let found = haystack.value.indexOf(needle)
  if (found >= 0 && needle.length >= 2) {
    const occurrences: { start: number; end: number }[] = []
    while (found >= 0) {
      occurrences.push({ start: haystack.map[found], end: haystack.map[found + needle.length - 1] + 1 })
      found = haystack.value.indexOf(needle, found + 1)
    }
    return closestByLine(occurrences, transcription, targetLine)
  }

  const chunks = citation.split(/\[[^\]]*\]|\.{2,}|…|[;/]/u).map(part => normalized(part)).filter(part => part.length >= 2)
  if (!chunks.length) return findWordSequence(transcription, citation, targetLine)
  const firstOccurrences: { start: number; end: number }[] = []
  found = haystack.value.indexOf(chunks[0])
  while (found >= 0) {
    firstOccurrences.push({ start: found, end: found + chunks[0].length - 1 })
    found = haystack.value.indexOf(chunks[0], found + 1)
  }
  const firstChunk = closestByLine(firstOccurrences.map(item => ({ start: haystack.map[item.start], normalizedStart: item.start, end: item.end })), transcription, targetLine)
  if (!firstChunk) return findWordSequence(transcription, citation, targetLine)
  let cursor = firstChunk.normalizedStart
  let first = -1
  let last = -1
  for (const chunk of chunks) {
    found = haystack.value.indexOf(chunk, cursor)
    if (found < 0) return findWordSequence(transcription, citation, targetLine)
    if (first < 0) first = found
    last = found + chunk.length - 1
    cursor = found + chunk.length
  }
  return { start: haystack.map[first], end: haystack.map[last] + 1 }
}

function locateAnalyses(text: TextData): Match[] {
  const located = text.movements.flatMap(movement => movement.analyses.flatMap(analysis => {
    const range = findCitation(text.transcription, analysis.citation, analysis.line)
    return range ? [{ ...range, analyses: [analysis] }] : []
  })).sort((left, right) => left.start - right.start || left.end - right.end)

  return located.reduce<Match[]>((merged, match) => {
    const previous = merged.at(-1)
    if (!previous || match.start >= previous.end) return [...merged, match]
    previous.end = Math.max(previous.end, match.end)
    previous.analyses.push(...match.analyses)
    return merged
  }, [])
}

function HighlightedText({ text, matches, onSelect }: { text: TextData; matches: Match[]; onSelect: (analyses: Analysis[]) => void }) {
  const content: React.ReactNode[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    if (match.start > cursor) content.push(text.transcription.slice(cursor, match.start))
    content.push(<button key={`${match.start}-${index}`} className="citation-highlight" onClick={() => onSelect(match.analyses)}>{text.transcription.slice(match.start, match.end)}</button>)
    cursor = match.end
  })
  content.push(text.transcription.slice(cursor))
  const total = text.movements.reduce((sum, movement) => sum + movement.analyses.length, 0)
  return <section className="enriched-text"><div className="enriched-legend"><span><i /> Citations repérées dans les cartes</span><b>{matches.reduce((sum, match) => sum + match.analyses.length, 0)} / {total}</b></div><div className="enriched-transcription">{content}</div></section>
}
