import { useState, useCallback } from "react";

// ══════════════════════════════════════════════════════
//  図形データ  viewBox "0 0 80 70"
//  三角形 正答：ウ・ケ・コ・セ
//  四角形 正答：イ・カ・ケ・シ
// ══════════════════════════════════════════════════════

const TRI_SAMPLE = "54,14 13,48 53,43";

const TRI_FIGS = [
  { id:"ア", pts:"12,50 28,8 46,50",            correct:false },
  { id:"イ", pts:"15,5 15,62 52,62",             correct:false },
  { id:"ウ", pts:"61,49 27,8 32,48",             correct:true  },
  { id:"エ", pts:"5,15 8,55 62,38",              correct:false },
  { id:"オ", pts:"8,30 28,10 62,10 42,30",       correct:false },
  { id:"カ", pts:"38,5 5,62 68,62",              correct:false },
  { id:"キ", pts:"38,5 65,26 54,58 22,58 8,26",  correct:false },
  { id:"ク", pts:"38,12 4,55 70,55",             correct:false },
  { id:"ケ", pts:"19,49 53,8 48,48",             correct:true  },
  { id:"コ", pts:"26,56 67,22 27,27",            correct:true  },
  { id:"サ", pts:"38,8 8,58 65,58",              correct:false },
  { id:"シ", pts:"38,5 60,38 38,65 16,38",       correct:false },
  { id:"ス", pts:"8,8 60,35 8,60",               correct:false },
  { id:"セ", pts:"61,21 27,62 32,22",            correct:true  },
];

const QUAD_SAMPLE = "39,9 62,26 48,62 12,44";

const QUAD_FIGS = [
  { id:"ア", pts:"5,5 5,62 52,62",                correct:false },
  { id:"イ", pts:"41,9 18,26 32,62 68,44",         correct:true  },
  { id:"ウ", pts:"38,5 62,35 38,62 14,35",         correct:false },
  { id:"エ", pts:"5,30 30,15 68,28 42,42",         correct:false },
  { id:"オ", pts:"38,5 65,27 54,60 20,60 8,27",    correct:false },
  { id:"カ", pts:"66,34 49,57 13,43 31,7",         correct:true  },
  { id:"キ", pts:"38,5 5,62 68,62",                correct:false },
  { id:"ク", pts:"12,10 58,10 48,60 5,60",         correct:false },
  { id:"ケ", pts:"14,36 31,13 67,27 49,63",        correct:true  },
  { id:"コ", pts:"35,5 60,35 35,62 10,35",         correct:false },
  { id:"サ", pts:"35,5 62,28 52,62 18,62 8,28",    correct:false },
  { id:"シ", pts:"41,61 18,44 32,8 68,26",         correct:true  },
  { id:"ス", pts:"12,12 58,12 58,58 12,58",        correct:false },
  { id:"セ", pts:"5,10 62,10 62,60",               correct:false },
];

const TRI_CORRECT  = new Set(["ウ","ケ","コ","セ"]);
const QUAD_CORRECT = new Set(["イ","カ","ケ","シ"]);

// ══════════════════════════════════════════════════════
//  Google Apps Script の URL
//  デプロイ後に発行されるURLをここに貼る
// ══════════════════════════════════════════════════════
const GAS_URL = import.meta.env.VITE_GAS_URL || "";

// ══════════════════════════════════════════════════════
//  SVGコンポーネント
// ══════════════════════════════════════════════════════
function Shape({ pts, size = 80, selected = false }) {
  const h   = Math.round(size * 70 / 80);
  const col = selected ? "#1A6FBF" : "#3a3a3a";
  return (
    <svg viewBox="0 0 80 70" width={size} height={h}
         style={{ display:"block", overflow:"visible" }}>
      <polygon points={pts} fill={col} stroke={col}
               strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════
//  データ送信（Google Apps Script）
// ══════════════════════════════════════════════════════
async function sendToGAS(data) {
  if (!GAS_URL) {
    console.warn("GAS_URL が未設定です（.env.local を確認してください）");
    return true; // 開発中はスキップ
  }
  try {
    const res = await fetch(GAS_URL, {
      method:  "POST",
      mode:    "no-cors",      // GASはCORSを返さないのでno-cors
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    return true;
  } catch (e) {
    console.error("送信エラー:", e);
    return false;
  }
}

// ══════════════════════════════════════════════════════
//  メインコンポーネント
// ══════════════════════════════════════════════════════
export default function App() {
  const [step,       setStep]       = useState("intro");
  const [grade,      setGrade]      = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [triSel,     setTriSel]     = useState(new Set());
  const [quadSel,    setQuadSel]    = useState(new Set());
  const [saved,      setSaved]      = useState(null); // null=未送信 true=成功 false=失敗

  const toggle = useCallback((setSel, id) => {
    setSel(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const submit = async () => {
    setStep("done");
    setSaved(null);
    const data = {
      timestamp:    new Date().toISOString(),
      grade,
      schoolType,
      schoolName,
      triSelected:  [...triSel].join(","),
      quadSelected: [...quadSel].join(","),
      // 図形ごとの0/1（集計しやすい形）
      ...Object.fromEntries(TRI_FIGS.map(f  => [`tri_${f.id}`,  triSel.has(f.id)  ? 1 : 0])),
      ...Object.fromEntries(QUAD_FIGS.map(f => [`quad_${f.id}`, quadSel.has(f.id) ? 1 : 0])),
    };
    const ok = await sendToGAS(data);
    setSaved(ok);
  };

  // ─── 共通スタイル ──────────────────────────────────
  const BLUE = "#185FA5", LBLUE = "#378ADD", BGS = "#E3F0FB";

  const S = {
    wrap:  { maxWidth:680, margin:"0 auto", padding:"1.5rem 1rem" },
    h1:    { fontSize:22, fontWeight:600, color:"var(--color-text-primary)", margin:"0 0 .75rem" },
    sub:   { fontSize:13, color:"var(--color-text-secondary)", margin:"0 0 .4rem" },
    body:  { fontSize:15, color:"var(--color-text-secondary)", lineHeight:1.8, margin:"0 0 1.25rem" },
    btn:   (bg="#185FA5", c="#fff") => ({
             width:"100%", padding:"14px", background:bg, color:c,
             border:"none", borderRadius:"var(--border-radius-md)",
             fontSize:16, fontWeight:600, cursor:"pointer",
           }),
    selBtn:(active) => ({
             padding:"12px 0", fontSize:16, fontWeight:500, cursor:"pointer",
             borderRadius:"var(--border-radius-md)",
             border: active ? `2.5px solid ${LBLUE}` : "1px solid var(--color-border-tertiary)",
             background: active ? BGS : "var(--color-background-primary)",
             color:      active ? BLUE : "var(--color-text-primary)",
           }),
    inp:   { width:"100%", padding:"10px 12px", fontSize:15,
             border:"1px solid var(--color-border-secondary)",
             borderRadius:"var(--border-radius-md)",
             background:"var(--color-background-primary)",
             color:"var(--color-text-primary)" },
    sample:{ display:"flex", flexDirection:"column", alignItems:"center",
             background:"var(--color-background-secondary)",
             border:"2px dashed var(--color-border-secondary)",
             borderRadius:"var(--border-radius-lg)",
             padding:"1.25rem", marginBottom:"1rem" },
    grid:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:"1.5rem" },
    cell:  (sel) => ({
             display:"flex", flexDirection:"column", alignItems:"center",
             padding:"12px 4px 10px", borderRadius:"var(--border-radius-md)",
             cursor:"pointer", userSelect:"none", WebkitUserSelect:"none",
             border:      sel ? `2.5px solid ${LBLUE}` : "1px solid var(--color-border-tertiary)",
             background:  sel ? BGS : "var(--color-background-primary)",
             transition:  "border .1s, background .1s",
           }),
    lbl:   (sel) => ({ fontSize:14, fontWeight:600, marginTop:6,
             color: sel ? BLUE : "var(--color-text-secondary)" }),
    pip:   (a,d) => ({ flex:1, height:5, borderRadius:3,
             background: d ? BLUE : a ? LBLUE : "var(--color-border-tertiary)" }),
  };

  // ─── イントロ ─────────────────────────────────────
  if (step === "intro") return (
    <div style={S.wrap}>
      <p style={S.sub}>かたちのちょうさ（2問）</p>
      <h1 style={S.h1}>これから　かたちの　もんだいを　します。</h1>
      <p style={S.body}>
        みぎの　かたちと　<strong>おなじ　かたち</strong>を　ぜんぶ　えらんで　ください。<br/>
        むきが　ちがっても、かたちが　おなじなら　えらびましょう。
      </p>

      <p style={{ ...S.sub, marginBottom:8 }}>なんねんせい？</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:"1.25rem" }}>
        {["1","2","3","4","5","6"].map(g => (
          <button key={g} style={S.selBtn(grade===g)} onClick={() => setGrade(g)}>
            {g}ねん
          </button>
        ))}
      </div>

      <p style={{ ...S.sub, marginBottom:8 }}>学校の　しゅるい</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:"1.25rem" }}>
        {["附属小","公立小"].map(t => (
          <button key={t} style={{ ...S.selBtn(schoolType===t), padding:"15px 0" }}
            onClick={() => setSchoolType(t)}>{t}
          </button>
        ))}
      </div>

      <p style={{ ...S.sub, marginBottom:8 }}>
        学校名　<span style={{ fontWeight:400 }}>（なくてもよい）</span>
      </p>
      <input style={{ ...S.inp, marginBottom:"1.75rem" }}
        placeholder="例：○○小学校"
        value={schoolName}
        onChange={e => setSchoolName(e.target.value)}
      />

      <button
        style={{ ...S.btn(), opacity: grade && schoolType ? 1 : 0.35 }}
        disabled={!grade || !schoolType}
        onClick={() => setStep("tri")}
      >
        はじめる　→
      </button>
    </div>
  );

  // ─── 三角形問題 ──────────────────────────────────
  if (step === "tri") return (
    <div style={S.wrap}>
      <div style={{ display:"flex", gap:8, marginBottom:"1.25rem" }}>
        <div style={S.pip(true,false)} /><div style={S.pip(false,false)} />
      </div>
      <p style={S.sub}>もんだい①　三角形</p>
      <p style={S.body}>
        みぎの　かたちと　<strong>おなじ　かたち</strong>を　ぜんぶ　えらんで　ください。<br/>
        <span style={{ fontSize:13 }}>（むきが　ちがっても　おなじ　かたちなら　えらびましょう）</span>
      </p>

      <div style={S.sample}>
        <span style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:10 }}>
          ▶ みぎの　かたち
        </span>
        <Shape pts={TRI_SAMPLE} size={80} />
      </div>

      <p style={{ fontSize:13, color:"var(--color-text-secondary)", textAlign:"center", marginBottom:10 }}>
        {triSel.size > 0 ? `${triSel.size}こ　えらんでいます` : "まだ　えらんでいません"}
      </p>

      <div style={S.grid}>
        {TRI_FIGS.map(f => {
          const sel = triSel.has(f.id);
          return (
            <div key={f.id} style={S.cell(sel)} onClick={() => toggle(setTriSel, f.id)}>
              <Shape pts={f.pts} size={80} selected={sel} />
              <span style={S.lbl(sel)}>{f.id}</span>
            </div>
          );
        })}
      </div>

      <button style={S.btn()} onClick={() => setStep("quad")}>
        つぎの　もんだいへ　→
      </button>
    </div>
  );

  // ─── 四角形問題 ──────────────────────────────────
  if (step === "quad") return (
    <div style={S.wrap}>
      <div style={{ display:"flex", gap:8, marginBottom:"1.25rem" }}>
        <div style={S.pip(false,true)} /><div style={S.pip(true,false)} />
      </div>
      <p style={S.sub}>もんだい②　四角形</p>
      <p style={S.body}>
        みぎの　かたちと　<strong>おなじ　かたち</strong>を　ぜんぶ　えらんで　ください。<br/>
        <span style={{ fontSize:13 }}>（むきが　ちがっても　おなじ　かたちなら　えらびましょう）</span>
      </p>

      <div style={S.sample}>
        <span style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:10 }}>
          ▶ みぎの　かたち
        </span>
        <Shape pts={QUAD_SAMPLE} size={80} />
      </div>

      <p style={{ fontSize:13, color:"var(--color-text-secondary)", textAlign:"center", marginBottom:10 }}>
        {quadSel.size > 0 ? `${quadSel.size}こ　えらんでいます` : "まだ　えらんでいません"}
      </p>

      <div style={S.grid}>
        {QUAD_FIGS.map(f => {
          const sel = quadSel.has(f.id);
          return (
            <div key={f.id} style={S.cell(sel)} onClick={() => toggle(setQuadSel, f.id)}>
              <Shape pts={f.pts} size={80} selected={sel} />
              <span style={S.lbl(sel)}>{f.id}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 2.5fr", gap:10 }}>
        <button style={S.btn("var(--color-background-secondary)","var(--color-text-primary)")}
          onClick={() => setStep("tri")}>← もどる
        </button>
        <button style={S.btn()} onClick={submit}>
          こたえを　おくる　✓
        </button>
      </div>
    </div>
  );

  // ─── 完了画面 ────────────────────────────────────
  if (step === "done") return (
    <div style={{ ...S.wrap, textAlign:"center", paddingTop:"3rem" }}>
      <div style={{ fontSize:56, marginBottom:"1rem" }}>
        {saved === null ? "⏳" : saved ? "✅" : "⚠️"}
      </div>
      <h1 style={{ ...S.h1, fontSize:24 }}>
        {saved === null
          ? "おくっています…"
          : saved
          ? "ありがとうございました！"
          : "もう一度　おためしください"}
      </h1>
      <p style={{ ...S.body, textAlign:"center" }}>
        {saved
          ? "こたえは　きろくされました。"
          : saved === false
          ? "つうしんエラーが　おきました。"
          : ""}
      </p>

      {saved !== null && (
        <>
          <div style={{
            fontSize:13, color:"var(--color-text-secondary)",
            background:"var(--color-background-secondary)",
            borderRadius:"var(--border-radius-md)",
            padding:"12px 16px", textAlign:"left",
            display:"inline-block", margin:"0 auto 2rem",
          }}>
            <div>三角形：{[...triSel].join("・") || "なし"}</div>
            <div>四角形：{[...quadSel].join("・") || "なし"}</div>
          </div>

          {saved === false && (
            <button style={{ ...S.btn(), marginBottom:"1rem" }} onClick={submit}>
              もういちど　おくる
            </button>
          )}

          <div>
            <button
              style={{ ...S.btn("var(--color-background-secondary)","var(--color-text-primary)"),
                       display:"inline-block", width:"auto", padding:"12px 24px" }}
              onClick={() => {
                setStep("intro");
                setTriSel(new Set()); setQuadSel(new Set());
                setGrade(""); setSchoolType(""); setSchoolName("");
                setSaved(null);
              }}
            >
              さいしょに　もどる
            </button>
          </div>
        </>
      )}
    </div>
  );

  return null;
}
