"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotebookPen, Save, Plus, ArrowDownRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import KbGrounding from "@/components/KbGrounding";

type Record = {
  id: string;
  date: string;
  situation: string;
  autoThought: string;
  emotion: string;
  intensity: number;
  evFor: string;
  evAgainst: string;
  balanced: string;
  reIntensity: number;
};

const empty: Omit<Record, "id" | "date"> = {
  situation: "",
  autoThought: "",
  emotion: "",
  intensity: 70,
  evFor: "",
  evAgainst: "",
  balanced: "",
  reIntensity: 40,
};

const STORAGE = "axk_records";

export default function RecordPage() {
  const [form, setForm] = useState(empty);
  const [list, setList] = useState<Record[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE);
    if (raw) setList(JSON.parse(raw));
  }, []);

  function persist(next: Record[]) {
    setList(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
  }

  function save() {
    if (!form.situation.trim() || !form.autoThought.trim()) return;
    const rec: Record = {
      ...form,
      id: crypto.randomUUID(),
      date: new Date().toLocaleString("zh-CN", { hour12: false }),
    };
    persist([rec, ...list]);
    setForm(empty);
  }

  function reset() {
    setForm(empty);
  }

  const set = (k: keyof typeof empty, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-8">
      <PageHero
        emoji="📓"
        tag="思维记录"
        title="把念头写下来，它就变小了"
        desc="CBT 的核心工具。慢慢填，不用一次写完美——写出来的过程本身就在帮你松绑。写下的句子会同步去四本原典里检索，相关段落就在下面递给你。"
      />

      <div className="glass-card space-y-5 p-6 sm:p-8">
        <Field label="① 情境 · 刚才发生了什么？">
          <textarea
            rows={2}
            value={form.situation}
            onChange={(e) => set("situation", e.target.value)}
            placeholder="比如：明天要考高数，今晚还差两章没看完"
            className="input"
          />
        </Field>

        <Field label="② 自动思维 · 脑子里冒出了什么念头？">
          <textarea
            rows={2}
            value={form.autoThought}
            onChange={(e) => set("autoThought", e.target.value)}
            placeholder="比如：我肯定考不过，完了"
            className="input"
          />
        </Field>

        {/* 知识库接入：边写边检索四本原典，把相关原文递到手边 */}
        <KbGrounding query={`${form.situation} ${form.autoThought}`} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="③ 情绪 · 当时是什么感受？">
            <input
              value={form.emotion}
              onChange={(e) => set("emotion", e.target.value)}
              placeholder="焦虑 / 害怕 / 沮丧…"
              className="input"
            />
          </Field>
          <Field label={`④ 情绪强度 · ${form.intensity}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={form.intensity}
              onChange={(e) => set("intensity", Number(e.target.value))}
              className="mt-3 w-full accent-terracotta"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="⑤ 支持这个想法的证据">
            <textarea
              rows={2}
              value={form.evFor}
              onChange={(e) => set("evFor", e.target.value)}
              placeholder="我确实还没复习完"
              className="input"
            />
          </Field>
          <Field label="⑥ 反对它的证据">
            <textarea
              rows={2}
              value={form.evAgainst}
              onChange={(e) => set("evAgainst", e.target.value)}
              placeholder="我平时成绩还行，重点都划过了"
              className="input"
            />
          </Field>
        </div>

        <Field label="⑦ 更平衡的想法 · 换一个更靠近事实的说法">
          <textarea
            rows={2}
            value={form.balanced}
            onChange={(e) => set("balanced", e.target.value)}
            placeholder="我还没看完，但已经掌握了大部分，尽力就好"
            className="input"
          />
        </Field>

        <Field label={`⑧ 重新评估情绪强度 · ${form.reIntensity}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={form.reIntensity}
            onChange={(e) => set("reIntensity", Number(e.target.value))}
            className="mt-3 w-full accent-moss"
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <button onClick={save} className="btn-primary">
            <Save size={18} /> 保存这条记录
          </button>
          <button onClick={reset} className="btn-ghost">
            <Plus size={18} /> 新建空白
          </button>
        </div>
      </div>

      {/* 历史记录 */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">
          已记录 {list.length} 条
        </h2>
        {list.length === 0 ? (
          <p className="rounded-3xl bg-white/60 p-8 text-center text-warmgray">
            还没有记录。写下第一条，开始和焦虑对话吧。
          </p>
        ) : (
          <div className="grid gap-4">
            {list.map((r) => {
              const drop = r.intensity - r.reIntensity;
              return (
                <div key={r.id} className="glass-card p-5">
                  <div className="flex items-center justify-between text-xs text-warmgray">
                    <span>{r.date}</span>
                    <span className="inline-flex items-center gap-1 text-moss">
                      情绪 {r.intensity}% → {r.reIntensity}%{" "}
                      <ArrowDownRight size={14} />
                      <span className="font-semibold">-{drop}%</span>
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink">
                    <span className="text-terracotta">情境：</span>
                    {r.situation}
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    <span className="text-terracotta">念头：</span>
                    {r.autoThought}
                  </p>
                  {r.balanced && (
                    <p className="mt-1 text-sm text-moss">
                      <span className="text-moss">平衡想法：</span>
                      {r.balanced}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {list.length > 0 && (
          <Link href="/progress" className="btn-ghost mt-5">
            去看看我的情绪变化
          </Link>
        )}
      </section>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #ffe8d6;
          background: rgba(255, 255, 255, 0.8);
          padding: 0.7rem 0.9rem;
          color: #3d352e;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus {
          border-color: #d97e63;
          box-shadow: 0 0 0 3px rgba(240, 160, 140, 0.25);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
