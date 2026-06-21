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

const COLORS = {
  bg: 'var(--tg-theme-bg-color, #ffffff)',
  secondary: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
  text: 'var(--tg-theme-text-color, #222222)',
  hint: 'var(--tg-theme-hint-color, #888888)',
  button: 'var(--tg-theme-button-color, #3390ec)',
  buttonText: 'var(--tg-theme-button-text-color, #ffffff)',
}

export default function App() {
  const [tab, setTab] = useState('active')
  const [matches, setMatches] = useState([])
  const [history, setHistory] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [voteCounts, setVoteCounts] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', blue_name: '', blue_title: 'Улсын начин', blue_devjee: 'Улаанбаатар', red_name: '', red_title: 'Улсын начин', red_devjee: 'Улаанбаатар', round: 1, status: 'upcoming' })
  const [toast, setToast] = useState('')

  // Subscription
  const [subPage, setSubPage] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [prices, setPrices] = useState({ standard: 5000, premium: 15000, stars_standard: 50, stars_premium: 150 })
  const [subLoading, setSubLoading] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
    tg?.HapticFeedback?.notificationOccurred('success')
  }

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('key, value')
    if (!data) return
    const map = {}
    data.forEach(r => { map[r.key] = r.value })
    setPrices({
      standard: Number(map.price_standard || 5000),
      premium: Number(map.price_premium || 15000),
      stars_standard: Number(map.stars_standard || 50),
      stars_premium: Number(map.stars_premium || 150),
    })
  }, [])

  const checkSubscription = useCallback(async () => {
    const { data } = await supabase.from('subscriptions')
      .select('*')
      .eq('voter_key', VOTER_KEY)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
    setIsSubscribed(!!(data && data.length > 0))
  }, [])

  const checkAdmin = useCallback(async () => {
    if (!tgUser?.id) return
    const { data } = await supabase.from('admins')
      .select('tg_id')
      .eq('tg_id', String(tgUser.id))
    setIsAdmin(!!(data && data.length > 0))
  }, [])

  const fetchData = useCallback(async () => {
    const [{ data: active }, { data: done }] = await Promise.all([
      supabase.from('matches').select('*').in('status', ['upcoming', 'live']).order('created_at', { ascending: false }),
      supabase.from('matches').select('*').eq('status', 'closed').order('created_at', { ascending: false }).limit(20),
    ])
    setMatches(active || [])
    setHistory(done || [])

    const allIds = [...(active || []), ...(done || [])].map(m => m.id)
    if (allIds.length === 0) { setLoading(false); return }

    const { data: votes } = await supabase.from('votes').select('match_id, side, voter_key').in('match_id', allIds)
    if (!votes) { setLoading(false); return }

    const counts = {}
    const mine = {}
    votes.forEach(v => {
      if (!counts[v.match_id]) counts[v.match_id] = { blue: 0, red: 0 }
      counts[v.match_id][v.side]++
      if (v.voter_key === VOTER_KEY) mine[v.match_id] = v.side
    })
    setVoteCounts(counts)
    setMyVotes(mine)
    setLoading(false)
  }, [])

  useEffect(() => {
    tg?.ready()
    tg?.expand()
    fetchSettings()
    checkSubscription()
    checkAdmin()
    fetchData()

    const channel = supabase.channel('realtime-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchData, fetchSettings, checkSubscription, checkAdmin])

  const subscribe = async (plan) => {
    setSubLoading(true)
    const months = 1
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + months)

    const { error } = await supabase.from('subscriptions').upsert({
      voter_key: VOTER_KEY,
      plan,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      tg_user_id: tgUser?.id ? String(tgUser.id) : null,
      tg_username: tgUser?.username || null,
    }, { onConflict: 'voter_key' })

    setSubLoading(false)
    if (error) { showToast('Алдаа гарлаа'); return }
    setIsSubscribed(true)
    setSubPage(false)
    showToast('Subscription идэвхжлээ! 🎉')
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

  const declareWinner = async (matchId, side) => {
    const { error } = await supabase.from('matches').update({ status: 'closed', winner: side }).eq('id', matchId)
    if (error) { showToast('Алдаа гарлаа'); return }
    const match = matches.find(m => m.id === matchId)
    const name = side === 'blue' ? match?.blue_name : match?.red_name
    showToast(`${name} давлаа!`)
    fetchData()
  }

  const addMatch = async () => {
    if (!form.blue_name.trim() || !form.red_name.trim()) { showToast('Бөхийн нэр оруулна уу'); return }
    const { error } = await supabase.from('matches').insert({
      name: form.name.trim() || null,
      blue_name: form.blue_name.trim(),
      blue_title: form.blue_title,
      blue_devjee: form.blue_devjee,
      red_name: form.red_name.trim(),
      red_title: form.red_title,
      red_devjee: form.red_devjee,
      round: Number(form.round),
      status: form.status,
    })
    if (error) { showToast('Алдаа гарлаа'); return }
    setShowForm(false)
    setForm({ name: '', blue_name: '', blue_title: 'Улсын начин', blue_devjee: 'Улаанбаатар', red_name: '', red_title: 'Улсын начин', red_devjee: 'Улаанбаатар', round: 1, status: 'upcoming' })
    showToast('Барилдаан нэмэгдлээ!')
    fetchData()
  }

  const getProb = (matchId) => {
    const c = voteCounts[matchId] || { blue: 0, red: 0 }
    const total = c.blue + c.red
    if (total === 0) return 50
    return Math.round((c.blue / total) * 100)
  }

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const s = {
    wrap: { minHeight: '100vh', background: COLORS.bg, color: COLORS.text, paddingBottom: 80 },
    header: { padding: '16px 16px 8px', borderBottom: `1px solid ${COLORS.secondary}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 18, fontWeight: 600 },
    subtitle: { fontSize: 12, color: COLORS.hint, marginTop: 2 },
    tabs: { display: 'flex', gap: 8, padding: '12px 16px' },
    tab: (active) => ({ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, background: active ? COLORS.button : COLORS.secondary, color: active ? COLORS.buttonText : COLORS.text }),
    card: { background: COLORS.bg, border: `1px solid ${COLORS.secondary}`, borderRadius: 16, padding: 16, margin: '0 12px 12px' },
    badge: (live) => ({ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: live ? '#ff3b3020' : COLORS.secondary, color: live ? '#e53935' : COLORS.hint }),
    wrestlers: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', margin: '12px 0' },
    wrestler: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
    avatar: (color) => ({ width: 52, height: 52, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: '#fff' }),
    name: { fontSize: 13, fontWeight: 500, textAlign: 'center' },
    titleText: { fontSize: 10, color: COLORS.hint, textAlign: 'center' },
    vs: { fontSize: 16, fontWeight: 600, color: COLORS.hint },
    barWrap: { borderRadius: 8, overflow: 'hidden', height: 26, display: 'flex', background: COLORS.secondary, margin: '8px 0' },
    barBlue: (p) => ({ width: `${p}%`, background: '#3390ec', display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 600, color: '#fff', transition: 'width 0.4s' }),
    barRed: (p) => ({ width: `${p}%`, background: '#e53935', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontSize: 11, fontWeight: 600, color: '#fff', transition: 'width 0.4s' }),
    voteRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 },
    voteBtn: (sel, color) => ({ padding: '10px 8px', borderRadius: 10, border: sel ? `2px solid ${color}` : `1px solid ${COLORS.secondary}`, background: sel ? `${color}18` : COLORS.secondary, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: sel ? color : COLORS.text, transition: 'all 0.15s' }),
    winRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 },
    winBtn: (color) => ({ padding: '8px', borderRadius: 10, border: `1px solid ${color}40`, background: `${color}10`, cursor: 'pointer', fontSize: 11, fontWeight: 500, color }),
    addBtn: { display: 'block', width: 'calc(100% - 24px)', margin: '0 12px 12px', padding: 14, borderRadius: 12, border: `1.5px dashed ${COLORS.hint}60`, background: 'transparent', cursor: 'pointer', fontSize: 14, color: COLORS.hint },
    formCard: { background: COLORS.secondary, borderRadius: 16, padding: 16, margin: '0 12px 12px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
    label: { fontSize: 11, color: COLORS.hint, marginBottom: 4, display: 'block' },
    input: { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${COLORS.hint}40`, background: COLORS.bg, color: COLORS.text, fontSize: 13, outline: 'none' },
    primaryBtn: { flex: 1, padding: 12, borderRadius: 10, border: 'none', background: COLORS.button, color: COLORS.buttonText, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    cancelBtn: { padding: '12px 16px', borderRadius: 10, border: `1px solid ${COLORS.hint}40`, background: 'transparent', color: COLORS.hint, fontSize: 14, cursor: 'pointer' },
    winnerBadge: (side) => ({ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: side === 'blue' ? '#3390ec20' : '#e5393520', color: side === 'blue' ? '#3390ec' : '#e53935', marginBottom: 8 }),
    toastEl: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#222', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, zIndex: 999, opacity: toast ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none', whiteSpace: 'nowrap' },
    empty: { textAlign: 'center', color: COLORS.hint, fontSize: 13, padding: '32px 0' },
  }

  const MatchCard = ({ m, isHistory }) => {
    const c = voteCounts[m.id] || { blue: 0, red: 0 }
    const prob = getProb(m.id)
    const redProb = 100 - prob
    const total = c.blue + c.red
    const myV = myVotes[m.id]

    return (
      <div style={s.card}>
        {m.name && <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.button, marginBottom: 6 }}>{m.name}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={s.badge(m.status === 'live')}>{m.status === 'live' ? '● Шууд' : m.status === 'upcoming' ? 'Удахгүй' : 'Дууссан'}</span>
          <span style={{ fontSize: 12, color: COLORS.hint }}>{m.round}-р давааны барилдаан</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: COLORS.hint }}>{total} санал</span>
        </div>

        {m.winner && (
          <div style={{ textAlign: 'center' }}>
            <span style={s.winnerBadge(m.winner)}>🏆 {m.winner === 'blue' ? m.blue_name : m.red_name} давлаа</span>
          </div>
        )}

        <div style={s.wrestlers}>
          <div style={s.wrestler}>
            <div style={s.avatar('#3390ec')}>{getInitials(m.blue_name)}</div>
            <div style={s.name}>{m.blue_name}</div>
            <div style={s.titleText}>{m.blue_title}</div>
            {m.blue_devjee && <div style={{...s.titleText, fontSize: 10}}>{m.blue_devjee} дэвжээ</div>}
          </div>
          <div style={s.vs}>VS</div>
          <div style={s.wrestler}>
            <div style={s.avatar('#e53935')}>{getInitials(m.red_name)}</div>
            <div style={s.name}>{m.red_name}</div>
            <div style={s.titleText}>{m.red_title}</div>
            {m.red_devjee && <div style={{...s.titleText, fontSize: 10}}>{m.red_devjee} дэвжээ</div>}
          </div>
        </div>

        <div style={s.barWrap}>
          <div style={s.barBlue(prob)}>{prob > 15 ? `${prob}%` : ''}</div>
          <div style={s.barRed(redProb)}>{redProb > 15 ? `${redProb}%` : ''}</div>
        </div>

        {!isHistory && (
          <>
            <div style={s.voteRow}>
              <button style={s.voteBtn(myV === 'blue', '#3390ec')} onClick={() => vote(m.id, 'blue')}>
                👍 {m.blue_name}<br />
                <span style={{ fontSize: 10, fontWeight: 400 }}>{c.blue} санал · {prob}%</span>
              </button>
              <button style={s.voteBtn(myV === 'red', '#e53935')} onClick={() => vote(m.id, 'red')}>
                👍 {m.red_name}<br />
                <span style={{ fontSize: 10, fontWeight: 400 }}>{c.red} санал · {redProb}%</span>
              </button>
            </div>
            {isAdmin && (
              <div style={s.winRow}>
                <button style={s.winBtn('#3390ec')} onClick={() => declareWinner(m.id, 'blue')}>🏆 {m.blue_name} давлаа</button>
                <button style={s.winBtn('#e53935')} onClick={() => declareWinner(m.id, 'red')}>🏆 {m.red_name} давлаа</button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Subscription хуудас
  const SubPage = () => (
    <div style={{ padding: '24px 16px' }}>
      <button onClick={() => setSubPage(false)} style={{ background: 'none', border: 'none', color: COLORS.button, fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Буцах</button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Subscription авах</div>
        <div style={{ fontSize: 13, color: COLORS.hint }}>Барилдааны тааварт оролцож, оноо цуглуул</div>
      </div>

      {/* Стандарт */}
      <div style={{ background: COLORS.secondary, borderRadius: 16, padding: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Стандарт</div>
            <div style={{ fontSize: 12, color: COLORS.hint }}>1 сар</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.button }}>{prices.standard.toLocaleString()}₮</div>
            <div style={{ fontSize: 11, color: COLORS.hint }}>{prices.stars_standard} ⭐ Stars</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: COLORS.hint, marginBottom: 16, lineHeight: 1.7 }}>
          ✓ Бүх барилдаанд санал өгөх<br />
          ✓ Виртуал оноо цуглуулах<br />
          ✓ Leaderboard харах
        </div>
        <button
          style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: COLORS.button, color: COLORS.buttonText, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: subLoading ? 0.6 : 1 }}
          onClick={() => subscribe('standard')}
          disabled={subLoading}
        >
          {subLoading ? 'Уншиж байна...' : 'Стандарт авах'}
        </button>
      </div>

      {/* Premium */}
      <div style={{ background: '#FFF8E1', borderRadius: 16, padding: 20, border: '1.5px solid #FFD54F' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Premium ⭐</div>
            <div style={{ fontSize: 12, color: COLORS.hint }}>1 сар</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#F57F17' }}>{prices.premium.toLocaleString()}₮</div>
            <div style={{ fontSize: 11, color: COLORS.hint }}>{prices.stars_premium} ⭐ Stars</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: COLORS.hint, marginBottom: 16, lineHeight: 1.7 }}>
          ✓ Стандартын бүх эрх<br />
          ✓ Дэлгэрэнгүй статистик<br />
          ✓ Бөхийн түүх харах<br />
          ✓ Premium тэмдэг 🥇
        </div>
        <button
          style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#F57F17', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: subLoading ? 0.6 : 1 }}
          onClick={() => subscribe('premium')}
          disabled={subLoading}
        >
          {subLoading ? 'Уншиж байна...' : 'Premium авах'}
        </button>
      </div>

      <div style={{ fontSize: 11, color: COLORS.hint, textAlign: 'center', marginTop: 16 }}>
        Төлбөр: QPay, SocialPay, Telegram Stars
      </div>
    </div>
  )

  if (subPage) return (
    <div style={s.wrap}>
      <SubPage />
      <div style={s.toastEl}>{toast}</div>
    </div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <div style={s.title}>🤼 Монгол Бөх</div>
          <div style={s.subtitle}>Барилдааны урьдчилан таамаглал</div>
        </div>
        {isSubscribed ? (
          <div style={{ fontSize: 11, background: '#E8F5E9', color: '#2E7D32', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>✓ Идэвхтэй</div>
        ) : (
          <button onClick={() => setSubPage(true)} style={{ fontSize: 12, background: COLORS.button, color: COLORS.buttonText, border: 'none', padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}>
            Subscription
          </button>
        )}
      </div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'active')} onClick={() => setTab('active')}>Идэвхтэй</button>
        <button style={s.tab(tab === 'history')} onClick={() => setTab('history')}>Түүх</button>
      </div>

      {loading ? (
        <div style={s.empty}>Уншиж байна...</div>
      ) : tab === 'active' ? (
        <>
          {!isSubscribed && (
            <div style={{ margin: '0 12px 12px', background: '#E3F2FD', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Санал өгөхийн тулд subscription авна уу</span>
              <button onClick={() => setSubPage(true)} style={{ background: COLORS.button, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Авах</button>
            </div>
          )}
          {matches.length === 0 && <div style={s.empty}>Одоогоор барилдаан байхгүй байна</div>}
          {matches.map(m => <MatchCard key={m.id} m={m} isHistory={false} />)}

          {isAdmin && !showForm ? (
            <button style={s.addBtn} onClick={() => setShowForm(true)}>+ Шинэ барилдаан нэмэх</button>
          ) : isAdmin ? (
            <div style={s.formCard}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Шинэ барилдаан</div>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>Барилдааны нэр</label>
                <input style={s.input} placeholder="2026 оны улсын баяр наадам" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Цэнхэр бөх</label>
                  <input style={s.input} placeholder="Б. Болд" value={form.blue_name} onChange={e => setForm(p => ({ ...p, blue_name: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>Улаан бөх</label>
                  <input style={s.input} placeholder="Д. Ганбат" value={form.red_name} onChange={e => setForm(p => ({ ...p, red_name: e.target.value }))} />
                </div>
              </div>
              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Цол (цэнхэр)</label>
                  <select style={s.input} value={form.blue_title} onChange={e => setForm(p => ({ ...p, blue_title: e.target.value }))}>
                    {TITLES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Цол (улаан)</label>
                  <select style={s.input} value={form.red_title} onChange={e => setForm(p => ({ ...p, red_title: e.target.value }))}>
                    {TITLES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Дэвжээ (цэнхэр)</label>
                  <select style={s.input} value={form.blue_devjee} onChange={e => setForm(p => ({ ...p, blue_devjee: e.target.value }))}>
                    {DEVJEE.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Дэвжээ (улаан)</label>
                  <select style={s.input} value={form.red_devjee} onChange={e => setForm(p => ({ ...p, red_devjee: e.target.value }))}>
                    {DEVJEE.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Давааны дугаар</label>
                  <input style={s.input} type="number" min="1" max="9" value={form.round} onChange={e => setForm(p => ({ ...p, round: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>Статус</label>
                  <select style={s.input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="upcoming">Удахгүй</option>
                    <option value="live">Шууд</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.primaryBtn} onClick={addMatch}>Нэмэх</button>
                <button style={s.cancelBtn} onClick={() => setShowForm(false)}>Болих</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {history.length === 0 && <div style={s.empty}>Түүх байхгүй байна</div>}
          {history.map(m => <MatchCard key={m.id} m={m} isHistory={true} />)}
        </>
      )}

      <div style={s.toastEl}>{toast}</div>
    </div>
  )
}
