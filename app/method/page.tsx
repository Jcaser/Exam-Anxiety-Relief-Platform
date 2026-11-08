import Link from "next/link";
import { ArrowRight, Brain, Wind, Heart, ShieldCheck, BookOpen, Layers } from "lucide-react";
import { references } from "@/lib/knowledge";

// 10 种认知扭曲（Burns《感觉好起来》），附考试场景示例
const distortions = [
  { n: "非黑即白", d: "用「全好或全坏」看事，达不到完美就是彻底失败。", e: "模考少考 10 分 →「我全完了」。", color: "bg-blush" },
  { n: "过度概括", d: "一次负面事件，当成「永远、总是」的规律。", e: "一道题不会 →「我永远学不会」。", color: "bg-coral/20" },
  { n: "心理过滤", d: "只盯着失误，让整片表现都暗下来。", e: "整体还行，却只反复想那一个错题。", color: "bg-peach" },
  { n: "贬低积极", d: "把好结果说成「不算数」「只是运气」。", e: "被夸进步，却想「TA 只是客套」。", color: "bg-sage/30" },
  { n: "跳跃结论", d: "没证据就下消极结论：读心 / 预言。", e: "「别人一定觉得我差」「我肯定会挂」。", color: "bg-moss/20" },
  { n: "夸大/缩小", d: "把错误放大成灾难，把自己的实力缩小。", e: "小失误 = 人生毁了；实力 = 不算啥。", color: "bg-blush" },
  { n: "情绪推理", d: "把感受当事实：「我感到慌，所以一定出事」。", e: "心慌 →「说明我准备不足」。", color: "bg-coral/20" },
  { n: "「应该」句式", d: "用「必须/应该」鞭打自己，带来内疚与压力。", e: "「我必须考第一，否则就是失败」。", color: "bg-peach" },
  { n: "贴标签", d: "用单个事件给自己贴负面身份。", e: "一题卡住 →「我是个废物」。", color: "bg-sage/30" },
  { n: "归己化", d: "把不是自己的责任也揽过来自责。", e: "考得不理想，全怪自己不够好。", color: "bg-moss/20" },
];

// 七栏思维记录（Greenberger & Padesky《掌控心情》）
const recordCols = [
  { c: "1 情境", d: "只写事实：谁、何时、何地，不做解读。" },
  { c: "2 情绪及强度", d: "用一个词命名情绪，并打 0–100% 的强度分。" },
  { c: "3 自动思维", d: "脑子闪过的第一句话；圈出最关键的 HOT 念头，评相信度 0–100%。" },
  { c: "4 支持证据", d: "可被旁观者确认、支持这个念头的事实。" },
  { c: "5 反对证据", d: "不支持它的事实（常更难写，可问「朋友有这想法我会指出什么」）。" },
  { c: "6 平衡想法", d: "同时覆盖④⑤两栏、更公平完整的说法，评可信度 0–100%。" },
  { c: "7 重评情绪", d: "回到第 2 栏再打分——下降 10–20 分已是真实进展。" },
];

const relaxTools = [
  { t: "腹式呼吸 / 4-7-8", d: "鼻吸 4 秒、屏 7 秒、缓呼 8 秒，重复 4 轮；先让身体静下来，脑子才跟得上。" },
  { t: "渐进式肌肉放松", d: "依次绷紧再放松各组肌肉，学会分辨紧张与松弛，适合睡前。" },
  { t: "应对陈述卡片", d: "把「这只是焦虑，会过去」「我能带着紧张做题」写在小卡上，慌时反复念。" },
  { t: "恐惧阶梯 / 暴露", d: "把害怕的事由易到难排成阶梯，逐级面对并收集「其实没那么糟」的新证据。" },
  { t: "三分钟呼吸空间", d: "正念 MBCT 微型练习：觉察→集中呼吸→扩展觉察，与念头保持距离。" },
];

export default function MethodPage() {
  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-sage/30 via-peach to-cream p-8 shadow-card sm:p-12">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/50 blur-2xl" />
        <div className="relative">
          <span className="pill bg-white/70 text-moss shadow-card">🌿 我们的方法</span>
          <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
            不是消灭紧张，是学会带着它往前走
          </h1>
          <p className="mt-3 max-w-xl text-warmgray">
            安心考的方法，来自被反复验证过的认知行为疗法（CBT）。
            一句话：改变你看事情的方式，情绪就会跟着松手。
          </p>
        </div>
      </header>

      {/* ── 认知模型 ── */}
      <section className="glass-card p-8 sm:p-12">
        <div className="flex items-center gap-2">
          <Brain className="text-terracotta" size={22} />
          <h2 className="section-title mb-0">CBT 到底在改什么：认知模型（ABC）</h2>
        </div>
        <p className="mt-3 max-w-2xl text-warmgray">
          我们常以为「考试」直接让我们焦虑。但 CBT（Beck 认知模型）发现，中间还隔着
          <span className="font-semibold text-ink">「我们对考试的想法」</span>。
          同一次没考好，有人想「我尽力了，下次调整」，有人想「我完了」——解读不同，感受天差地别。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="rounded-full bg-blush px-4 py-2 font-medium text-ink">A 情境（事件）</span>
          <span className="text-terracotta">→</span>
          <span className="rounded-full bg-coral/20 px-4 py-2 font-medium text-ink">B 想法 / 解读</span>
          <span className="text-terracotta">→</span>
          <span className="rounded-full bg-terracotta/20 px-4 py-2 font-medium text-ink">C 情绪 / 身体 / 行为</span>
        </div>
        <p className="mt-4 text-center text-sm text-warmgray">
          更深层还有「核心信念」（如「我不够好」），它在压力下被激活，催生一闪而过的「自动思维」。
          安心考在 <span className="font-semibold text-terracotta">B 想法</span> 这一步插手。
        </p>

        <div className="mt-8 grid gap-4 rounded-4xl bg-white/60 p-6 sm:grid-cols-3">
          {[
            { icon: Brain, t: "情境", d: "先确认发生了什么，而不是脑补的灾难。" },
            { icon: Wind, t: "自动思维", d: "真正点燃情绪的是当时的念头，不是事情本身。" },
            { icon: Heart, t: "情绪与行动", d: "改写想法，焦虑就松动，状态回到你能掌控的范围。" },
          ].map((s, i) => (
            <div key={s.t} className="rounded-3xl bg-white/80 p-5 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-peach text-terracotta">
                <s.icon size={20} />
              </span>
              <h3 className="mt-3 text-base font-bold text-ink">
                {String(i + 1).padStart(2, "0")} · {s.t}
              </h3>
              <p className="mt-1.5 text-sm text-warmgray">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-4xl border border-peach/70 bg-cream/60 p-5">
          <p className="text-sm text-ink">
            <span className="font-semibold">焦虑的维持循环：</span>
            触发情境 → 对威胁的解读（「我会搞砸」）→ 身体唤醒（心跳、手抖）→ 回避 / 安全行为 →
            短期缓解，却长期强化「这事真的很危险」的信念。打破它的钥匙：
            <span className="text-terracotta">先让身体平静 → 用思维记录检验想法 → 通过暴露收集真实证据。</span>
          </p>
        </div>
      </section>

      {/* ── 10 认知扭曲 ── */}
      <section className="glass-card p-8 sm:p-12">
        <div className="flex items-center gap-2">
          <Layers className="text-terracotta" size={22} />
          <h2 className="section-title mb-0">焦虑背后，10 种可命名的思维偏差</h2>
        </div>
        <p className="mt-3 max-w-2xl text-warmgray">
          戴维·伯恩斯（Burns，《感觉好起来》）归纳了 10 种常见认知扭曲，
          <span className="font-semibold text-ink">考试焦虑里尤其常出现「夸大/灾难化」与「跳跃式结论」</span>。
          能叫出名字，就能在念头冒出来时认出它——这是改变的第一步。
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {distortions.map((x, i) => (
            <div key={x.n} className={`rounded-3xl ${x.color} p-5`}>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-terracotta">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-base font-bold text-ink">{x.n}</h3>
              </div>
              <p className="mt-1.5 text-sm text-warmgray">{x.d}</p>
              <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-xs text-ink/70">
                考试场景：{x.e}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 七栏思维记录 ── */}
      <section className="glass-card p-8 sm:p-12">
        <div className="flex items-center gap-2">
          <BookOpen className="text-terracotta" size={22} />
          <h2 className="section-title mb-0">CBT 核心工具：七栏思维记录</h2>
        </div>
        <p className="mt-3 max-w-2xl text-warmgray">
          来源：Greenberger & Padesky《掌控心情》（Mind Over Mood，2nd ed. 2016）。
          把一次情绪瞬间拆解成 7 栏，用证据检验自动思维，得到更平衡的看法。
          <span className="font-semibold text-ink">顺序是固定的</span>，先收证据再下结论，才不会变成自我安慰。
        </p>
        <ol className="mt-6 space-y-3">
          {recordCols.map((c, i) => (
            <li key={c.c} className="flex gap-3 rounded-3xl bg-white/70 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">{c.c}</h3>
                <p className="mt-0.5 text-sm text-warmgray">{c.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-3xl bg-cream/60 px-4 py-3 text-sm text-warmgray">
          把快而黏的念头写下来、放到纸面检验，这个过程本身就是一半的疗愈。情绪强度下降 10–20 分就是真实有效的进展。
        </p>
      </section>

      {/* ── 放松 & 暴露 ── */}
      <section className="grid gap-5 sm:grid-cols-2">
        <div className="glass-card p-8">
          <h2 className="section-title">身体先稳，脑子才跟得上</h2>
          <p className="mt-2 text-sm text-warmgray">
            基于 Bourne《焦虑与恐惧症手册》与 MBCT 正念，这些是被大量练习验证过的放松与暴露方法。
          </p>
          <ul className="mt-5 space-y-4">
            {relaxTools.map((t) => (
              <li key={t.t} className="rounded-3xl bg-white/70 p-4">
                <h3 className="text-sm font-bold text-terracotta">{t.t}</h3>
                <p className="mt-1 text-sm text-warmgray">{t.d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card flex flex-col justify-center p-8">
          <h2 className="section-title">三级场景，对症下「练」</h2>
          <div className="mt-5 space-y-4">
            {[
              { t: "考前", d: "把大任务切碎、用五分钟法则启动、做模拟卷收集「我能应付」的证据。" },
              { t: "考场", d: "先停笔做几轮腹式呼吸稳住身体，再用一句平衡想法稳住脑子，从最有把握的题入手。" },
              { t: "考后", d: "给复盘设限时窗口，警惕贴标签与过度概括，用自我关怀代替反刍自责。" },
            ].map((s) => (
              <div key={s.t} className="rounded-3xl bg-white/70 p-4">
                <h3 className="text-sm font-bold text-ink">· {s.t}</h3>
                <p className="mt-1 text-sm text-warmgray">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 参考书目与循证来源 ── */}
      <section className="rounded-5xl bg-white/70 p-8 sm:p-12">
        <h2 className="section-title">参考书目与循证来源</h2>
        <p className="mt-2 max-w-2xl text-sm text-warmgray">
          本应用的内容与方法，均转述自以下被国际学界广泛引用的循证 CBT 文献。
          知识库中的每条建议都已标注对应出处；如需深入，可查阅原著。
        </p>
        <div className="mt-6 space-y-3">
          {references.map((r) => (
            <div key={r.key} className="rounded-3xl border border-peach/60 bg-cream/50 p-4">
              <p className="text-sm font-bold text-ink">{r.title}</p>
              <p className="mt-0.5 text-xs text-warmgray">{r.author}</p>
              <p className="mt-1 text-xs text-ink/70">{r.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 边界与 CTA ── */}
      <section className="rounded-5xl bg-gradient-to-br from-moss/20 via-peach to-cream p-8 sm:p-12">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 shrink-0 text-moss" size={22} />
          <div>
            <h2 className="text-xl font-bold text-ink">循证，也守边界</h2>
            <p className="mt-2 text-warmgray">
              CBT 是全球主流、被大量研究支持的心理干预方法之一。但安心考始终是自助工具，
              不提供医疗诊断，也不替代专业治疗。如果痛苦已经超出自我调节的范围，
              请拨打全国心理援助热线 <span className="font-semibold text-terracotta">12356</span>，
              或前往就近医疗机构。
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/assess" className="btn-primary">
            先来测一测 <ArrowRight size={18} />
          </Link>
          <Link href="/record" className="btn-ghost">
            打开思维记录
          </Link>
        </div>
      </section>
    </div>
  );
}
