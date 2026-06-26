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

const TOURNAMENT_NAMES = [
  'Улсын наадам','Цагаан сар','Цагаан сар (сум)','Цагаан сар (аймгийн начин)',
  'Цагаан сар (аймаг, цэрэг)','БНМАУ тунхагласны ой','Ерөнхийлөгчийн цом',
  'Цэргийн наадам','Начин цолны хүндэтгэл','Харцага цолны хүндэтгэл',
  'Заан цолны хүндэтгэл','Гарьд цолны хүндэтгэл','Арслан цолны хүндэтгэл',
  'Аварга цолны хүндэтгэл','Сонгинохайрхан хишиг','Баянзүрх хишиг',
  'Богдхан хишиг','Чингэлтэй хишиг','Хатан Туулын хишиг','Зэвсэгт хүчний ой',
  'Наурызын баяр','Атар хэвийн боовны баяр','Шинэ үндсэн хуулийн барилдаан',
  'Эх орончдын өдөр','Монгол бахархлын өдөр','Ардчилсан намын ой',
  'Ардчилсан хувьсгалын ой','Наадмын сорилго','Уяачдын наадам',
  'Нэрэмжит барилдаан','Аймгийн цолтон','Аймгийн начин','Сумын цолтон',
  'Аймгийн баяр наадам','Орон нутгийн барилдаан','Үндэсний алтан цом',
  'Ойн барилдаан','Цолгүй залуу бөхчүүдийн барилдаан','Нийтийн монгол бөх',
  'Нийслэл Улаанбаатар хотын ой',
]

const ROUND_TYPES = [
  { type: '16', label: 'Шөвгийн 16 бөх', max: 16, points: 1 },
  { type: '8',  label: 'Шөвгийн 8 бөх',  max: 8,  points: 2 },
  { type: '4',  label: 'Шөвгийн 4 бөх',  max: 4,  points: 4 },
  { type: '2',  label: 'Үзүүр, түрүүний бөх', max: 2, points: 8 },
  { type: '1',  label: 'Түрүү бөх',       max: 1,  points: 16 },
]

const ROUND_POINTS = { '16': 1, '8': 2, '4': 4, '2': 8, '1': 16 }

const C = {
  bg: 'var(--tg-theme-bg-color,#fff)',
  sec: 'var(--tg-theme-secondary-bg-color,#f0f0f0)',
  text: 'var(--tg-theme-text-color,#222)',
  hint: 'var(--tg-theme-hint-color,#888)',
  btn: 'var(--tg-theme-button-color,#3390ec)',
  btnText: 'var(--tg-theme-button-text-color,#fff)',
}

const NAV = [
  { id: 'leaderboard', icon: '🏆', label: 'Байр' },
  { id: 'profile',     icon: '👤', label: 'Профайл' },
  { id: 'predict',     icon: '🤼', label: 'Таамаглал' },
  { id: 'rules',       icon: '💰', label: 'Дүрэм' },
]

const st = {
  wrap: { minHeight: '100vh', background: C.bg, color: C.text, paddingBottom: 70 },
  header: { padding: '14px 16px 10px', borderBottom: `1px solid ${C.sec}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navBar: { position: 'fixed', bottom: 0, left: 0, right: 0, background: C.bg, borderTop: `1px solid ${C.sec}`, display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' },
  navItem: (a) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0 6px', cursor: 'pointer', border: 'none', background: 'transparent', color: a ? C.btn : C.hint }),
  navIcon: { fontSize: 22, lineHeight: 1 },
  navLabel: (a) => ({ fontSize: 10, marginTop: 3, fontWeight: a ? 600 : 400 }),
  card: { background: C.bg, border: `1px solid ${C.sec}`, borderRadius: 16, padding: 16, margin: '0 12px 12px' },
  formCard: { background: C.sec, borderRadius: 16, padding: 16, margin: '0 12px 12px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  label: { fontSize: 11, color: C.hint, marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.hint}40`, background: C.bg, color: C.text, fontSize: 13, outline: 'none' },
  primaryBtn: { flex: 1, padding: 12, borderRadius: 10, border: 'none', background: C.btn, color: C.btnText, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.hint}40`, background: 'transparent', color: C.hint, fontSize: 14, cursor: 'pointer' },
  addBtn: (color) => ({ display: 'block', width: 'calc(100% - 24px)', margin: '0 12px 12px', padding: 12, borderRadius: 12, border: `1.5px dashed ${color || C.hint}60`, background: 'transparent', cursor: 'pointer', fontSize: 13, color: color || C.hint }),
  subTab: (a) => ({ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: a ? 600 : 400, background: a ? C.btn : C.sec, color: a ? C.btnText : C.text, whiteSpace: 'nowrap', flexShrink: 0 }),
  iconBtn: (c) => ({ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: c || C.hint, padding: '2px 6px' }),
  toastEl: (show) => ({ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#222', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, zIndex: 999, opacity: show ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none', whiteSpace: 'nowrap' }),
  empty: { textAlign: 'center', color: C.hint, fontSize: 13, padding: '32px 0' },
  secTitle: { fontSize: 14, fontWeight: 700, color: C.text, padding: '10px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  checkBtn: (sel) => ({ width: 28, height: 28, borderRadius: 8, border: sel ? '2px solid #3390ec' : `1px solid ${C.hint}40`, background: sel ? '#3390ec' : 'transparent', color: sel ? '#fff' : C.hint, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
}

export default function App() {
  const [page, setPage] = useState('predict')
  const [toast, setToast] = useState('')

  // Data
  const [tournaments, setTournaments] = useState([])
  const [wrestlers, setWrestlers] = useState([])
  const [tournamentRounds, setTournamentRounds] = useState([])
  const [myPicks, setMyPicks] = useState({})
  const [pickCounts, setPickCounts] = useState({})
  const [leaderboard, setLeaderboard] = useState([])

  // Auth
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [subPage, setSubPage] = useState(false)
  const [prices, setPrices] = useState({ standard: 5000, premium: 15000 })
  const [subLoading, setSubLoading] = useState(false)

  // UI state
  const [loading, setLoading] = useState(true)
  const [expandedTournament, setExpandedTournament] = useState(null)
  const [expandedRound, setExpandedRound] = useState(null)
  const [filterTitle, setFilterTitle] = useState('')
  const [filterDevjee, setFilterDevjee] = useState('')
  const [searchName, setSearchName] = useState('')
  const [showAddWrestler, setShowAddWrestler] = useState(null)
  const [newWrestler, setNewWrestler] = useState({ name: '', title: 'Улсын начин', devjee: 'Улаанбаатар' })

  // Tournament form
  const [showTournamentForm, setShowTournamentForm] = useState(false)
  const [editTournament, setEditTournament] = useState(null)
  const [tForm, setTForm] = useState({ name: '', year: new Date().getFullYear(), prize_pool: 0 })

  // Confirm dialog
  const [confirm, setConfirm] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const fetchAll = useCallback(async () => {
    const [{ data: tours }, { data: ws }, { data: rounds }, { data: picks }, { data: subs }] = await Promise.all([
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
      supabase.from('wrestlers').select('*').order('name'),
      supabase.from('tournament_rounds').select('*'),
      supabase.from('round_picks').select('round_id, voter_key, wrestler_name, is_correct'),
      supabase.from('subscriptions').select('voter_key, tg_username, tg_user_id').eq('status', 'active').gt('expires_at', new Date().toISOString()),
    ])
    setTournaments(tours || [])
    setWrestlers(ws || [])
    setTournamentRounds(rounds || [])

    const mine = {}
    const counts = {}
    if (picks) {
      picks.forEach(p => {
        const key = `${p.round_id}_${p.wrestler_name}`
        counts[key] = (counts[key] || 0) + 1
        if (p.voter_key === VOTER_KEY) mine[key] = { is_correct: p.is_correct }
      })
    }
    setMyPicks(mine)
    setPickCounts(counts)

    // Leaderboard
    if (picks && tours) {
      const subMap = {}
      if (subs) subs.forEach(s => { subMap[s.voter_key] = s.tg_username || s.tg_user_id || 'Хэрэглэгч' })

      const tourMap = {}
      tours.forEach(t => { tourMap[t.id] = t })
      const roundMap = {}
      if (rounds) rounds.forEach(r => { roundMap[r.id] = r })

      // Group by tournament
      const tourScores = {}
      picks.forEach(p => {
        if (!p.is_correct) return
        const round = roundMap[p.round_id]
        if (!round) return
        const pts = ROUND_POINTS[round.round_type] || 1
        if (!tourScores[round.tournament_id]) tourScores[round.tournament_id] = {}
        if (!tourScores[round.tournament_id][p.voter_key]) tourScores[round.tournament_id][p.voter_key] = 0
        tourScores[round.tournament_id][p.voter_key] += pts
      })

      const board = []
      Object.entries(tourScores).forEach(([tourId, scores]) => {
        const tour = tourMap[tourId]
        if (!tour) return
        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
        const perPoint = totalScore > 0 && tour.prize_pool > 0 ? tour.prize_pool / totalScore : 0
        Object.entries(scores).forEach(([vk, score]) => {
          board.push({ tourId, tourName: `${tour.year ? tour.year + ' · ' : ''}${tour.name}`, voter_key: vk, name: subMap[vk] || 'Хэрэглэгч', score, prize: Math.round(score * perPoint) })
        })
      })
      board.sort((a, b) => b.score - a.score)
      setLeaderboard(board)
    }

    setLoading(false)
  }, [])

  const checkAuth = useCallback(async () => {
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('voter_key', VOTER_KEY).eq('status', 'active').gt('expires_at', new Date().toISOString())
    setIsSubscribed(!!(sub && sub.length > 0))
    if (tgUser?.id) {
      const { data: adm } = await supabase.from('admins').select('tg_id').eq('tg_id', String(tgUser.id))
      setIsAdmin(!!(adm && adm.length > 0))
    }
    const { data: settings } = await supabase.from('settings').select('key,value')
    if (settings) {
      const m = {}; settings.forEach(s => { m[s.key] = s.value })
      setPrices({ standard: Number(m.price_standard || 5000), premium: Number(m.price_premium || 15000) })
    }
  }, [])

  useEffect(() => {
    tg?.ready(); tg?.expand()
    checkAuth(); fetchAll()
  }, [fetchAll, checkAuth])

  // Tournament CRUD
  const saveTournament = async () => {
    if (!tForm.name) { showToast('Нэр сонгоно уу'); return }
    if (editTournament) {
      await supabase.from('tournaments').update({ name: tForm.name, year: tForm.year, prize_pool: tForm.prize_pool }).eq('id', editTournament.id)
      showToast('Засагдлаа!')
    } else {
      const { data } = await supabase.from('tournaments').insert({ name: tForm.name, year: tForm.year, prize_pool: tForm.prize_pool }).select().single()
      if (data) {
        // Автоматаар 5 давааны round үүсгэнэ
        await supabase.from('tournament_rounds').insert(
          ROUND_TYPES.map(r => ({ tournament_id: data.id, round_type: r.type }))
        )
      }
      showToast('Нэмэгдлээ!')
    }
    setShowTournamentForm(false); setEditTournament(null)
    setTForm({ name: '', year: new Date().getFullYear(), prize_pool: 0 })
    fetchAll()
  }

  const deleteTournament = async (t) => {
    const rounds = tournamentRounds.filter(r => r.tournament_id === t.id)
    const roundIds = rounds.map(r => r.id)
    const { data: picks } = roundIds.length > 0
      ? await supabase.from('round_picks').select('id').in('round_id', roundIds).limit(1)
      : { data: [] }

    if (picks && picks.length > 0) {
      setConfirm({
        msg: 'Идэвхтэй таавар байна. Устгах уу?',
        onConfirm: async () => {
          if (roundIds.length > 0) await supabase.from('round_picks').delete().in('round_id', roundIds)
          await supabase.from('tournament_rounds').delete().eq('tournament_id', t.id)
          await supabase.from('tournaments').delete().eq('id', t.id)
          setConfirm(null); showToast('Устгагдлаа!'); fetchAll()
        }
      })
    } else {
      if (roundIds.length > 0) await supabase.from('round_picks').delete().in('round_id', roundIds)
      await supabase.from('tournament_rounds').delete().eq('tournament_id', t.id)
      await supabase.from('tournaments').delete().eq('id', t.id)
      showToast('Устгагдлаа!'); fetchAll()
    }
  }

  // Picks
  const togglePick = async (round, wrestlerName) => {
    if (!isSubscribed) { setSubPage(true); return }
    const key = `${round.id}_${wrestlerName}`
    const myRoundPicks = Object.keys(myPicks).filter(k => k.startsWith(`${round.id}_`)).length
    const maxPicks = Number(round.round_type)

    if (myPicks[key]) {
      await supabase.from('round_picks').delete().eq('round_id', round.id).eq('voter_key', VOTER_KEY).eq('wrestler_name', wrestlerName)
      setMyPicks(p => { const n = { ...p }; delete n[key]; return n })
      setPickCounts(p => ({ ...p, [key]: Math.max(0, (p[key] || 1) - 1) }))
      showToast('Сонголт цуцлагдлаа')
    } else {
      if (myRoundPicks >= maxPicks) { showToast(`Хамгийн ихдээ ${maxPicks} бөх сонгоно`); return }
      const { error } = await supabase.from('round_picks').insert({ round_id: round.id, voter_key: VOTER_KEY, wrestler_name: wrestlerName })
      if (error) { showToast('Алдаа гарлаа'); return }
      setMyPicks(p => ({ ...p, [key]: { is_correct: false } }))
      setPickCounts(p => ({ ...p, [key]: (p[key] || 0) + 1 }))
      showToast('Таамаглал нэмэгдлээ!')
    }
  }

  const markCorrect = async (round, wrestlerName, current) => {
    await supabase.from('round_picks').update({ is_correct: !current }).eq('round_id', round.id).eq('wrestler_name', wrestlerName)
    showToast(!current ? '✓ Зөв тэмдэглэгдлээ!' : 'Цуцлагдлаа')
    fetchAll()
  }

  const addWrestlerToList = async () => {
    if (!newWrestler.name.trim()) { showToast('Нэр оруулна уу'); return }
    const exists = wrestlers.find(w => w.name.toLowerCase() === newWrestler.name.trim().toLowerCase())
    if (exists) { showToast('Энэ нэртэй бөх байна'); return }
    await supabase.from('wrestlers').insert({ name: newWrestler.name.trim(), title: newWrestler.title, devjee: newWrestler.devjee })
    setNewWrestler({ name: '', title: 'Улсын начин', devjee: 'Улаанбаатар' })
    setShowAddWrestler(null)
    showToast('Бөх нэмэгдлээ!')
    fetchAll()
  }

  const subscribe = async (plan) => {
    setSubLoading(true)
    const exp = new Date(); exp.setMonth(exp.getMonth() + 1)
    await supabase.from('subscriptions').upsert({ voter_key: VOTER_KEY, plan, status: 'active', expires_at: exp.toISOString(), tg_user_id: tgUser?.id ? String(tgUser.id) : null, tg_username: tgUser?.username || null }, { onConflict: 'voter_key' })
    setSubLoading(false); setIsSubscribed(true); setSubPage(false)
    showToast('Subscription идэвхжлээ! 🎉')
  }

  // Filtered wrestlers
  const filteredWrestlers = wrestlers.filter(w =>
    (!filterTitle || w.title === filterTitle) &&
    (!filterDevjee || w.devjee === filterDevjee) &&
    (!searchName || w.name.toLowerCase().includes(searchName.toLowerCase()))
  )

  // My score per tournament
  const myScoreByTour = (tourId) => {
    const rounds = tournamentRounds.filter(r => r.tournament_id === tourId)
    let score = 0
    rounds.forEach(r => {
      Object.keys(myPicks).forEach(key => {
        if (key.startsWith(`${r.id}_`) && myPicks[key]?.is_correct) {
          score += ROUND_POINTS[r.round_type] || 1
        }
      })
    })
    return score
  }

  // ── CONFIRM DIALOG ──
  const ConfirmDialog = () => !confirm ? null : (
    <div style={{ position: 'fixed', inset: 0, background: '#00000080', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.bg, borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>⚠️ Анхааруулга</div>
        <div style={{ fontSize: 13, color: C.hint, marginBottom: 20 }}>{confirm.msg}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={st.primaryBtn} onClick={confirm.onConfirm}>Устгах</button>
          <button style={st.cancelBtn} onClick={() => setConfirm(null)}>Болих</button>
        </div>
      </div>
    </div>
  )

  // ── PREDICT PAGE ──
  const PredictPage = () => (
    <div>
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>🤼 Таамаглал</div>
        {isAdmin && (
          <button onClick={() => { setShowTournamentForm(true); setEditTournament(null); setTForm({ name: '', year: new Date().getFullYear(), prize_pool: 0 }) }}
            style={{ fontSize: 12, background: C.btn, color: C.btnText, border: 'none', padding: '6px 12px', borderRadius: 20, cursor: 'pointer' }}>
            + Барилдаан нэмэх
          </button>
        )}
      </div>

      {isAdmin && showTournamentForm && (
        <div style={st.formCard}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{editTournament ? 'Барилдаан засах' : 'Шинэ барилдаан'}</div>
          <div style={{ marginBottom: 10 }}>
            <label style={st.label}>Барилдааны нэр</label>
            <select style={st.input} value={tForm.name} onChange={e => setTForm(p => ({ ...p, name: e.target.value }))}>
              <option value="">Сонгоно уу</option>
              {TOURNAMENT_NAMES.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div style={st.formRow}>
            <div>
              <label style={st.label}>Он</label>
              <input style={st.input} type="number" min="2000" max="2100" value={tForm.year} onChange={e => setTForm(p => ({ ...p, year: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={st.label}>Шагналын сан (₮)</label>
              <input style={st.input} type="text" inputMode="numeric" pattern="[0-9]*" value={tForm.prize_pool === 0 ? '' : tForm.prize_pool} placeholder="100000" onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setTForm(p => ({ ...p, prize_pool: v === '' ? 0 : Number(v) })) }} onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={st.primaryBtn} onClick={saveTournament}>{editTournament ? 'Хадгалах' : 'Нэмэх'}</button>
            <button style={st.cancelBtn} onClick={() => { setShowTournamentForm(false); setEditTournament(null) }}>Болих</button>
          </div>
        </div>
      )}

      {tournaments.length === 0 && <div style={st.empty}>Одоогоор барилдаан байхгүй байна</div>}

      {tournaments.map(t => {
        const tName = `${t.year ? t.year + ' · ' : ''}${t.name}`
        const rounds = tournamentRounds.filter(r => r.tournament_id === t.id)
        const isExpanded = expandedTournament === t.id
        const myScore = myScoreByTour(t.id)

        return (
          <div key={t.id} style={{ marginBottom: 8 }}>
            {/* Tournament header */}
            <div style={{ ...st.card, cursor: 'pointer', padding: '14px 16px' }} onClick={() => setExpandedTournament(isExpanded ? null : t.id)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{tName}</div>
                  <div style={{ fontSize: 12, color: C.hint, marginTop: 2 }}>
                    {t.prize_pool > 0 ? `Шагнал: ${t.prize_pool.toLocaleString()}₮` : 'Шагналын сан тодорхойгүй'}
                    {myScore > 0 && <span style={{ marginLeft: 8, background: '#E8F5E9', color: '#2E7D32', padding: '1px 6px', borderRadius: 8, fontSize: 11 }}>{myScore} оноо</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button style={st.iconBtn(C.btn)} onClick={() => { setEditTournament(t); setTForm({ name: t.name, year: t.year || new Date().getFullYear(), prize_pool: t.prize_pool || 0 }); setShowTournamentForm(true) }}>✏️</button>
                      <button style={st.iconBtn('#e53935')} onClick={() => deleteTournament(t)}>🗑</button>
                    </div>
                  )}
                  <span style={{ color: C.hint, fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
            </div>

            {/* Rounds */}
            {isExpanded && (
              <div style={{ margin: '0 12px', border: `1px solid ${C.sec}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                {ROUND_TYPES.map((rt, idx) => {
                  const round = rounds.find(r => r.round_type === rt.type)
                  if (!round) return null
                  const isRoundExpanded = expandedRound === round.id
                  const myRoundPicks = Object.keys(myPicks).filter(k => k.startsWith(`${round.id}_`)).length

                  return (
                    <div key={rt.type} style={{ borderBottom: idx < ROUND_TYPES.length - 1 ? `1px solid ${C.sec}` : 'none' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: isRoundExpanded ? C.sec : 'transparent' }}
                        onClick={() => { setExpandedRound(isRoundExpanded ? null : round.id); setFilterTitle(''); setFilterDevjee(''); setSearchName('') }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{rt.label}</div>
                          <div style={{ fontSize: 11, color: C.hint }}>
                            {rt.points} оноо/бөх · Хамгийн ихдээ {rt.max} бөх
                            {myRoundPicks > 0 && <span style={{ marginLeft: 6, color: C.btn, fontWeight: 600 }}>{myRoundPicks} таасан</span>}
                          </div>
                        </div>
                        <span style={{ color: C.hint }}>{isRoundExpanded ? '▲' : '▼'}</span>
                      </div>

                      {isRoundExpanded && (
                        <div style={{ padding: '0 0 12px' }}>
                          {/* Filters */}
                          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', flexWrap: 'wrap' }}>
                            <input style={{ ...st.input, flex: 2, minWidth: 100, fontSize: 12 }} placeholder="Нэрээр хайх..." value={searchName} onChange={e => setSearchName(e.target.value)} />
                            <select style={{ ...st.input, flex: 1, minWidth: 80, fontSize: 11 }} value={filterTitle} onChange={e => setFilterTitle(e.target.value)}>
                              <option value="">Бүх цол</option>
                              {[...new Set(wrestlers.map(w => w.title).filter(Boolean))].sort().map(t => <option key={t}>{t}</option>)}
                            </select>
                            <select style={{ ...st.input, flex: 1, minWidth: 80, fontSize: 11 }} value={filterDevjee} onChange={e => setFilterDevjee(e.target.value)}>
                              <option value="">Бүх дэвжээ</option>
                              {[...new Set(wrestlers.map(w => w.devjee).filter(Boolean))].sort().map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>

                          {/* Wrestler list */}
                          {(() => {
                            const maxPicks = Number(round.round_type)
                            const myRoundPickKeys = Object.keys(myPicks).filter(k => k.startsWith(`${round.id}_`))
                            const myRoundPickCount = myRoundPickKeys.length
                            const isFull = myRoundPickCount >= maxPicks

                            // If full, show only selected wrestlers
                            const displayWrestlers = isFull
                              ? wrestlers.filter(w => myPicks[`${round.id}_${w.name}`])
                              : filteredWrestlers

                            return (
                              <>
                                {isFull && (
                                  <div style={{ margin: '8px 12px', background: '#E8F5E9', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>
                                    ✓ {maxPicks} бөх сонгосон — сонгосон бөхөө дарж хүчингүй болгоно
                                  </div>
                                )}
                                {displayWrestlers.map(w => {
                                  const key = `${round.id}_${w.name}`
                                  const selected = !!myPicks[key]
                                  const correct = myPicks[key]?.is_correct
                                  const count = pickCounts[key] || 0
                                  const canClick = selected || !isFull

                                  return (
                                    <div key={w.id}
                                      onClick={() => !isAdmin && canClick && togglePick(round, w.name)}
                                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${C.sec}40`, background: selected ? '#E3F2FD' : correct ? '#E8F5E9' : 'transparent', cursor: isAdmin ? 'default' : canClick ? 'pointer' : 'not-allowed', opacity: !isAdmin && isFull && !selected ? 0.4 : 1 }}>
                                      <div style={{ width: 24, height: 24, borderRadius: 6, border: selected ? '2px solid #3390ec' : `1.5px solid ${C.hint}60`, background: selected ? '#3390ec' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>
                                        {selected ? '✓' : ''}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: selected ? 600 : 500, color: correct ? '#2E7D32' : selected ? '#1565C0' : C.text }}>
                                          {correct ? '🏆 ' : ''}{w.name}
                                        </div>
                                        {(w.title || w.devjee) && <div style={{ fontSize: 11, color: C.hint }}>{[w.title, w.devjee].filter(Boolean).join(' · ')}</div>}
                                      </div>
                                      <div style={{ fontSize: 11, color: C.hint, textAlign: 'right' }}>
                                        <div>{count} санал</div>
                                        {isAdmin && (
                                          <button style={{ ...st.iconBtn('#2E7D32'), fontSize: 12 }} onClick={e => { e.stopPropagation(); markCorrect(round, w.name, correct) }}>
                                            {correct ? '✓ Зөв' : '🏆'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </>
                            )
                          })()}

                          {/* Add wrestler */}
                          {showAddWrestler === round.id ? (
                            <div style={{ padding: '12px', borderTop: `1px solid ${C.sec}` }}>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Бөх нэмэх</div>
                              <input style={{ ...st.input, marginBottom: 8 }} placeholder="Бөхийн нэр" value={newWrestler.name} onChange={e => setNewWrestler(p => ({ ...p, name: e.target.value }))} />
                              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select style={{ ...st.input, flex: 1, fontSize: 12 }} value={newWrestler.title} onChange={e => setNewWrestler(p => ({ ...p, title: e.target.value }))}>
                                  {TITLES.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <select style={{ ...st.input, flex: 1, fontSize: 12 }} value={newWrestler.devjee} onChange={e => setNewWrestler(p => ({ ...p, devjee: e.target.value }))}>
                                  {DEVJEE.map(d => <option key={d}>{d}</option>)}
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button style={st.primaryBtn} onClick={addWrestlerToList}>Нэмэх</button>
                                <button style={st.cancelBtn} onClick={() => setShowAddWrestler(null)}>Болих</button>
                              </div>
                            </div>
                          ) : (
                            <button style={st.addBtn(C.btn)} onClick={() => setShowAddWrestler(round.id)}>
                              + Жагсаалтад байхгүй бөх нэмэх
                            </button>
                          )}

                          {!isSubscribed && (
                            <div style={{ margin: '8px 12px 0', background: '#E3F2FD', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>Таамаглалд оролцохын тулд subscription авна уу</span>
                              <button onClick={() => setSubPage(true)} style={{ background: C.btn, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Авах</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // ── LEADERBOARD PAGE ──
  const LeaderboardPage = () => {
    const tourIds = [...new Set(leaderboard.map(b => b.tourId))]
    return (
      <div>
        <div style={{ padding: '14px 16px 8px' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>🏆 Байрны жагсаалт</div>
        </div>
        {leaderboard.length === 0 && <div style={st.empty}>Одоогоор оноо байхгүй байна</div>}
        {tourIds.map(tourId => {
          const tourBoard = leaderboard.filter(b => b.tourId === tourId)
          const tourName = tourBoard[0]?.tourName || ''
          const myEntry = tourBoard.find(b => b.voter_key === VOTER_KEY)
          return (
            <div key={tourId}>
              <div style={st.secTitle}>{tourName}</div>
              {myEntry && (
                <div style={{ margin: '0 12px 8px', background: '#E3F2FD', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#1565C0', fontWeight: 600 }}>#{tourBoard.findIndex(b => b.voter_key === VOTER_KEY) + 1} · Таны байр</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1565C0' }}>{myEntry.score} оноо</div>
                    <div style={{ fontSize: 11, color: '#1565C0' }}>~{myEntry.prize.toLocaleString()}₮</div>
                  </div>
                </div>
              )}
              {tourBoard.slice(0, 20).map((b, i) => (
                <div key={b.voter_key} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: b.voter_key === VOTER_KEY ? '#E3F2FD' : C.bg }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : C.sec, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < 3 ? 16 : 13, fontWeight: 700, flexShrink: 0, color: i < 3 ? '#fff' : C.hint }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: C.hint }}>{b.score} оноо</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2E7D32' }}>{b.prize.toLocaleString()}₮</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // ── PROFILE PAGE ──
  const ProfilePage = () => {
    const myTours = tournaments.map(t => {
      const score = myScoreByTour(t.id)
      const tourBoard = leaderboard.filter(b => b.tourId === t.id)
      const rank = tourBoard.findIndex(b => b.voter_key === VOTER_KEY) + 1
      const myEntry = tourBoard.find(b => b.voter_key === VOTER_KEY)
      return { t, score, rank, prize: myEntry?.prize || 0 }
    }).filter(x => x.score > 0)

    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>👤 Профайл</div>
        <div style={{ background: C.sec, borderRadius: 16, padding: 20, marginBottom: 12, textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: C.btn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', margin: '0 auto 12px' }}>
            {tgUser?.username ? tgUser.username[0].toUpperCase() : '👤'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{tgUser?.username || tgUser?.first_name || 'Хэрэглэгч'}</div>
          <div style={{ fontSize: 12, color: C.hint, marginTop: 4 }}>{isSubscribed ? '✓ Идэвхтэй subscription' : 'Subscription байхгүй'}</div>
        </div>

        {myTours.length === 0 ? (
          <div style={st.empty}>Одоогоор оноо байхгүй байна</div>
        ) : (
          myTours.map(({ t, score, rank, prize }) => (
            <div key={t.id} style={st.card}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{t.year ? t.year + ' · ' : ''}{t.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[{ label: 'Байр', value: rank > 0 ? `#${rank}` : '-' }, { label: 'Оноо', value: score }, { label: 'Шагнал', value: `${prize.toLocaleString()}₮` }].map(s => (
                  <div key={s.label} style={{ background: C.sec, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.btn }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: C.hint, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {!isSubscribed && (
          <button onClick={() => setSubPage(true)} style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 12, border: 'none', background: C.btn, color: C.btnText, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Subscription авах
          </button>
        )}
      </div>
    )
  }

  // ── RULES PAGE ──
  const RulesPage = () => (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>💰 Шагналын дүрэм</div>
      <div style={{ background: C.sec, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Давааны оноо</div>
        {ROUND_TYPES.map(r => (
          <div key={r.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.hint}20` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: C.hint }}>Хамгийн ихдээ {r.max} бөх сонгоно</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.btn }}>{r.points} оноо</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.sec, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Тооцооллын дүрэм</div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.9 }}>
          <div>1️⃣ Зөв таасан бөх × Давааны оноо = Таны оноо</div>
          <div>2️⃣ Бүх оролцогчдын нийт онооны нийлбэр</div>
          <div>3️⃣ Шагналын сан ÷ Нийт оноо = 1 онооны үнэ</div>
          <div>4️⃣ Таны оноо × 1 онооны үнэ = Таны шагнал</div>
        </div>
      </div>
      <div style={{ background: '#FFF8E1', borderRadius: 16, padding: 16, border: '1px solid #FFD54F' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>📌 Жишээ</div>
        <div style={{ fontSize: 12, color: C.hint, lineHeight: 1.9 }}>
          <div>• Шөвгийн 16-аас 15 зөв → 15×1 = 15 оноо</div>
          <div>• Шөвгийн 8-аас 4 зөв → 4×2 = 8 оноо</div>
          <div>• Түрүү бөхийг зөв → 1×16 = 16 оноо</div>
          <div style={{ marginTop: 8, fontWeight: 600, color: C.text }}>Нийт: 39 оноо</div>
        </div>
      </div>
    </div>
  )

  // ── SUBSCRIPTION PAGE ──
  const SubPageComp = () => (
    <div style={{ padding: '24px 16px' }}>
      <button onClick={() => setSubPage(false)} style={{ background: 'none', border: 'none', color: C.btn, fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Буцах</button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Subscription авах</div>
        <div style={{ fontSize: 13, color: C.hint }}>Тааварт оролцож, шагнал хүртэх</div>
      </div>
      {[
        { plan: 'standard', label: 'Стандарт', price: prices.standard, color: C.btn, features: ['Бүх барилдааны тааварт оролцох', 'Leaderboard харах', 'Оноо цуглуулах'] },
        { plan: 'premium', label: 'Premium ⭐', price: prices.premium, color: '#F57F17', features: ['Стандартын бүх эрх', 'Дэлгэрэнгүй статистик', 'Premium тэмдэг 🥇'] }
      ].map(p => (
        <div key={p.plan} style={{ background: p.plan === 'premium' ? '#FFF8E1' : C.sec, borderRadius: 16, padding: 20, marginBottom: 12, border: p.plan === 'premium' ? '1.5px solid #FFD54F' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div><div style={{ fontSize: 16, fontWeight: 600 }}>{p.label}</div><div style={{ fontSize: 12, color: C.hint }}>1 сар</div></div>
            <div style={{ fontSize: 22, fontWeight: 700, color: p.color }}>{p.price.toLocaleString()}₮</div>
          </div>
          <div style={{ fontSize: 12, color: C.hint, marginBottom: 16, lineHeight: 1.7 }}>{p.features.map((f, i) => <div key={i}>✓ {f}</div>)}</div>
          <button style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: p.color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: subLoading ? 0.6 : 1 }} onClick={() => subscribe(p.plan)} disabled={subLoading}>
            {subLoading ? 'Уншиж байна...' : `${p.label} авах`}
          </button>
        </div>
      ))}
    </div>
  )

  if (subPage) return <div style={st.wrap}><SubPageComp /><div style={st.toastEl(toast)}>{toast}</div></div>

  return (
    <div style={st.wrap}>
      <div style={st.header}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>🤼 Монгол Бөх</div>
          <div style={{ fontSize: 11, color: C.hint }}>Барилдааны урьдчилан таамаглал</div>
        </div>
        {isSubscribed ? (
          <div style={{ fontSize: 11, background: '#E8F5E9', color: '#2E7D32', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>✓ Идэвхтэй</div>
        ) : (
          <button onClick={() => setSubPage(true)} style={{ fontSize: 12, background: C.btn, color: C.btnText, border: 'none', padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}>Subscription</button>
        )}
      </div>

      {loading ? <div style={st.empty}>Уншиж байна...</div> : (
        <>
          {page === 'leaderboard' && <LeaderboardPage />}
          {page === 'profile' && <ProfilePage />}
          {page === 'predict' && <PredictPage />}
          {page === 'rules' && <RulesPage />}
        </>
      )}

      <nav style={st.navBar}>
        {NAV.map(item => (
          <button key={item.id} style={st.navItem(page === item.id)} onClick={() => setPage(item.id)}>
            <span style={st.navIcon}>{item.icon}</span>
            <span style={st.navLabel(page === item.id)}>{item.label}</span>
          </button>
        ))}
      </nav>

      <ConfirmDialog />
      <div style={st.toastEl(toast)}>{toast}</div>
    </div>
  )
}
