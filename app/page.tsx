import Link from "next/link";
import {
  ClipboardList,
  NotebookPen,
  MessageCircleHeart,
  LineChart,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Brain,
  Wind,
  Heart,
} from "lucide-react";
import BreathWidget from "@/components/BreathWidget";
import Faq from "@/components/Faq";
import EmpathySection from "@/components/EmpathySection";
import { WaveDivider, InkBlob } from "@/components/Decor";
import { kbSources, libraryStats } from "@/lib/library";
import KbProbe from "@/components/KbProbe";
import { SparkBadge } from "@/components/SparkBadge";

const features = [
  { icon: ClipboardList, title: "焦虑自评与解读", desc: "几道温柔的题，看清焦虑从哪来。AI 给你一份不贴标签的反馈。", href: "/assess", c: "from-peach to-blush" },
  { icon: NotebookPen, title: "智能思维记录", desc: "把念头写进 CBT 七栏表，AI 一步步陪你找更平衡的想法。", href: "/record", c: "from-blush to-coral/30" },
  { icon: MessageCircleHeart, title: "CBT 对话陪伴", desc: "随时倾诉。回答始终站在循证框架里，不乱给建议。", href: "/chat", c: "from-sage/40 to-peach" },
  { icon: LineChart, title: "进度可视化", desc: "情绪曲线与练习打卡，让你真真切切看见自己稳下来。", href: "/progress", c: "from-honey/40 to-blush" },
];

const cbtSteps = [
  { icon: Brain, t: "看清念头", d: "把脑子里那句“我完了”拎出来，看看它到底是事实还是担心。" },
  { icon: Wind, t: "拆解证据", d: "写下支持与反对它的证据，焦虑最怕被摊开在光下。" },
  { icon: Heart, t: "重写反应", d: "换一个更靠近事实的说法，情绪强度自然就降下来了。" },
];

export default function Home() {
  const sources = kbSources();
  const stats = libraryStats();

  return (
    <div className="relative space-y-20">
      {/* Hero — SparkBadge 全屏背景 */}
      <section className="relative isolate ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] mt-[-7rem] flex min-h-[100svh] items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <SparkBadge
            speed={1.0}
            particleAmount={1.0}
            rainAmount={1.0}
            turbulence={1.0}
            spread={1.0}
          />
        </div>
        {/* 左侧加深，让浅色文字在发光场景上依然清晰；右侧保留 CBT 余烬 */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#241610] via-[#241610]/55 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-28 sm:px-8">
          <div className="max-w-xl">
            <span className="pill bg-cream/90 text-terracotta shadow-card">
              <Sparkles size={15} /> 基于 CBT 的考试焦虑自助
            </span>
            <h1 className="font-display mt-5 text-5xl font-semibold leading-[1.15] text-cream sm:text-6xl">
              和考试焦虑，
              <br />
              <span className="bg-gradient-to-r from-[#ffd0a8] to-coral bg-clip-text text-transparent">
                好好相处。
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-cream/85">
              安心考用认知行为疗法（CBT），陪你把慌乱的念头拆开、看清、放下——
              不是硬扛，也不是否定，而是学会和它共处。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/assess" className="btn-primary">
                开始焦虑自评 <ArrowRight size={18} />
              </Link>
              <Link href="/method" className="btn-ghost">
                了解我们的方法
              </Link>
            </div>
            <div className="mt-7 flex items-center gap-2 text-sm text-cream/70">
              <ShieldCheck size={16} className="text-moss" />
              数据本地保存，隐私不出你的设备
            </div>
          </div>
        </div>
      </section>

      <WaveDivider />

      {/* Empathy — 可交互：点选焦虑标签，展开 AI 温柔回应 */}
      <EmpathySection />

      <WaveDivider />

      {/* CBT 三步法 */}
      <section>
        <div className="text-center">
          <h2 className="section-title font-semibold">CBT 怎么帮到你</h2>
          <p className="mt-3 text-warmgray">三步，把“我完了”换成“我再看看”。</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {cbtSteps.map((s, i) => (
            <div key={s.t} className="glass-card relative overflow-hidden p-7 text-center">
              <InkBlob className="bottom-[-30px] left-1/2 h-28 w-28 -translate-x-1/2" color="#FBD9CC" />
              <div className="relative">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-terracotta text-white shadow-soft">
                  <s.icon size={26} />
                </span>
                <span className="font-display mt-3 block text-sm text-coral/70">0{i + 1}</span>
                <h3 className="mt-1 text-xl font-bold text-ink">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-warmgray">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <WaveDivider />

      {/* Features */}
      <section>
        <div className="text-center">
          <h2 className="section-title font-semibold">四件小事，慢慢把心安下来</h2>
          <p className="mt-3 text-warmgray">不宏大，但每一步都在帮你重新拿回主动权。</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className={`group relative flex flex-col overflow-hidden rounded-4xl bg-gradient-to-br ${f.c} p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft`}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-terracotta`}>
                <f.icon size={22} />
              </span>
              <h3 className="font-display mt-4 text-lg font-bold text-ink">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-warmgray">{f.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-terracotta">
                去看看 <ArrowRight size={15} className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <WaveDivider />

      {/* 知识库：四本书是底座，不是书架 */}
      <section id="kb">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="pill bg-white/70 text-terracotta shadow-card">知识底座</span>
            <h2 className="section-title mt-3 font-semibold">四本原典，不在书架上，在回答里</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-warmgray">
              不是装饰书单。四本书全文切成语义片段，接进回答链路——你写下一句话，
              它先去书里找依据，再组织成话。所以每条建议后面都带着出处，而你不必自己去翻书。
            </p>
          </div>
          <div className="rounded-3xl bg-white/70 px-6 py-4 text-center shadow-card">
            <p className="text-3xl font-bold text-terracotta">
              {(stats.chars / 10000).toFixed(0)} 万字
            </p>
            <p className="mt-1 text-[11px] text-warmgray">
              {stats.chapters} 章 · {stats.chunks.toLocaleString()} 个检索片段
            </p>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.05fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {sources.map((s) => (
              <div
                key={s.id}
                className="relative overflow-hidden rounded-4xl bg-white/70 p-5 pt-6 shadow-card"
              >
                <span
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ background: s.accent }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="rounded-full bg-peach/60 px-2 py-0.5 text-[10px] text-terracotta">
                    {s.role}
                  </span>
                </div>
                <h3 className="font-display mt-3 text-[15px] font-semibold leading-snug text-ink">
                  {s.title}
                </h3>
                <p className="mt-1 text-[11px] text-warmgray/90">{s.author}</p>
                <p className="mt-2.5 text-[11.5px] leading-relaxed text-warmgray">{s.use}</p>
                <p className="mt-3 border-t border-peach/60 pt-2 text-[10.5px] text-warmgray/80">
                  {s.chapterCount} 章 · {s.chunkCount.toLocaleString()} 个片段
                  {s.lang === "en" && " · 英文原版"}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-4xl bg-gradient-to-br from-sage/20 via-cream to-peach/50 p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold text-ink">试一句，看它翻出了什么</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-warmgray">
              这就是对话里每次回答前发生的事：先检索，再说话。
            </p>
            <div className="mt-4">
              <KbProbe />
            </div>
          </div>
        </div>
      </section>

      <WaveDivider />

      {/* Breath */}
      <section className="relative grid items-center gap-8 overflow-hidden rounded-5xl bg-sage/15 p-8 sm:p-12 lg:grid-cols-2">
        <InkBlob className="left-[-50px] bottom-[-40px] h-52 w-52" color="#9CB39A" />
        <div className="relative">
          <h2 className="font-display text-3xl font-semibold text-ink">先一起，松一口气</h2>
          <p className="mt-3 leading-relaxed text-warmgray">
            身体先平静，脑子才跟得上。点开下面的圆圆，跟着它吸气、呼气，
            哪怕只是一分钟，也能让你从“紧绷”里探出头来。
          </p>
          <Link href="/chat" className="btn-ghost mt-6">
            还是想聊聊
          </Link>
        </div>
        <div className="relative flex justify-center">
          <BreathWidget />
        </div>
      </section>

      <WaveDivider />

      {/* FAQ */}
      <section>
        <div className="text-center">
          <h2 className="section-title font-semibold">你可能想问</h2>
        </div>
        <div className="mx-auto mt-8 max-w-3xl">
          <Faq />
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-5xl bg-terracotta p-8 text-center text-white sm:p-12">
        <InkBlob className="right-[-30px] top-[-30px] h-44 w-44" color="#F4C77B" />
        <InkBlob className="left-[-30px] bottom-[-40px] h-44 w-44" color="#9C6B78" />
        <div className="relative">
          <h2 className="font-display text-3xl font-semibold">先安自己的心，再上考场。</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            安心考是自助参考工具，不替代专业诊断与治疗。如果此刻你很痛苦，
            请记住全国心理援助热线 12356 一直都在。
          </p>
          <Link
            href="/assess"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 font-semibold text-terracotta shadow-soft transition hover:-translate-y-0.5"
          >
            免费开始 <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
