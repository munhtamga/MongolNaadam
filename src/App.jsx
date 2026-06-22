import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

const tg = window.Telegram?.WebApp
const tgUser = tg?.initDataUnsafe?.user

function getVoterKey() {
  if (tgUser?.id) return `tg_${tgUser.id}`
  let k = localStorage.getItem('voter_key')
  if (!k) { k = 'anon_' + Math.random().toString(36).slice(2); localStorage.setItem('voter_key', k) }
  return k
}

const VOTER_KEY = getVoterKey()

const TITLES = [
  'Улсын начин', 'Улсын харцага', 'Улсын арслан', 'Улсын гарьд', 'Улсын заан', 'Улсын аварга',
  'Дархан аварга', 'Даян аварга',
  'Аймгийн начин', 'Аймгийн харцага', 'Аймгийн арслан', 'Аймгийн заан',
  'Сумын начин', 'Сумын харцага', 'Сумын заан',
  'Цэргийн начин', 'Цэргийн харцага', 'Цэргийн арслан', 'Цэргийн заан',
  'Залуу бөх',
]

const DEVJEE = [
  'Улаанбаатар', 'Дархан', 'Орхон', 'Говьсүмбэр',
  'Архангай', 'Баян-Өлгий', 'Баянхонгор', 'Булган',
  'Говь-Алтай', 'Говь-Сүмбэр', 'Дорнод', 'Дорноговь',
  'Дундговь', 'Завхан', 'Өмнөговь', 'Өвөрхангай',
  'Сүхбаатар', 'Сэлэнгэ', 'Төв', 'Увс',
  'Ховд', 'Хэнтий', 'Хөвсгөл', 'ӨМӨЗО',
]

const ROUNDS = [
  { round: 5, label: '5-р давааны бөхчүүд', max: 16 },
  { round: 6, label: '6-р давааны бөхчүүд', max: 8 },
  { round: 7, label: '7-р давааны бөхчүүд', max: 4 },
  { round: 8, label: '8-р давааны бөхчүүд', max: 2 },
  { round: 9, label: '9-р давааны бөх (Түрүүлэх)', max: 1 },
]

const C = {
  bg: 'var(--tg-theme-bg-color,#fff)',
  sec: 'var(--tg-theme-secondary-bg-color,#f0f0f0)',
  text: 'var(--tg-theme-text-color,#222)',
  hint: 'var(--tg-theme-hint-color,#888)',
  btn: 'var(--tg-theme-button-color,#3390ec)',
  btnText: 'var(--tg-theme-button-text-color,#fff)',
}

const st = {
  wrap: { minHeight: '100vh', background: C.bg, color: C.text, paddingBottom: 80 },
  header: { padding: '16px 16px 8px', borderBottom: `1px solid ${C.sec}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto' },
  tab: (a) => ({ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: a ? 600 : 400, background: a ? C.btn : C.sec, color: a ? C.btnText : C.text, whiteSpace: 'nowrap', flexShrink: 0 }),
  card: { background: C.bg, border: `1px solid ${C.sec}`, borderRadius: 16, padding: 16, margin: '0 12px 12px' },
  badge: (live) => ({ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: live ? '#ff3b3020' : C.sec, color: live ? '#e53935' : C.hint }),
  wrestlers: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', margin: '12px 0' },
  wrestler: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  avatar: (c) => ({ width: 52, height: 52, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: '#fff' }),
  name: { fontSize: 13, fontWeight: 500, textAlign: 'center' },
  hint: { fontSize: 10, color: C.hint, textAlign: 'center' },
  vs: { fontSize: 16, fontWeight: 600, color: C.hint },
  barWrap: { borderRadius: 8, overflow: 'hidden', height: 26, display: 'flex', background: C.sec, margin: '8px 0' },
  barBlue: (p) => ({ width: `${p}%`, background: '#3390ec', display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 600, color: '#fff', transition: 'width 0.4s' }),
  barRed: (p) => ({ width: `${p}%`, background: '#e53935', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontSize: 11, fontWeight: 600, color: '#fff', transition: 'width 0.4s' }),
  voteRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 },
  voteBtn: (sel, c) => ({ padding: '10px 8px', borderRadius: 10, border: sel ? `2px solid ${c}` : `1px solid ${C.sec}`, background: sel ? `${c}18` : C.sec, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: sel ? c : C.text }),
  winRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 },
  winBtn: (c) => ({ padding: '8px', borderRadius: 10, border: `1px solid ${c}40`, background: `${c}10`, cursor: 'pointer', fontSize: 11, fontWeight: 500, color: c }),
  addBtn: { display: 'block', width: 'calc(100% - 24px)', margin: '0 12px 12px', padding: 14, borderRadius: 12, border: `1.5px dashed ${C.hint}60`, background: 'transparent', cursor: 'pointer', fontSize: 14, color: C.hint },
  formCard: { background: C.sec, borderRadius: 16, padding: 16, margin: '0 12px 12px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  label: { fontSize: 11, color: C.hint, marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.hint}40`, background: C.bg, color: C.text, fontSize: 13, outline: 'none' },
  primaryBtn: { flex: 1, padding: 12, borderRadius: 10, border: 'none', background: C.btn, color: C.btnText, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.hint}40`, background: 'transparent', color: C.hint, fontSize: 14, cursor: 'pointer' },
  winnerBadge: (s) => ({ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s === 'blue' ? '#3390ec20' : '#e5393520', color: s === 'blue' ? '#3390ec' : '#e53935', marginBottom: 8 }),
  toastEl: (show) => ({ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#222', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, zIndex: 999, opacity: show ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none', whiteSpace: 'nowrap' }),
  empty: { textAlign: 'center', color: C.hint, fontSize: 13, padding: '32px 0' },
  secTitle: { fontSize: 13, fontWeight: 600, color: C.text, padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: (c) => ({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: c || C.hint, padding: '2px 6px' }),
}

export default function App() {
  const [tab, setTab] = useState('active')
  const [tournaments, setTournaments] = useState([])
  const [matches, setMatches] = useState([])
  const [history, setHistory] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Tournament
  const [showTournamentForm, setShowTournamentForm] = useState(false)
  const [editTournament, setEditTournament] = useState(null)
  const [tournamentName, setTournamentName] = useState('')

  // Match
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [form, setForm] = useState({ blue_name: '', blue_title: 'Улсын начин', blue_devjee: 'Улаанбаатар', red_name: '', red_title: 'Улсын начин', red_devjee: 'Улаанбаатар', round: 1, status: 'upcoming' })

  // Naadam
  const [naadamWrestlers, setNaadamWrestlers] = useState([])
  const [myPredictions, setMyPredictions] = useState({})
  const [predCounts, setPredCounts] = useState({})
  const [naadamRound, setNaadamRound] = useState(5)
  const [filterTitle, setFilterTitle] = useState('')
  const [filterDevjee, setFilterDevjee] = useState('')
  const [showWrestlerForm, setShowWrestlerForm] = useState(false)
  const [wrestlerForm, setWrestlerForm] = useState({ name: '', title: 'Улсын начин', devjee: 'Улаанбаатар', isCustom: false, customName: '' })

  // Auth
  const [subPage, setSubPage] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [prices, setPrices] = useState({ standard: 5000, premium: 15000, stars_standard: 50, stars_premium: 150 })
  const [subLoading, setSubLoading] = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('key, value')
    if (!data) return
    const map = {}
    data.forEach(r => { map[r.key] = r.value })
    setPrices({ standard: Number(map.price_standard || 5000), premium: Number(map.price_premium || 15000), stars_standard: Number(map.stars_standard || 50), stars_premium: Number(map.stars_premium || 150) })
  }, [])

  const checkSubscription = useCallback(async () => {
    const { data } = await supabase.from('subscriptions').select('*').eq('voter_key', VOTER_KEY).eq('status', 'active').gt('expires_at', new Date().toISOString())
    setIsSubscribed(!!(data && data.length > 0))
  }, [])

  const checkAdmin = useCallback(async () => {
    if (!tgUser?.id) return
    const { data } = await supabase.from('admins').select('tg_id').eq('tg_id', String(tgUser.id))
    setIsAdmin(!!(data && data.length > 0))
  }, [])

  const fetchData = useCallback(async () => {
    const [{ data: tours }, { data: active }, { data: done }] = await Promise.all([
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
      supabase.from('matches').select('*').in('status', ['upcoming', 'live']).order('created_at', { ascending: false }),
      supabase.from('matches').select('*').eq('status', 'closed').order('created_at', { ascending: false }).limit(30),
    ])
    setTournaments(tours || [])
    setMatches(active || [])
    setHistory(done || [])

    const allIds = [...(active || []), ...(done || [])].map(m => m.id)
    if (allIds.length > 0) {
      const { data: votes } = await supabase.from('votes').select('match_id, side, voter_key').in('match_id', allIds)
      if (votes) {
        const counts = {}; const mine = {}
        votes.forEach(v => {
          if (!counts[v.match_id]) counts[v.match_id] = { blue: 0, red: 0 }
          counts[v.match_id][v.side]++
          if (v.voter_key === VOTER_KEY) mine[v.match_id] = v.side
        })
        setVoteCounts(counts); setMyVotes(mine)
      }
    }
    setLoading(false)
  }, [])

  const fetchNaadam = useCallback(async () => {
    const { data: wrestlers } = await supabase.from('naadam_wrestlers').select('*').order('round').order('name')
    const { data: preds } = await supabase.from('naadam_predictions').select('wrestler_id, voter_key, round')
    setNaadamWrestlers(wrestlers || [])

    if (preds) {
      const counts = {}; const mine = {}
      preds.forEach(p => {
        if (!counts[p.wrestler_id]) counts[p.wrestler_id] = 0
        counts[p.wrestler_id]++
        if (p.voter_key === VOTER_KEY) mine[`${p.round}_${p.wrestler_id}`] = true
      })
      setPredCounts(counts); setMyPredictions(mine)
    }
  }, [])

  useEffect(() => {
    tg?.ready(); tg?.expand()
    fetchSettings(); checkSubscription(); checkAdmin(); fetchData(); fetchNaadam()
    const ch = supabase.channel('rt').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchData).on('postgres_changes', { event: '*', schema: 'public', table: 'naadam_predictions' }, fetchNaadam).subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchData, fetchNaadam, fetchSettings, checkSubscription, checkAdmin])

  // Tournament CRUD
  const saveTournament = async () => {
    if (!tournamentName.trim()) { showToast('Нэр оруулна уу'); return }
    if (editTournament) {
      await supabase.from('tournaments').update({ name: tournamentName.trim() }).eq('id', editTournament.id)
    } else {
      await supabase.from('tournaments').insert({ name: tournamentName.trim() })
    }
    setTournamentName(''); setEditTournament(null); setShowTournamentForm(false)
    showToast(editTournament ? 'Засагдлаа!' : 'Нэмэгдлээ!'); fetchData()
  }

  const deleteTournament = async (id) => {
    if (!window.confirm('Устгах уу?')) return
    await supabase.from('matches').delete().eq('tournament_id', id)
    await supabase.from('tournaments').delete().eq('id', id)
    showToast('Устгагдлаа!'); fetchData()
  }

  // Match CRUD
  const addMatch = async () => {
    if (!form.blue_name.trim() || !form.red_name.trim()) { showToast('Бөхийн нэр оруулна уу'); return }
    await supabase.from('matches').insert({ tournament_id: selectedTournamentId, blue_name: form.blue_name.trim(), blue_title: form.blue_title, blue_devjee: form.blue_devjee, red_name: form.red_name.trim(), red_title: form.red_title, red_devjee: form.red_devjee, round: Number(form.round), status: form.status })
    setShowMatchForm(false)
    setForm({ blue_name: '', blue_title: 'Улсын начин', blue_devjee: 'Улаанбаатар', red_name: '', red_title: 'Улсын начин', red_devjee: 'Улаанбаатар', round: 1, status: 'upcoming' })
    showToast('Барилдаан нэмэгдлээ!'); fetchData()
  }

  const declareWinner = async (matchId, side) => {
    await supabase.from('matches').update({ status: 'closed', winner: side }).eq('id', matchId)
    const match = matches.find(m => m.id === matchId)
    showToast(`${side === 'blue' ? match?.blue_name : match?.red_name} давлаа!`); fetchData()
  }

  const vote = async (matchId, side) => {
    if (!isSubscribed) { setSubPage(true); return }
    if (myVotes[matchId]) { showToast('Та энэ барилдаанд санал өгсөн байна'); return }
    const { error } = await supabase.from('votes').insert({ match_id: matchId, side, voter_key: VOTER_KEY })
    if (error) { showToast('Алдаа гарлаа'); return }
    setMyVotes(p => ({ ...p, [matchId]: side }))
    setVoteCounts(p => ({ ...p, [matchId]: { ...(p[matchId] || { blue: 0, red: 0 }), [side]: ((p[matchId]?.[side] || 0) + 1) } }))
    showToast('Санал амжилттай өгөгдлөө!')
  }

  // Naadam prediction
  const addWrestler = async () => {
    const name = wrestlerForm.isCustom ? wrestlerForm.customName.trim() : wrestlerForm.name.trim()
    if (!name) { showToast('Нэр оруулна уу'); return }
    await supabase.from('naadam_wrestlers').insert({ round: naadamRound, name, title: wrestlerForm.isCustom ? '' : wrestlerForm.title, devjee: wrestlerForm.isCustom ? '' : wrestlerForm.devjee })
    setShowWrestlerForm(false)
    setWrestlerForm({ name: '', title: 'Улсын начин', devjee: 'Улаанбаатар', isCustom: false, customName: '' })
    showToast('Бөх нэмэгдлээ!'); fetchNaadam()
  }

  const deleteWrestler = async (id) => {
    await supabase.from('naadam_predictions').delete().eq('wrestler_id', id)
    await supabase.from('naadam_wrestlers').delete().eq('id', id)
    showToast('Устгагдлаа!'); fetchNaadam()
  }

  const togglePrediction = async (wrestler) => {
    if (!isSubscribed) { setSubPage(true); return }
    const key = `${wrestler.round}_${wrestler.id}`
    if (myPredictions[key]) {
      await supabase.from('naadam_predictions').delete().eq('wrestler_id', wrestler.id).eq('voter_key', VOTER_KEY)
      setMyPredictions(p => { const n = { ...p }; delete n[key]; return n })
      setPredCounts(p => ({ ...p, [wrestler.id]: Math.max(0, (p[wrestler.id] || 1) - 1) }))
      showToast('Сонголт цуцлагдлаа')
    } else {
      const { error } = await supabase.from('naadam_predictions').insert({ round: wrestler.round, wrestler_id: wrestler.id, wrestler_name: wrestler.name, voter_key: VOTER_KEY })
      if (error) { showToast('Алдаа гарлаа'); return }
      setMyPredictions(p => ({ ...p, [key]: true }))
      setPredCounts(p => ({ ...p, [wrestler.id]: (p[wrestler.id] || 0) + 1 }))
      showToast('Таамаглал нэмэгдлээ!')
    }
  }

  const setWinner = async (wrestlerId) => {
    const w = naadamWrestlers.find(x => x.id === wrestlerId)
    await supabase.from('naadam_wrestlers').update({ is_winner: !w.is_winner }).eq('id', wrestlerId)
    showToast(w.is_winner ? 'Цуцлагдлаа' : '🏆 Давагч тэмдэглэгдлээ!'); fetchNaadam()
  }

  const subscribe = async (plan) => {
    setSubLoading(true)
    const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1)
    const { error } = await supabase.from('subscriptions').upsert({ voter_key: VOTER_KEY, plan, status: 'active', expires_at: expiresAt.toISOString(), tg_user_id: tgUser?.id ? String(tgUser.id) : null, tg_username: tgUser?.username || null }, { onConflict: 'voter_key' })
    setSubLoading(false)
    if (error) { showToast('Алдаа гарлаа'); return }
    setIsSubscribed(true); setSubPage(false); showToast('Subscription идэвхжлээ! 🎉')
  }

  const getProb = (matchId) => {
    const c = voteCounts[matchId] || { blue: 0, red: 0 }
    const total = c.blue + c.red
    return total === 0 ? 50 : Math.round((c.blue / total) * 100)
  }

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const roundWrestlers = naadamWrestlers.filter(w => w.round === naadamRound)
  const filtered = roundWrestlers.filter(w => (!filterTitle || w.title === filterTitle) && (!filterDevjee || w.devjee === filterDevjee))
  const myCount = roundWrestlers.filter(w => myPredictions[`${w.round}_${w.id}`]).length
  const roundInfo = ROUNDS.find(r => r.round === naadamRound)

  const MatchCard = ({ m }) => {
    const c = voteCounts[m.id] || { blue: 0, red: 0 }
    const prob = getProb(m.id)
    const redProb = 100 - prob
    const total = c.blue + c.red
    const myV = myVotes[m.id]
    const isHist = m.status === 'closed'

    return (
      <div style={st.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={st.badge(m.status === 'live')}>{m.status === 'live' ? '● Шууд' : m.status === 'upcoming' ? 'Удахгүй' : 'Дууссан'}</span>
          <span style={{ fontSize: 12, color: C.hint }}>{m.round}-р давааны барилдаан</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.hint }}>{total} санал</span>
        </div>
        {m.winner && <div style={{ textAlign: 'center' }}><span style={st.winnerBadge(m.winner)}>🏆 {m.winner === 'blue' ? m.blue_name : m.red_name} давлаа</span></div>}
        <div style={st.wrestlers}>
          <div style={st.wrestler}>
            <div style={st.avatar('#3390ec')}>{getInitials(m.blue_name)}</div>
            <div style={st.name}>{m.blue_name}</div>
            <div style={st.hint}>{m.blue_title}</div>
            {m.blue_devjee && <div style={st.hint}>{m.blue_devjee} дэвжээ</div>}
          </div>
          <div style={st.vs}>VS</div>
          <div style={st.wrestler}>
            <div style={st.avatar('#e53935')}>{getInitials(m.red_name)}</div>
            <div style={st.name}>{m.red_name}</div>
            <div style={st.hint}>{m.red_title}</div>
            {m.red_devjee && <div style={st.hint}>{m.red_devjee} дэвжээ</div>}
          </div>
        </div>
        <div style={st.barWrap}>
          <div style={st.barBlue(prob)}>{prob > 15 ? `${prob}%` : ''}</div>
          <div style={st.barRed(redProb)}>{redProb > 15 ? `${redProb}%` : ''}</div>
        </div>
        {!isHist && (
          <>
            <div style={st.voteRow}>
              <button style={st.voteBtn(myV === 'blue', '#3390ec')} onClick={() => vote(m.id, 'blue')}>👍 {m.blue_name}<br /><span style={{ fontSize: 10, fontWeight: 400 }}>{c.blue} санал · {prob}%</span></button>
              <button style={st.voteBtn(myV === 'red', '#e53935')} onClick={() => vote(m.id, 'red')}>👍 {m.red_name}<br /><span style={{ fontSize: 10, fontWeight: 400 }}>{c.red} санал · {redProb}%</span></button>
            </div>
            {isAdmin && (
              <div style={st.winRow}>
                <button style={st.winBtn('#3390ec')} onClick={() => declareWinner(m.id, 'blue')}>🏆 {m.blue_name} давлаа</button>
                <button style={st.winBtn('#e53935')} onClick={() => declareWinner(m.id, 'red')}>🏆 {m.red_name} давлаа</button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const activeByTournament = () => {
    const result = []
    tournaments.forEach(t => {
      const tm = matches.filter(m => m.tournament_id === t.id)
      if (tm.length > 0 || isAdmin) result.push({ tournament: t, matches: tm })
    })
    const noTour = matches.filter(m => !m.tournament_id)
    if (noTour.length > 0 || (isAdmin && tournaments.length === 0)) result.push({ tournament: null, matches: noTour })
    return result
  }

  const histByTournament = () => {
    const result = []
    tournaments.forEach(t => {
      const tm = history.filter(m => m.tournament_id === t.id)
      if (tm.length > 0) result.push({ tournament: t, matches: tm })
    })
    const noTour = history.filter(m => !m.tournament_id)
    if (noTour.length > 0) result.push({ tournament: null, matches: noTour })
    return result
  }

  const SubPage = () => (
    <div style={{ padding: '24px 16px' }}>
      <button onClick={() => setSubPage(false)} style={{ background: 'none', border: 'none', color: C.btn, fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Буцах</button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Subscription авах</div>
        <div style={{ fontSize: 13, color: C.hint }}>Тааварт оролцож, оноо цуглуул</div>
      </div>
      {[{ plan: 'standard', label: 'Стандарт', price: prices.standard, stars: prices.stars_standard, color: C.btn, features: ['Бүх барилдаанд санал өгөх', 'Наадмын таамаглалд оролцох', 'Виртуал оноо цуглуулах'] }, { plan: 'premium', label: 'Premium ⭐', price: prices.premium, stars: prices.stars_premium, color: '#F57F17', features: ['Стандартын бүх эрх', 'Дэлгэрэнгүй статистик', 'Premium тэмдэг 🥇'] }].map(p => (
        <div key={p.plan} style={{ background: p.plan === 'premium' ? '#FFF8E1' : C.sec, borderRadius: 16, padding: 20, marginBottom: 12, border: p.plan === 'premium' ? '1.5px solid #FFD54F' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div><div style={{ fontSize: 16, fontWeight: 600 }}>{p.label}</div><div style={{ fontSize: 12, color: C.hint }}>1 сар</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 700, color: p.color }}>{p.price.toLocaleString()}₮</div><div style={{ fontSize: 11, color: C.hint }}>{p.stars} ⭐</div></div>
          </div>
          <div style={{ fontSize: 12, color: C.hint, marginBottom: 16, lineHeight: 1.7 }}>{p.features.map(f => `✓ ${f}`).join('\n').split('\n').map((f, i) => <div key={i}>{f}</div>)}</div>
          <button style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: p.color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: subLoading ? 0.6 : 1 }} onClick={() => subscribe(p.plan)} disabled={subLoading}>{subLoading ? 'Уншиж байна...' : `${p.label} авах`}</button>
        </div>
      ))}
      <div style={{ fontSize: 11, color: C.hint, textAlign: 'center', marginTop: 16 }}>Төлбөр: QPay, SocialPay, Telegram Stars</div>
    </div>
  )

  if (subPage) return <div style={st.wrap}><SubPage /><div style={st.toastEl(toast)}>{toast}</div></div>

  return (
    <div style={st.wrap}>
      <div style={st.header}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>🤼 Монгол Бөх</div>
          <div style={{ fontSize: 12, color: C.hint, marginTop: 2 }}>Барилдааны урьдчилан таамаглал</div>
        </div>
        {isSubscribed ? (
          <div style={{ fontSize: 11, background: '#E8F5E9', color: '#2E7D32', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>✓ Идэвхтэй</div>
        ) : (
          <button onClick={() => setSubPage(true)} style={{ fontSize: 12, background: C.btn, color: C.btnText, border: 'none', padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}>Subscription</button>
        )}
      </div>

      <div style={st.tabs}>
        <button style={st.tab(tab === 'active')} onClick={() => setTab('active')}>Барилдаан</button>
        <button style={st.tab(tab === 'naadam')} onClick={() => setTab('naadam')}>🏆 Наадам</button>
        <button style={st.tab(tab === 'history')} onClick={() => setTab('history')}>Түүх</button>
      </div>

      {loading ? <div style={st.empty}>Уншиж байна...</div> :

      tab === 'active' ? (
        <>
          {!isSubscribed && (
            <div style={{ margin: '0 12px 12px', background: '#E3F2FD', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Санал өгөхийн тулд subscription авна уу</span>
              <button onClick={() => setSubPage(true)} style={{ background: C.btn, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Авах</button>
            </div>
          )}
          {isAdmin && showTournamentForm && (
            <div style={st.formCard}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{editTournament ? 'Нэр засах' : 'Шинэ барилдааны нэр'}</div>
              <input style={{ ...st.input, marginBottom: 10 }} placeholder="2026 оны улсын баяр наадам" value={tournamentName} onChange={e => setTournamentName(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={st.primaryBtn} onClick={saveTournament}>{editTournament ? 'Хадгалах' : 'Нэмэх'}</button>
                <button style={st.cancelBtn} onClick={() => { setShowTournamentForm(false); setEditTournament(null); setTournamentName('') }}>Болих</button>
              </div>
            </div>
          )}
          {activeByTournament().map(({ tournament, matches: tm }) => (
            <div key={tournament?.id || 'none'}>
              <div style={st.secTitle}>
                <span>{tournament ? tournament.name : 'Барилдаан'}</span>
                {isAdmin && tournament && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={st.iconBtn(C.btn)} onClick={() => { setEditTournament(tournament); setTournamentName(tournament.name); setShowTournamentForm(true) }}>✏️</button>
                    <button style={st.iconBtn('#e53935')} onClick={() => deleteTournament(tournament.id)}>🗑</button>
                  </div>
                )}
              </div>
              {tm.map(m => <MatchCard key={m.id} m={m} />)}
              {isAdmin && (showMatchForm && selectedTournamentId === (tournament?.id || null) ? (
                <div style={st.formCard}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Шинэ барилдаан</div>
                  <div style={st.formRow}>
                    <div><label style={st.label}>Цэнхэр бөх</label><input style={st.input} placeholder="Б. Болд" value={form.blue_name} onChange={e => setForm(p => ({ ...p, blue_name: e.target.value }))} /></div>
                    <div><label style={st.label}>Улаан бөх</label><input style={st.input} placeholder="Д. Ганбат" value={form.red_name} onChange={e => setForm(p => ({ ...p, red_name: e.target.value }))} /></div>
                  </div>
                  <div style={st.formRow}>
                    <div><label style={st.label}>Цол (цэнхэр)</label><select style={st.input} value={form.blue_title} onChange={e => setForm(p => ({ ...p, blue_title: e.target.value }))}>{TITLES.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div><label style={st.label}>Цол (улаан)</label><select style={st.input} value={form.red_title} onChange={e => setForm(p => ({ ...p, red_title: e.target.value }))}>{TITLES.map(t => <option key={t}>{t}</option>)}</select></div>
                  </div>
                  <div style={st.formRow}>
                    <div><label style={st.label}>Дэвжээ (цэнхэр)</label><select style={st.input} value={form.blue_devjee} onChange={e => setForm(p => ({ ...p, blue_devjee: e.target.value }))}>{DEVJEE.map(d => <option key={d}>{d}</option>)}</select></div>
                    <div><label style={st.label}>Дэвжээ (улаан)</label><select style={st.input} value={form.red_devjee} onChange={e => setForm(p => ({ ...p, red_devjee: e.target.value }))}>{DEVJEE.map(d => <option key={d}>{d}</option>)}</select></div>
                  </div>
                  <div style={st.formRow}>
                    <div><label style={st.label}>Давааны дугаар</label><input style={st.input} type="number" min="1" max="9" value={form.round} onChange={e => setForm(p => ({ ...p, round: e.target.value }))} /></div>
                    <div><label style={st.label}>Статус</label><select style={st.input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}><option value="upcoming">Удахгүй</option><option value="live">Шууд</option></select></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}><button style={st.primaryBtn} onClick={addMatch}>Нэмэх</button><button style={st.cancelBtn} onClick={() => setShowMatchForm(false)}>Болих</button></div>
                </div>
              ) : (
                <button style={st.addBtn} onClick={() => { setSelectedTournamentId(tournament?.id || null); setShowMatchForm(true) }}>+ Барилдаан нэмэх</button>
              ))}
            </div>
          ))}
          {isAdmin && !showTournamentForm && (
            <button style={{ ...st.addBtn, borderColor: C.btn + '80', color: C.btn }} onClick={() => { setShowTournamentForm(true); setEditTournament(null); setTournamentName('') }}>+ Барилдааны нэр нэмэх</button>
          )}
          {matches.length === 0 && tournaments.length === 0 && !isAdmin && <div style={st.empty}>Одоогоор барилдаан байхгүй байна</div>}
        </>

      ) : tab === 'naadam' ? (
        <>
          {/* Round tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 16px', overflowX: 'auto' }}>
            {ROUNDS.map(r => (
              <button key={r.round} style={{ ...st.tab(naadamRound === r.round), fontSize: 11 }} onClick={() => { setNaadamRound(r.round); setFilterTitle(''); setFilterDevjee('') }}>
                {r.round}-р давааны ({naadamWrestlers.filter(w => w.round === r.round).length}/{r.max})
              </button>
            ))}
          </div>

          {/* Round info */}
          <div style={{ margin: '0 12px 12px', background: '#E3F2FD', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#1565C0' }}>
            <strong>{roundInfo?.label}</strong> — {roundWrestlers.length} бөх оруулсан
            {isSubscribed && myCount > 0 && <span style={{ marginLeft: 8, background: '#1565C0', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>Та {myCount} бөх таасан</span>}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px' }}>
            <select style={{ ...st.input, flex: 1, fontSize: 12 }} value={filterTitle} onChange={e => setFilterTitle(e.target.value)}>
              <option value="">Бүх цол</option>
              {[...new Set(roundWrestlers.map(w => w.title).filter(Boolean))].map(t => <option key={t}>{t}</option>)}
            </select>
            <select style={{ ...st.input, flex: 1, fontSize: 12 }} value={filterDevjee} onChange={e => setFilterDevjee(e.target.value)}>
              <option value="">Бүх дэвжээ</option>
              {[...new Set(roundWrestlers.map(w => w.devjee).filter(Boolean))].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Wrestler list */}
          {filtered.length === 0 && <div style={st.empty}>Бөх байхгүй байна</div>}
          {filtered.map(w => {
            const key = `${w.round}_${w.id}`
            const selected = !!myPredictions[key]
            const count = predCounts[w.id] || 0
            return (
              <div key={w.id} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <button onClick={() => togglePrediction(w)} style={{ width: 28, height: 28, borderRadius: 8, border: selected ? '2px solid #3390ec' : `1px solid ${C.hint}40`, background: selected ? '#3390ec' : 'transparent', color: selected ? '#fff' : C.hint, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: w.is_winner ? '#2E7D32' : C.text }}>{w.is_winner ? '🏆 ' : ''}{w.name}</div>
                  {(w.title || w.devjee) && <div style={{ fontSize: 11, color: C.hint }}>{[w.title, w.devjee ? w.devjee + ' дэвжээ' : ''].filter(Boolean).join(' · ')}</div>}
                </div>
                <div style={{ fontSize: 12, color: C.hint, textAlign: 'right' }}>
                  <div>{count} санал</div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <button style={st.iconBtn('#2E7D32')} onClick={() => setWinner(w.id)}>🏆</button>
                      <button style={st.iconBtn('#e53935')} onClick={() => deleteWrestler(w.id)}>🗑</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add wrestler */}
          {isAdmin && (
            showWrestlerForm ? (
              <div style={st.formCard}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Бөх нэмэх — {naadamRound}-р давааны</div>
                <div style={{ marginBottom: 10 }}>
                  <label style={st.label}>
                    <input type="checkbox" checked={wrestlerForm.isCustom} onChange={e => setWrestlerForm(p => ({ ...p, isCustom: e.target.checked }))} style={{ marginRight: 6 }} />
                    Жагсаалтад байхгүй (өөрөө бичих)
                  </label>
                </div>
                {wrestlerForm.isCustom ? (
                  <input style={{ ...st.input, marginBottom: 10 }} placeholder="Бөхийн нэр" value={wrestlerForm.customName} onChange={e => setWrestlerForm(p => ({ ...p, customName: e.target.value }))} />
                ) : (
                  <>
                    <div style={{ marginBottom: 10 }}><label style={st.label}>Нэр</label><input style={st.input} placeholder="Б. Батсуурь" value={wrestlerForm.name} onChange={e => setWrestlerForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div style={st.formRow}>
                      <div><label style={st.label}>Цол</label><select style={st.input} value={wrestlerForm.title} onChange={e => setWrestlerForm(p => ({ ...p, title: e.target.value }))}>{TITLES.map(t => <option key={t}>{t}</option>)}</select></div>
                      <div><label style={st.label}>Дэвжээ</label><select style={st.input} value={wrestlerForm.devjee} onChange={e => setWrestlerForm(p => ({ ...p, devjee: e.target.value }))}>{DEVJEE.map(d => <option key={d}>{d}</option>)}</select></div>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: 8 }}><button style={st.primaryBtn} onClick={addWrestler}>Нэмэх</button><button style={st.cancelBtn} onClick={() => setShowWrestlerForm(false)}>Болих</button></div>
              </div>
            ) : (
              <button style={st.addBtn} onClick={() => setShowWrestlerForm(true)}>+ Бөх нэмэх</button>
            )
          )}
          {!isSubscribed && (
            <div style={{ margin: '12px 12px 0', background: '#E3F2FD', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Таамаглалд оролцохын тулд subscription авна уу</span>
              <button onClick={() => setSubPage(true)} style={{ background: C.btn, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Авах</button>
            </div>
          )}
        </>

      ) : (
        <>
          {histByTournament().map(({ tournament, matches: tm }) => (
            <div key={tournament?.id || 'none'}>
              <div style={st.secTitle}><span>{tournament ? tournament.name : 'Барилдаан'}</span></div>
              {tm.map(m => <MatchCard key={m.id} m={m} />)}
            </div>
          ))}
          {history.length === 0 && <div style={st.empty}>Түүх байхгүй байна</div>}
        </>
      )}

      <div style={st.toastEl(toast)}>{toast}</div>
    </div>
  )
}
