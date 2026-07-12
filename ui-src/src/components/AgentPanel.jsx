import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightning, CheckCircle, ArrowClockwise } from '@phosphor-icons/react'
import { API_BASE } from './SharedComponents'

const pageTransition = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
}

const COMMANDS = [
  { id: 'digest', icon: '📝', label: '帮我总结一下工作群今天都说了什么' },
  { id: 'alert', icon: '🔔', label: '帮我设置 36氪 的文章实时提醒' },
  { id: 'rag',   icon: '🔍', label: '我记得之前有人讨论过用 Redis 做缓存，后来换方案了？' },
]

const TOOL_GROUPS = [
  { cat: '📖 问一问 · 信息查询', items: ['系统状态', '搜索会话', '群聊记忆', '文章搜索', '推送历史'] },
  { cat: '🛠️ 一句话 · 自动执行', items: ['生成摘要', '配置预警', '推送通知', '确认执行'] },
  { cat: '🔍 懂你意 · 语义检索', items: ['向量索引', '语义匹配', '跨源关联'] },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ── Message types used in phone chat ── */
const MT = {
  TIME: 'time',
  USER: 'user',
  BOT: 'bot',
  STEPS: 'steps',
  DIGEST: 'digest',
}

/* ── ClawBot avatar ── */
function ClawAvatar() {
  return (
    <div className="w-[42px] h-[42px] rounded-lg bg-[#ef4545] shrink-0 flex items-center justify-center gap-1 shadow-[0_2px_6px_rgba(239,69,68,0.25)]">
      <div className="w-[9px] h-[9px] bg-white rounded-full" />
      <div className="w-[9px] h-[9px] bg-white rounded-full" />
    </div>
  )
}

/* ── iPhone frame ── */
function PhoneFrame({ chatRef, children, inputHint }) {
  return (
    <div className="w-full max-w-[360px] mx-auto lg:mx-0 shrink-0">
      <div className="h-[640px] bg-[#ededed] rounded-[44px] relative flex flex-col overflow-hidden border-[5px] border-[#1a1a1a]" style={{ boxShadow: '0 30px 70px -10px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)' }}>
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-[16px] z-[100]" />
        <div className="h-12 px-7 pt-4 flex justify-between text-[#1a1a1a] text-[15px] font-semibold shrink-0 z-50">
          <span>15:42</span>
          <span className="text-xs">5G 88</span>
        </div>
        <div className="h-[52px] flex items-center justify-between px-4 border-b border-black/[0.08] shrink-0 bg-[#ededed]">
          <span className="text-[26px] text-black font-light leading-none">‹</span>
          <div className="text-[17px] font-semibold text-[#1a1a1a] flex items-center gap-1.5 tracking-[0.3px]">
            摘星 Agent
            <span className="bg-[#d5d5d5] text-[#555] text-[11px] font-bold py-0.5 px-1.5 rounded">AI</span>
          </div>
          <div className="flex gap-1 items-center px-1 py-2.5">
            <div className="w-[5px] h-[5px] rounded-full bg-black" />
            <div className="w-[5px] h-[5px] rounded-full bg-black" />
            <div className="w-[5px] h-[5px] rounded-full bg-black" />
          </div>
        </div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-[18px_14px] flex flex-col gap-3.5 bg-[#ededed] text-[15px]" style={{ scrollbarWidth: 'none' }}>
          {children}
        </div>
        <div className="h-14 bg-[#f7f7f7] border-t border-black/[0.06] flex items-center px-3 gap-2.5 shrink-0">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#1a1a1a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
          <div className="flex-1 h-10 bg-white rounded-md flex items-center px-3 text-[#1a1a1a] text-[15px] border border-black/[0.08]">
            {inputHint || '给摘星发消息...'}
          </div>
          <svg viewBox="0 0 256 256" width="24" height="24" fill="none" stroke="#1a1a1a" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="128" cy="128" r="40" /><path d="M128 80v-8M128 184v-8M80 128h-8M184 128h-8" /></svg>
          <div className="w-[30px] h-[30px] rounded-full border-[1.5px] border-[#1a1a1a] flex items-center justify-center text-[#1a1a1a] font-bold text-base shrink-0">＋</div>
        </div>
        <div className="h-[22px] bg-[#f7f7f7] flex justify-center items-end pb-1.5 shrink-0">
          <div className="w-[130px] h-[5px] bg-black rounded-[100px]" />
        </div>
      </div>
    </div>
  )
}

/* ── Chat message components ── */
function TimeDivider({ text }) {
  return <div className="text-center text-xs text-[#888] my-1 tracking-[0.3px]">{text}</div>
}

function UserBubble({ text, avatar }) {
  return (
    <div className="flex gap-2.5 items-start flex-row-reverse">
      <img className="w-[42px] h-[42px] rounded-lg shrink-0 object-cover" src={avatar} />
      <div>
        <div className="relative bg-[#95ec69] text-[#1a1a1a] text-[15px] p-[13px_15px] rounded-lg leading-[1.55] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">{text}</div>
      </div>
    </div>
  )
}

function BotBubble({ children }) {
  return (
    <div className="flex gap-2.5 items-start">
      <ClawAvatar />
      <div>
        <div className="relative bg-white text-[#1a1a1a] text-[15px] p-[13px_15px] rounded-lg leading-[1.55] max-w-[78%] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          {children}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-start">
      <ClawAvatar />
      <div>
        <div className="relative bg-white text-[#1a1a1a] text-[15px] p-[13px_15px] rounded-lg leading-[1.55] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <div className="flex gap-1.5 items-center">
            <span className="w-[7px] h-[7px] rounded-full bg-[#aaa] animate-typingBounce" />
            <span className="w-[7px] h-[7px] rounded-full bg-[#aaa] animate-typingBounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-[7px] h-[7px] rounded-full bg-[#aaa] animate-typingBounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function AgentStep({ check, label, result }) {
  return (
    <div className="flex items-start gap-2 text-[14px]">
      <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold border ${
        check ? 'bg-[#07c160]/15 border-[#07c160]/30 text-[#07c160]' : 'bg-white/50 border-black/10 text-[#aaa]'
      }`}>
        {check ? '✓' : '○'}
      </div>
      <div>
        <div className="font-semibold">{label}</div>
        {result && <div className="text-[#07c160] text-[13px]">{result}</div>}
      </div>
    </div>
  )
}

function PushBadge({ bound }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mt-1.5 ${
      bound ? 'bg-[#07c160]/10 text-[#07c160]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
    }`}>
      {bound ? (
        <><CheckCircle size={12} weight="fill" /> 已推送微信</>
      ) : (
        <>⚠ 未绑定微信，仅在页面展示</>
      )}
    </div>
  )
}

function DigestCard({ bound }) {
  return (
    <div className="max-w-[78%]">
      <div className="bg-white border border-black/[0.06] rounded-[10px] overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
        <div className="p-[13px_15px] text-[15px] font-bold border-b border-black/[0.06] flex items-center gap-1.5 text-[#07c160]">
          📄 工作群 · 今日简报
        </div>
        <div className="p-[13px_15px] text-sm text-[#333] space-y-1.5">
          <div className="text-xs text-[#888] pb-2 border-b border-black/[0.04]">AI 从 186 条消息中提炼</div>
          <div className="flex items-start gap-2 text-[14px]"><span className="text-[#e53935] shrink-0">🚨</span><div>老吴：数据库死锁！所有人停止合代码！<br />赵敏：报销通道今晚 24 点关闭</div></div>
          <div className="flex items-start gap-2 text-[14px]"><span className="shrink-0">📅</span><div>发布会提前至这周五，今晚全员对齐方案<br />Q2 方向锁定数据分析模块</div></div>
          <div className="flex items-start gap-2 text-[14px]"><span className="shrink-0">📎</span>王姐发了《预算分配最终版.pdf》</div>
        </div>
        <div className="p-[11px_15px] text-[13px] text-[#576b95] border-t border-dashed border-black/[0.12] text-center font-medium">已折叠 43 条闲聊</div>
      </div>
      <PushBadge bound={bound} />
    </div>
  )
}

function RagQuote({ name, time, text }) {
  return (
    <div className="mb-3">
      <span className="font-semibold">{name}</span> <span className="text-[#888]">{time}</span>
      <div className="border-l-3 border-black/[0.08] pl-2.5 text-[#888] block my-1" style={{ borderLeftWidth: '3px' }}>"{text}"</div>
    </div>
  )
}

/* ── Welcome screen ── */
function WelcomeScreen({ onDismiss }) {
  return (
    <>
      <TimeDivider text="今天 10:15" />
      <div className="flex gap-2.5 items-start">
        <ClawAvatar />
        <div>
          <div className="relative bg-white text-[#1a1a1a] text-[15px] p-[13px_15px] rounded-lg leading-[1.55] max-w-[78%] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            👋 你好呀～我是摘星，你的微信智能助手！<br /><br />
            我能帮你做这些事：<br />
            📝 一句话生成群聊摘要、配置定时推送<br />
            🔔 设置公众号文章实时提醒<br />
            🔍 语义搜索——说个大概意思，帮你翻记忆<br /><br />
            点击右侧按钮试试看 👇
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Right-side control panel ── */
function ControlPanel({ ilinkBound, running, onCommand, onReset, children }) {
  return (
    <div className="flex-1 min-w-0 space-y-5">
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export default function AgentPanel() {
  const [ilinkBound, setIlinkBound] = useState(null)
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [running, setRunning] = useState(false)
  const chatRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/ilink/status`)
      .then(r => r.json())
      .then(d => setIlinkBound(d.bound === true))
      .catch(() => setIlinkBound(false))
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, typing])

  function add(m) {
    setMessages(prev => [...prev, m])
  }

  async function showTyping(dur) {
    setTyping(true)
    await sleep(dur)
    setTyping(false)
  }

  async function cmdDigest() {
    add({ type: MT.USER, text: '帮我总结一下工作群今天都说了什么' })
    await sleep(400)
    await showTyping(900)
    add({ type: MT.BOT, text: '🤖 收到，立即执行！' })
    add({ type: MT.STEPS, steps: [
      { label: '读取工作群消息', result: '共 186 条', done: true },
      { label: 'AI 提炼摘要', result: '已生成', done: true },
      { label: ilinkBound ? '推送到微信' : '推送通知', result: ilinkBound ? '✅ 已推送' : '⚠ 未绑定', done: true },
    ]})
    await sleep(300)
    add({ type: MT.DIGEST, bound: ilinkBound })
  }

  async function cmdAlert() {
    add({ type: MT.USER, text: '帮我设置 36氪 的文章实时提醒' })
    await sleep(400)
    await showTyping(800)
    add({ type: MT.BOT, text: '🔔 搞定！已为你配置：<br><br>公众号：<strong style="color:#07c160;">36氪</strong><br>触发：有新文章发布时<br>动作：即时推送 AI 速读摘要到微信<br><br>下次 36氪 发文，你会第一时间收到通知 ✨' })
  }

  async function cmdRag() {
    add({ type: MT.USER, text: '我记得之前群里有人讨论过用 Redis 做缓存，后来好像换方案了，是谁说的来着？' })
    await sleep(400)
    await showTyping(1000)
    add({ type: MT.BOT, text: '🔍 帮你翻了一下记忆——<br><br>在「项目核心群」<span style="color:#888;">3月12日</span>找到了：', rag: true })
  }

  async function handleCommand(id) {
    if (running) return
    setRunning(true)
    try {
      if (id === 'digest') await cmdDigest()
      else if (id === 'alert') await cmdAlert()
      else if (id === 'rag') await cmdRag()
    } catch (e) { console.error(e) }
    setRunning(false)
  }

  function reset() {
    if (running) return
    setMessages([])
    setTyping(false)
  }

  const hasMessages = messages.length > 0
  const inputHint = running ? 'Agent 执行中...' : (hasMessages ? '' : '给摘星发消息...')

  return (
    <motion.div {...pageTransition} className="p-4 md:p-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* ═══ Left: iPhone ═══ */}
        <PhoneFrame chatRef={chatRef} inputHint={inputHint}>
          {!hasMessages && <WelcomeScreen />}
          {messages.map((m, i) => {
            if (m.type === MT.USER) {
                    return <UserBubble key={i} text={m.text} avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80" />
                  }
                  if (m.type === MT.BOT) {
                    return (
                      <BotBubble key={i}>
                        <span dangerouslySetInnerHTML={{ __html: m.text }} />
                        {m.rag && (
                          <div className="mt-2">
                            <RagQuote name="张三" time="14:32" text="Redis 做缓存确实快，但咱们写多读少，命中率太低" />
                            <RagQuote name="李芳" time="15:10" text="换成本地缓存？内存映射文件就行，部署也简单" />
                            <div className="pt-2 border-t border-dashed border-black/[0.06]">
                              📌 结论：最终采用了 <strong style={{ color: '#07c160' }}>本地缓存方案</strong><br />
                              <span style={{ color: '#888', fontSize: '13px' }}>不用翻聊天记录，跟我说个大概意思就能找到 👀</span>
                            </div>
                          </div>
                        )}
                      </BotBubble>
                    )
                  }
                  if (m.type === MT.STEPS) {
                    return (
                      <BotBubble key={i}>
                        <div className="space-y-2">
                          {m.steps.map((s, j) => <AgentStep key={j} {...s} />)}
                        </div>
                        <hr className="my-2 border-t border-dashed border-black/[0.08]" />
                        <span>全部完成 🙌</span>
                      </BotBubble>
                    )
                  }
                  if (m.type === MT.DIGEST) {
                    return (
                      <div key={i} className="flex gap-2.5 items-start">
                        <ClawAvatar />
                        <DigestCard bound={m.bound} />
                      </div>
                    )
                  }
                  return null
                })}
                {typing && <TypingIndicator />}
        </PhoneFrame>

        {/* ═══ Right: Controls ═══ */}
        <ControlPanel ilinkBound={ilinkBound} running={running} onCommand={handleCommand} onReset={reset}>

          {/* Status bar */}
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm ${
            ilinkBound === null ? 'bg-bg-raised border-border-main/50'
            : ilinkBound ? 'bg-brand-green/5 border-brand-green/20'
            : 'bg-[#f59e0b]/5 border-[#f59e0b]/20'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              ilinkBound === null ? 'bg-text-muted'
              : ilinkBound ? 'bg-brand-green animate-pulse'
              : 'bg-[#f59e0b]'
            }`} />
            <span className={`font-semibold ${
              ilinkBound === null ? 'text-text-muted'
              : ilinkBound ? 'text-brand-green'
              : 'text-[#f59e0b]'
            }`}>
              {ilinkBound === null ? '检测微信绑定状态...'
                : ilinkBound ? '微信已绑定 · Agent 已就绪'
                : '微信未绑定 · Agent 结果仅在页面展示'}
            </span>
            {ilinkBound === false && (
              <a href="#" onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'config', section: 'push' } })) }}
                className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-brand-green text-white font-semibold hover:bg-brand-green-hover transition-colors no-underline shrink-0">
                去绑定微信
              </a>
            )}
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green font-semibold border border-brand-green/15 shrink-0">ReAct</span>
          </div>

          {/* Preset commands */}
          <div className="bg-bg-card border border-border-main rounded-2xl p-4 md:p-5">
            <h3 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
              <Lightning size={16} className="text-brand-green" weight="fill" />
              试试对 Agent 说这些
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {COMMANDS.map(cmd => (
                <motion.button
                  key={cmd.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCommand(cmd.id)}
                  disabled={running}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    running ? 'opacity-50 cursor-wait bg-bg-raised border-border-main'
                    : 'bg-bg-raised/60 border-border-main hover:border-brand-green/30 hover:bg-brand-green/[0.02]'
                  }`}
                >
                  <span className="text-lg shrink-0">{cmd.icon}</span>
                  <span className="text-sm text-text-main leading-relaxed">{cmd.label}</span>
                </motion.button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-main/50">
              <button onClick={reset} disabled={running}
                className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-bg-raised border border-border-main text-text-muted hover:text-text-main transition-colors cursor-pointer disabled:opacity-50">
                <ArrowClockwise size={12} /> 重置对话
              </button>
              <span className="text-xs text-text-muted/60">{messages.filter(m => m.type === MT.USER).length} 条对话</span>
            </div>
          </div>

          {/* Tool list */}
          <div className="bg-bg-card border border-border-main rounded-2xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-sm bg-brand-green" />
              <span className="text-xs font-semibold text-text-muted tracking-wide">Agent 工具清单</span>
            </div>
            <div className="space-y-4">
              {TOOL_GROUPS.map((group, i) => (
                <div key={i}>
                  <div className="text-xs text-text-muted/70 font-semibold mb-2">{group.cat}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item, j) => (
                      <span key={j} className="text-xs px-2.5 py-1 rounded-md bg-brand-green/10 text-brand-green font-medium border border-brand-green/15">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </ControlPanel>

      </div>
    </motion.div>
  )
}
