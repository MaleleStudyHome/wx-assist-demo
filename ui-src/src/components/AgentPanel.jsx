import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightning, CheckCircle, Spinner, PaperPlaneTilt, Clock,
  MagnifyingGlass, Bell, FileText, ChatCircleDots, ArrowClockwise
} from '@phosphor-icons/react'
import { SectionHeader, API_BASE } from './SharedComponents'

const pageTransition = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
}

const COMMANDS = [
  { id: 'digest', icon: '📝', label: '帮我总结一下工作群今天都说了什么', color: 'brand-green' },
  { id: 'alert', icon: '🔔', label: '帮我设置 36氪 的文章实时提醒', color: 'status-warn' },
  { id: 'rag',   icon: '🔍', label: '我记得之前有人讨论过用 Redis 做缓存，后来换方案了？', color: 'status-info' },
]

const PUSH_DONE = (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-green/10 text-brand-green mt-2">
    <CheckCircle size={12} weight="fill" /> 已推送微信
  </span>
)

const PUSH_SKIP = (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-status-warn-soft text-status-warn mt-2">
    ⚠ 未绑定微信，结果仅在页面展示
  </span>
)

// ── Mock Agent response generators ─────────────────────────

function buildDigestResponse(bound) {
  const steps = [
    { label: '读取工作群消息', result: '共 186 条' },
    { label: 'AI 提炼摘要', result: '已生成' },
    { label: bound ? '推送到微信' : '推送通知', result: bound ? '✅ 已推送' : '⚠ 未绑定，已跳过' },
  ]
  return { steps, card: true }
}

function buildAlertResponse() {
  return { title: '🔔 配置完成', body: (
    <div className="space-y-2">
      <p>公众号：<span className="font-semibold">36氪</span></p>
      <p>触发：有新文章发布时</p>
      <p>动作：即时推送 AI 速读摘要到微信</p>
    </div>
  )}
}

function buildRagResponse() {
  return { title: '🔍 语义检索结果', body: (
    <div className="space-y-2 text-sm">
      <p className="text-text-muted">在「项目核心群」3月12日 找到了：</p>
      <div className="pl-3 border-l-2 border-border-main py-1 space-y-3">
        <div>
          <p className="font-semibold">张三 <span className="text-text-muted font-normal">14:32</span></p>
          <p className="text-text-muted italic">"Redis 做缓存确实快，但咱们写多读少，命中率太低"</p>
        </div>
        <div>
          <p className="font-semibold">李芳 <span className="text-text-muted font-normal">15:10</span></p>
          <p className="text-text-muted italic">"换成本地缓存？内存映射文件就行，部署也简单"</p>
        </div>
      </div>
      <p className="text-brand-green font-medium mt-2">📌 结论：最终采用了本地缓存方案</p>
      <p className="text-text-muted text-xs">不用翻聊天记录，跟我说个大概意思就能找到 👀</p>
    </div>
  )}
}

// ── Main component ──────────────────────────────────────────

export default function AgentPanel() {
  const [ilinkBound, setIlinkBound] = useState(null) // null=loading, true/false
  const [conversation, setConversation] = useState([]) // { role, content, type, steps, card }
  const [running, setRunning] = useState(false)
  const chatEndRef = useRef(null)

  // Check iLink binding status
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`${API_BASE}/api/ilink/status`)
        const data = await res.json()
        setIlinkBound(data.bound === true)
      } catch {
        setIlinkBound(false)
      }
    }
    check()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  function addMessage(msg) {
    setConversation(prev => [...prev, msg])
  }

  async function handleCommand(cmdId) {
    if (running) return
    setRunning(true)

    // Find the command label
    const cmd = COMMANDS.find(c => c.id === cmdId)
    if (!cmd) return

    // Add user message
    addMessage({ role: 'user', content: cmd.label })

    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 600))

    if (cmdId === 'digest') {
      // Step 1: "收到" message
      addMessage({ role: 'agent', type: 'steps', steps: [
        { label: '读取工作群消息', result: '共 186 条', done: true },
        { label: 'AI 提炼摘要', result: '生成中...', done: false },
        { label: ilinkBound ? '推送到微信' : '推送通知', result: '', done: false },
      ], card: false })
      await new Promise(r => setTimeout(r, 800))

      // Step 2: update steps
      addMessage({ role: 'agent', type: 'steps', steps: [
        { label: '读取工作群消息', result: '共 186 条', done: true },
        { label: 'AI 提炼摘要', result: '已生成', done: true },
        { label: ilinkBound ? '推送到微信' : '推送通知', result: ilinkBound ? '✅ 已推送' : '⚠ 未绑定', done: true },
      ], card: false })
      await new Promise(r => setTimeout(r, 400))

      // Step 3: digest card
      addMessage({ role: 'agent', type: 'digest', done: true, pushBadge: ilinkBound })
      await new Promise(r => setTimeout(r, 200))
    }
    else if (cmdId === 'alert') {
      addMessage({ role: 'agent', type: 'alert' })
    }
    else if (cmdId === 'rag') {
      await new Promise(r => setTimeout(r, 400))
      addMessage({ role: 'agent', type: 'rag' })
    }

    setRunning(false)
  }

  return (
    <motion.div {...pageTransition} className="p-4 md:p-8 space-y-8 max-w-5xl">
      {/* ── Top status bar ── */}
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm ${
        ilinkBound === null
          ? 'bg-bg-raised border-border-main/50'
          : ilinkBound
            ? 'bg-brand-green/5 border-brand-green/20'
            : 'bg-status-warn-soft/20 border-status-warn/20'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          ilinkBound === null
            ? 'bg-text-muted'
            : ilinkBound
              ? 'bg-brand-green animate-pulse'
              : 'bg-status-warn'
        }`} />
        <span className={`font-semibold ${
          ilinkBound === null
            ? 'text-text-muted'
            : ilinkBound
              ? 'text-brand-green'
              : 'text-status-warn'
        }`}>
          {ilinkBound === null ? '检测微信绑定状态...'
            : ilinkBound ? '微信已绑定 · Agent 已就绪'
            : '微信未绑定 · Agent 结果仅在页面展示'}
        </span>
        {ilinkBound === false && (
          <a
            href="#"
            onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'config', section: 'push' } })) }}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-brand-green text-white font-semibold hover:bg-brand-green-hover transition-colors no-underline"
          >
            去绑定微信
          </a>
        )}
        <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green font-semibold border border-brand-green/15">
          ReAct
        </span>
      </div>

      {/* ── Preset commands ── */}
      <section>
        <SectionHeader
          title="预设命令"
          accent="var(--brand-green)"
          icon={Lightning}
          subtitle="点击体验 Agent 自动执行"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {COMMANDS.map(cmd => (
            <motion.button
              key={cmd.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCommand(cmd.id)}
              disabled={running}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                running
                  ? 'opacity-50 cursor-wait bg-bg-raised border-border-main'
                  : 'bg-bg-card border-border-main hover:border-brand-green/30 hover:bg-brand-green/[0.02]'
              }`}
            >
              <span className="text-lg shrink-0 mt-0.5">{cmd.icon}</span>
              <span className="text-sm text-text-main leading-relaxed">{cmd.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── Conversation ── */}
      <section>
        <SectionHeader
          title="执行结果"
          accent="var(--brand-green)"
          icon={ChatCircleDots}
          subtitle={conversation.length === 0 ? '点击上方命令开始体验' : `${conversation.filter(m => m.role === 'user').length} 条对话`}
        />
        <div className="mt-4 bg-bg-card rounded-2xl border border-border-main overflow-hidden">
          <div className="p-4 md:p-6 space-y-4 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {conversation.length === 0 ? (
              <div className="py-16 text-center">
                <Lightning size={32} className="text-text-muted/30 mx-auto mb-3" />
                <p className="text-sm text-text-muted/60">点击上方命令，体验 Agent 自动执行</p>
                <p className="text-xs text-text-muted/40 mt-1">支持：信息查询 · 自动执行 · 语义检索</p>
              </div>
            ) : (
              conversation.map((msg, i) => (
                <ChatMessage key={i} msg={msg} />
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </section>
    </motion.div>
  )
}

// ── Chat message renderer ──────────────────────────────────

function ChatMessage({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex gap-3 items-start justify-end">
        <div className="max-w-[75%]">
          <div className="bg-brand-green/15 border border-brand-green/25 rounded-xl px-4 py-3 text-sm text-text-main">
            {msg.content}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-bg-raised border border-border-main flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
          U
        </div>
      </div>
    )
  }

  // Agent message
  if (msg.type === 'steps') {
    return (
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-brand-green/15 flex items-center justify-center text-sm shrink-0">
          🤖
        </div>
        <div className="max-w-[75%]">
          <div className="bg-bg-raised border border-border-main rounded-xl px-4 py-3">
            <p className="text-xs text-brand-green font-semibold mb-2">🤖 收到，立即执行</p>
            <div className="space-y-2">
              {msg.steps.map((s, j) => (
                <div key={j} className="flex items-start gap-2.5 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold border ${
                    s.done
                      ? 'bg-brand-green/15 border-brand-green/30 text-brand-green'
                      : 'bg-bg-card border-border-main text-text-muted'
                  }`}>
                    {s.done ? '✓' : '○'}
                  </div>
                  <div>
                    <div className="font-medium text-text-main">{s.label}</div>
                    {s.result && <div className="text-xs text-brand-green mt-0.5">{s.result}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border-main/50">
              <p className="text-sm text-text-muted">全部完成 🙌</p>
            </div>
            {msg.pushBadge !== undefined && (
              msg.pushBadge ? PUSH_DONE : PUSH_SKIP
            )}
          </div>
        </div>
      </div>
    )
  }

  if (msg.type === 'digest') {
    return (
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-brand-green/15 flex items-center justify-center text-sm shrink-0">
          🤖
        </div>
        <div className="max-w-[75%]">
          <div className="bg-bg-raised border border-border-main rounded-xl overflow-hidden">
            <div className="border-b border-border-main/50 px-4 py-3 font-semibold text-sm text-brand-green flex items-center gap-2">
              <span>📄 工作群 · 今日简报</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-text-muted border-b border-border-main/30 pb-2">AI 从 186 条消息中提炼</p>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-status-warn shrink-0">🚨</span>
                <div>
                  <p className="text-status-warn font-medium">老吴：数据库死锁！所有人停止合代码！</p>
                  <p className="text-status-warn font-medium mt-1">赵敏：报销通道今晚 24 点关闭</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-brand-green shrink-0">📅</span>
                <div>
                  <p className="text-text-main">发布会提前至这周五，今晚全员对齐方案</p>
                  <p className="text-text-main mt-1">Q2 方向锁定数据分析模块</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-status-info shrink-0">📎</span>
                <p className="text-text-main">王姐发了《预算分配最终版.pdf》</p>
              </div>
            </div>
            <div className="border-t border-dashed border-border-main/50 px-4 py-2.5 text-center text-xs text-status-info font-medium">
              已折叠 43 条闲聊
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (msg.type === 'alert') {
    return (
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-brand-green/15 flex items-center justify-center text-sm shrink-0">
          🤖
        </div>
        <div className="max-w-[75%]">
          <div className="bg-bg-raised border border-border-main rounded-xl px-4 py-3">
            <p className="text-lg mb-3">🔔</p>
            <p className="font-semibold text-text-main mb-2">搞定！已为你配置：</p>
            <div className="space-y-1.5 text-sm text-text-main">
              <p>公众号：<span className="font-semibold text-brand-green">36氪</span></p>
              <p>触发：有新文章发布时</p>
              <p>动作：即时推送 AI 速读摘要到微信</p>
            </div>
            <p className="text-sm text-text-muted mt-3">下次 36氪 发文，你会第一时间收到通知 ✨</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-green/10 text-brand-green mt-2">
              <CheckCircle size={12} weight="fill" /> 配置已保存 · 实时监听中
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (msg.type === 'rag') {
    return (
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-brand-green/15 flex items-center justify-center text-sm shrink-0">
          🤖
        </div>
        <div className="max-w-[75%]">
          <div className="bg-bg-raised border border-border-main rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-text-main mb-3">🔍 帮你翻了一下记忆——</p>
            <p className="text-xs text-text-muted mb-3">在「项目核心群」3月12日 找到了：</p>
            <div className="pl-3 border-l-2 border-border-main py-1 space-y-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-text-main">张三 <span className="text-text-muted font-normal">14:32</span></p>
                <p className="text-sm text-text-muted italic">"Redis 做缓存确实快，但咱们写多读少，命中率太低"</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-main">李芳 <span className="text-text-muted font-normal">15:10</span></p>
                <p className="text-sm text-text-muted italic">"换成本地缓存？内存映射文件就行，部署也简单"</p>
              </div>
            </div>
            <p className="text-sm text-brand-green font-medium">📌 结论：最终采用了本地缓存方案</p>
            <p className="text-xs text-text-muted mt-2">不用翻聊天记录，跟我说个大概意思就能找到 👀</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
