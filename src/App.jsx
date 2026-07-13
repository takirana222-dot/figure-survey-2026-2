import { useState, useCallback } from "react";

// ══════════════════════════════════════════════
// 図形データ  viewBox "0 0 80 70"
// 三角形 正答：ウ・ケ・コ・セ
// 四角形 正答：イ・カ・ケ・シ
// ══════════════════════════════════════════════

const TRI_SAMPLE = "54,14 13,48 53,43";

const TRI_FIGS = [
  { id:"ア", pts:"12,50 28,8 46,50",           correct:false },
  { id:"イ", pts:"15,5 15,62 52,62",            correct:false },
  { id:"ウ", pts:"61,49 27,8 32,48",            correct:true  },
  { id:"エ", pts:"5,15 8,55 62,38",             correct:false },
  { id:"オ", pts:"8,30 28,10 62,10 42,30",      correct:false },
  { id:"カ", pts:"38,5 5,62 68,62",             correct:false },
  { id:"キ", pts:"38,5 65,26 54,58 22,58 8,26", correct:false },
  { id:"ク", pts:"38,12 4,55 70,55",            correct:false },
  { id:"ケ", pts:"19,49 53,8 48,48",            correct:true  },
  { id:"コ", pts:"26,56 67,22 27,27",           correct:true  },
  { id:"サ", pts:"38,8 8,58 65,58",             correct:false },
  { id:"シ", pts:"38,5 60,38 38,65 16,38",      correct:false },
  { id:"ス", pts:"8,8 60,35 8,60",              correct:false },
  { id:"セ", pts:"61,21 27,62 32,22",           correct:true  },
];

const QUAD_SAMPLE = "39,9 62,26 48,62 12,44";

const QUAD_FIGS = [
  { id:"ア", pts:"5,5 5,62 52,62",               correct:false },
  { id:"イ", pts:"41,9 18,26 32,62 68,44",        correct:true  },
  { id:"ウ", pts:"38,5 62,35 38,62 14,35",        correct:false },
  { id:"エ", pts:"5,30 30,15 68,28 42,42",        correct:false },
  { id:"オ", pts:"38,5 65,27 54,60 20,60 8,27",   correct:false },
  { id:"カ", pts:"66,34 49,57 13,43 31,7",        correct:true  },
  { id:"キ", pts:"38,5 5,62 68,62",               correct:false },
  { id:"ク", pts:"12,10 58,10 48,60 5,60",        correct:false },
  { id:"ケ", pts:"14,36 31,13 67,27 49,63",       correct:true  },
  { id:"コ", pts:"35,5 60,35 35,62 10,35",        correct:false },
  { id:"サ", pts:"35,5 62,28 52,62 18,62 8,28",   correct:false },
  { id:"シ", pts:"41,61 18,44 32,8 68,26",        correct:true  },
  { id:"ス", pts:"12,12 58,12 58,58 12,58",       correct:false },
  { id:"セ", pts:"5,10 62,10 62,60",              correct:false },
];

const TRI_CORRECT  = new Set(["ウ","ケ","コ","セ"]);
const QUAD_CORRECT = new Set(["イ","カ","ケ","シ"]);

// ══════════════════════════════════════════════
// SVG 図形
// ══════════════════════════════════════════════
function Shape({ pts, size=80, selected=false }) {
  const h = Math.round(size * 70 / 80);
  const fill    = selected ? "#1A6FBF" : "#3a3a3a";
  const stroke  = selected ? "#1A6FBF" : "#3a3a3a";
  return (
    <svg viewBox="0 0 80 70" width={size} height={h}
         style={{display:"block", overflow:"visible"}}>
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="1"
               strokeLinejoin="round"/>
    </svg>
  );
}

// ══════════════════════════════════════════════
// ストレージ
// ══════════════════════════════════════════════
async function saveResponse(data) {
  try {
    const key = `resp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await window.storage.set(key, JSON.stringify(data), true);
    return true;
  } catch(e) { return false; }
}

async function loadAllResponses() {
  const keys = await window.storage.list("resp_", true);
  const out = [];
  for (const k of (keys.keys || [])) {
    try {
      const r = await window.storage.get(k, true);
      if (r) out.push({ key: k, ...JSON.parse(r.value) });
    } catch {}
  }
  return out.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ══════════════════════════════════════════════
// CSV エクスポート
// ══════════════════════════════════════════════
function exportCSV(rows) {
  const headers = ["日時","学年","学校種別","学校名",
    "三角形_選択","三角形_正答数","三角形_見落し","三角形_余分","三角形_完全正答",
    "四角形_選択","四角形_正答数","四角形_見落し","四角形_余分","四角形_完全正答",
    ...TRI_FIGS.map(f=>`三角形_${f.id}`),
    ...QUAD_FIGS.map(f=>`四角形_${f.id}`),
  ];
  const calcScore = (sel, correct) => {
    const s = new Set(sel);
    const hits   = [...s].filter(x=>correct.has(x)).length;
    const extra  = [...s].filter(x=>!correct.has(x)).length;
    const missed = [...correct].filter(x=>!s.has(x)).length;
    return { hits, extra, missed, perfect: hits===correct.size && extra===0 };
  };
  const lines = rows.map(r => {
    const ts  = calcScore(r.triSelected||[], TRI_CORRECT);
    const qs  = calcScore(r.quadSelected||[], QUAD_CORRECT);
    const triSet  = new Set(r.triSelected||[]);
    const quadSet = new Set(r.quadSelected||[]);
    return [
      new Date(r.timestamp).toLocaleString("ja-JP"),
      r.grade, r.schoolType, r.schoolName||"",
      (r.triSelected||[]).join(" "), ts.hits, ts.missed, ts.extra, ts.perfect?1:0,
      (r.quadSelected||[]).join(" "), qs.hits, qs.missed, qs.extra, qs.perfect?1:0,
      ...TRI_FIGS.map(f=>triSet.has(f.id)?1:0),
      ...QUAD_FIGS.map(f=>quadSet.has(f.id)?1:0),
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",");
  });
  const bom = "\uFEFF";
  const csv = bom + [headers.join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a");
  a.href = url; a.download = `figure_survey_${Date.now()}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════
// メインコンポーネント
// ══════════════════════════════════════════════
export default function App() {
  const [step,       setStep]       = useState("intro");
  const [grade,      setGrade]      = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [triSel,     setTriSel]     = useState(new Set());
  const [quadSel,    setQuadSel]    = useState(new Set());
  const [saved,      setSaved]      = useState(null);
  const [adminMode,  setAdminMode]  = useState(false);
  const [adminData,  setAdminData]  = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [pwInput,    setPwInput]    = useState("");
  const [pwError,    setPwError]    = useState(false);
  const ADMIN_PW = "sensei2026";

  const toggle = useCallback((setSel, id) => {
    setSel(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const submit = async () => {
    const data = {
      timestamp: new Date().toISOString(),
      grade, schoolType, schoolName,
      triSelected:  [...triSel],
      quadSelected: [...quadSel],
    };
    setSaved(null);
    const ok = await saveResponse(data);
    setSaved(ok);
    setStep("done");
  };

  const openAdmin = async () => {
    if (pwInput !== ADMIN_PW) { setPwError(true); return; }
    setPwError(false);
    setAdminLoading(true);
    try {
      const rows = await loadAllResponses();
      setAdminData(rows);
      setAdminMode(true);
    } catch(e) { alert("読み込みエラー: "+e.message); }
    finally { setAdminLoading(false); }
  };

  // ─── スタイル共通 ─────────────────────────────
  const C = {
    wrap:  { maxWidth:680, margin:"0 auto", padding:"1.25rem 1rem", fontFamily:"var(--font-sans)" },
    h1:    { fontSize:20, fontWeight:500, color:"var(--color-text-primary)", margin:"0 0 .75rem" },
    sub:   { fontSize:13, color:"var(--color-text-secondary)", margin:"0 0 .35rem" },
    body:  { fontSize:14, color:"var(--color-text-secondary)", lineHeight:1.7, margin:"0 0 1.25rem" },
    btn:   { width:"100%", padding:"13px", background:"#185FA5", color:"#fff",
             border:"none", borderRadius:"var(--border-radius-md)", fontSize:15,
             fontWeight:500, cursor:"pointer" },
    btnG:  { padding:"11px 0", fontSize:15, fontWeight:500, cursor:"pointer",
             borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-tertiary)",
             background:"var(--color-background-primary)", color:"var(--color-text-primary)" },
    btnS:  { width:"100%", padding:"13px", background:"var(--color-background-secondary)",
             color:"var(--color-text-primary)", border:"0.5px solid var(--color-border-secondary)",
             borderRadius:"var(--border-radius-md)", fontSize:15, fontWeight:500, cursor:"pointer" },
    inp:   { width:"100%", padding:"9px 11px", fontSize:14, boxSizing:"border-box",
             border:"0.5px solid var(--color-border-secondary)",
             borderRadius:"var(--border-radius-md)",
             background:"var(--color-background-primary)", color:"var(--color-text-primary)" },
    sample:{ display:"flex", flexDirection:"column", alignItems:"center",
             background:"var(--color-background-secondary)",
             border:"2px dashed var(--color-border-secondary)",
             borderRadius:"var(--border-radius-lg)", padding:"1rem", margin:"0 0 1rem" },
    grid:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9, margin:"0 0 1.25rem" },
    cell:  (sel) => ({
             display:"flex", flexDirection:"column", alignItems:"center",
             padding:"10px 4px 8px", borderRadius:"var(--border-radius-md)",
             cursor:"pointer", userSelect:"none", WebkitUserSelect:"none",
             border: sel ? "2.5px solid #378ADD" : "0.5px solid var(--color-border-tertiary)",
             background: sel ? "#E3F0FB" : "var(--color-background-primary)",
             transition:"border 0.1s, background 0.1s",
           }),
    lbl:   (sel) => ({ fontSize:13, fontWeight:500, marginTop:5,
             color: sel ? "#185FA5" : "var(--color-text-secondary)" }),
    bar:   { display:"flex", gap:7, margin:"0 0 1.25rem" },
    pip:   (a,d) => ({ flex:1, height:4, borderRadius:2,
             background: d?"#185FA5":a?"#378ADD":"var(--color-border-tertiary)" }),
    cnt:   { fontSize:12, color:"var(--color-text-secondary)", textAlign:"center", margin:"0 0 .75rem" },
  };

  // ─── イントロ ────────────────────────────────
  if (step === "intro") return (
    <div style={C.wrap}>
      <p style={C.sub}>かたちのちょうさ</p>
      <h1 style={C.h1}>これから かたちの もんだいをします。</h1>
      <p style={C.body}>
        みぎの かたちと <strong>おなじ かたち</strong>を ぜんぶ えらんで ください。
        むきや おおきさが ちがっても、かたちが おなじなら えらびましょう。
      </p>

      <p style={{...C.sub, marginBottom:7}}>なんねんせい？</p>
      <div style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:7, marginBottom:"1rem"}}>
        {["1","2","3","4","5","6"].map(g=>(
          <button key={g} style={{...C.btnG,
            border: grade===g?"2.5px solid #378ADD":"0.5px solid var(--color-border-tertiary)",
            background: grade===g?"#E3F0FB":"var(--color-background-primary)",
            color: grade===g?"#185FA5":"var(--color-text-primary)",
          }} onClick={()=>setGrade(g)}>{g}ねん</button>
        ))}
      </div>

      <p style={{...C.sub, marginBottom:7}}>学校の種類</p>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:"1rem"}}>
        {["附属小","公立小"].map(t=>(
          <button key={t} style={{...C.btnG,
            padding:"14px 0",
            border: schoolType===t?"2.5px solid #378ADD":"0.5px solid var(--color-border-tertiary)",
            background: schoolType===t?"#E3F0FB":"var(--color-background-primary)",
            color: schoolType===t?"#185FA5":"var(--color-text-primary)",
          }} onClick={()=>setSchoolType(t)}>{t}</button>
        ))}
      </div>

      <p style={{...C.sub, marginBottom:7}}>学校名　<span style={{fontWeight:400}}>(なくてもよい)</span></p>
      <input style={{...C.inp, marginBottom:"1.5rem"}}
        placeholder="例：○○小学校"
        value={schoolName} onChange={e=>setSchoolName(e.target.value)}
      />

      <button style={{...C.btn, opacity:grade&&schoolType?1:0.4}}
        disabled={!grade||!schoolType}
        onClick={()=>setStep("tri")}>
        はじめる →
      </button>

      {/* 管理者ログイン */}
      <div style={{marginTop:"2.5rem", paddingTop:"1.25rem",
        borderTop:"0.5px solid var(--color-border-tertiary)"}}>
        <p style={{...C.sub, marginBottom:7}}>管理者ログイン</p>
        <div style={{display:"flex", gap:8}}>
          <input type="password" style={{...C.inp, flex:1,
            border: pwError?"1.5px solid #C0392B":"0.5px solid var(--color-border-secondary)"}}
            placeholder="パスワード" value={pwInput}
            onChange={e=>{setPwInput(e.target.value);setPwError(false);}}
            onKeyDown={e=>e.key==="Enter"&&openAdmin()}
          />
          <button style={{...C.btn, width:"auto", padding:"9px 18px",
            opacity:adminLoading?0.5:1}}
            disabled={adminLoading} onClick={openAdmin}>
            {adminLoading?"…":"ひらく"}
          </button>
        </div>
        {pwError && <p style={{fontSize:12, color:"#C0392B", marginTop:4}}>パスワードが違います</p>}
      </div>
    </div>
  );

  // ─── 三角形 ─────────────────────────────────
  if (step === "tri") return (
    <div style={C.wrap}>
      <div style={C.bar}>
        <div style={C.pip(true,false)}/><div style={C.pip(false,false)}/>
      </div>
      <p style={C.sub}>もんだい①　三角形</p>
      <p style={C.body}>
        みぎの かたちと <strong>おなじ かたち</strong>を ぜんぶ えらんで ください。<br/>
        <span style={{fontSize:12}}>（むきが ちがっても おなじ かたちなら えらびましょう）</span>
      </p>

      <div style={C.sample}>
        <span style={{fontSize:11, color:"var(--color-text-secondary)", marginBottom:8}}>▶ みぎの かたち</span>
        <Shape pts={TRI_SAMPLE} size={80} />
      </div>

      <p style={C.cnt}>{triSel.size > 0 ? `${triSel.size}こ えらんでいます` : "えらんでいません"}</p>

      <div style={C.grid}>
        {TRI_FIGS.map(f=>{
          const sel = triSel.has(f.id);
          return (
            <div key={f.id} style={C.cell(sel)} onClick={()=>toggle(setTriSel,f.id)}>
              <Shape pts={f.pts} size={80} selected={sel}/>
              <span style={C.lbl(sel)}>{f.id}</span>
            </div>
          );
        })}
      </div>

      <button style={C.btn} onClick={()=>setStep("quad")}>
        つぎのもんだいへ →
      </button>
    </div>
  );

  // ─── 四角形 ─────────────────────────────────
  if (step === "quad") return (
    <div style={C.wrap}>
      <div style={C.bar}>
        <div style={C.pip(false,true)}/><div style={C.pip(true,false)}/>
      </div>
      <p style={C.sub}>もんだい②　四角形</p>
      <p style={C.body}>
        みぎの かたちと <strong>おなじ かたち</strong>を ぜんぶ えらんで ください。<br/>
        <span style={{fontSize:12}}>（むきが ちがっても おなじ かたちなら えらびましょう）</span>
      </p>

      <div style={C.sample}>
        <span style={{fontSize:11, color:"var(--color-text-secondary)", marginBottom:8}}>▶ みぎの かたち</span>
        <Shape pts={QUAD_SAMPLE} size={80} />
      </div>

      <p style={C.cnt}>{quadSel.size > 0 ? `${quadSel.size}こ えらんでいます` : "えらんでいません"}</p>

      <div style={C.grid}>
        {QUAD_FIGS.map(f=>{
          const sel = quadSel.has(f.id);
          return (
            <div key={f.id} style={C.cell(sel)} onClick={()=>toggle(setQuadSel,f.id)}>
              <Shape pts={f.pts} size={80} selected={sel}/>
              <span style={C.lbl(sel)}>{f.id}</span>
            </div>
          );
        })}
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 2.5fr", gap:8}}>
        <button style={C.btnS} onClick={()=>setStep("tri")}>← もどる</button>
        <button style={C.btn} onClick={submit}>こたえをおくる ✓</button>
      </div>
    </div>
  );

  // ─── 完了 ────────────────────────────────────
  if (step === "done" && !adminMode) return (
    <div style={{...C.wrap, textAlign:"center", paddingTop:"2.5rem"}}>
      <div style={{fontSize:52, marginBottom:".75rem"}}>✅</div>
      <h1 style={{...C.h1, fontSize:22}}>ありがとうございました！</h1>
      <p style={{...C.body, textAlign:"center"}}>
        {saved === null
          ? "ほぞんちゅう…"
          : saved
          ? "こたえは ほぞんされました。"
          : "⚠️ ほぞんに しっぱいしました。もういちど おためしください。"
        }
      </p>
      <div style={{fontSize:12, color:"var(--color-text-secondary)",
        background:"var(--color-background-secondary)",
        borderRadius:"var(--border-radius-md)", padding:"10px 14px",
        textAlign:"left", margin:"1rem auto", maxWidth:360}}>
        <div>三角形：{[...triSel].join("・") || "なし"}</div>
        <div>四角形：{[...quadSel].join("・") || "なし"}</div>
      </div>
      <button style={{...C.btnS, maxWidth:200, margin:"0 auto"}}
        onClick={()=>{setStep("intro");setTriSel(new Set());setQuadSel(new Set());
          setGrade("");setSchoolType("");setSchoolName("");setSaved(null);}}>
        さいしょに もどる
      </button>
    </div>
  );

  // ─── 管理者ダッシュボード ──────────────────────
  if (adminMode) {
    const n = adminData.length;

    const calcScore = (sel, correct) => {
      const s = new Set(sel);
      const hits   = [...s].filter(x=>correct.has(x)).length;
      const extra  = [...s].filter(x=>!correct.has(x)).length;
      const missed = [...correct].filter(x=>!s.has(x)).length;
      return { hits, extra, missed, perfect: hits===correct.size && extra===0 };
    };

    const triCounts = {};  TRI_FIGS.forEach(f=>{triCounts[f.id]=0;});
    const quadCounts = {}; QUAD_FIGS.forEach(f=>{quadCounts[f.id]=0;});
    adminData.forEach(r=>{
      (r.triSelected||[]).forEach(id=>{if(id in triCounts)  triCounts[id]++;});
      (r.quadSelected||[]).forEach(id=>{if(id in quadCounts) quadCounts[id]++;});
    });

    const triPerfect  = adminData.filter(r=>calcScore(r.triSelected||[], TRI_CORRECT).perfect).length;
    const quadPerfect = adminData.filter(r=>calcScore(r.quadSelected||[], QUAD_CORRECT).perfect).length;
    const pct = (v,t) => t===0?"-":`${Math.round(v/t*100)}%`;

    // 学年別集計
    const byGrade = {};
    adminData.forEach(r=>{
      const g = r.grade+"年";
      if(!byGrade[g]) byGrade[g]={n:0,triOk:0,quadOk:0};
      byGrade[g].n++;
      if(calcScore(r.triSelected||[], TRI_CORRECT).perfect)  byGrade[g].triOk++;
      if(calcScore(r.quadSelected||[], QUAD_CORRECT).perfect) byGrade[g].quadOk++;
    });

    return (
      <div style={{...C.wrap, maxWidth:820}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem"}}>
          <h1 style={{...C.h1, margin:0}}>管理者ダッシュボード</h1>
          <div style={{display:"flex", gap:8}}>
            <button style={{...C.btnS, width:"auto", padding:"8px 14px", fontSize:13}}
              onClick={()=>exportCSV(adminData)}>
              📥 CSV ダウンロード
            </button>
            <button style={{...C.btnS, width:"auto", padding:"8px 14px", fontSize:13}}
              onClick={()=>{setAdminMode(false);setPwInput("");}}>
              ← 戻る
            </button>
          </div>
        </div>

        {/* サマリカード */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9, marginBottom:"1.25rem"}}>
          {[
            ["総回答数", n+"件", ""],
            ["三角形 完全正答", triPerfect+"件", pct(triPerfect,n)],
            ["四角形 完全正答", quadPerfect+"件", pct(quadPerfect,n)],
            ["両方 完全正答",
              adminData.filter(r=>calcScore(r.triSelected||[],TRI_CORRECT).perfect
                              &&calcScore(r.quadSelected||[],QUAD_CORRECT).perfect).length+"件",
              pct(adminData.filter(r=>calcScore(r.triSelected||[],TRI_CORRECT).perfect
                                   &&calcScore(r.quadSelected||[],QUAD_CORRECT).perfect).length,n)],
          ].map(([lbl,val,sub])=>(
            <div key={lbl} style={{background:"var(--color-background-secondary)",
              borderRadius:"var(--border-radius-md)", padding:"12px"}}>
              <div style={{fontSize:11, color:"var(--color-text-secondary)", marginBottom:4}}>{lbl}</div>
              <div style={{fontSize:20, fontWeight:500, color:"var(--color-text-primary)"}}>{val}</div>
              {sub && <div style={{fontSize:11, color:"var(--color-text-secondary)", marginTop:2}}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* 学年別 */}
        {Object.keys(byGrade).length > 1 && (
          <div style={{background:"var(--color-background-secondary)",
            borderRadius:"var(--border-radius-md)", padding:"12px", marginBottom:"1.25rem"}}>
            <p style={{fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:8}}>学年別完全正答率</p>
            <div style={{display:"flex", gap:"1.5rem", flexWrap:"wrap"}}>
              {Object.entries(byGrade).sort().map(([g,v])=>(
                <div key={g} style={{fontSize:13}}>
                  <span style={{color:"var(--color-text-secondary)"}}>{g}（{v.n}名）</span>
                  {" "}三角形 {pct(v.triOk,v.n)} / 四角形 {pct(v.quadOk,v.n)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 図形別選択率 */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1.25rem"}}>
          {[
            {label:"三角形（正答：ウ・ケ・コ・セ）", figs:TRI_FIGS,  counts:triCounts,  correct:TRI_CORRECT},
            {label:"四角形（正答：イ・カ・ケ・シ）", figs:QUAD_FIGS, counts:quadCounts, correct:QUAD_CORRECT},
          ].map(({label,figs,counts,correct})=>(
            <div key={label} style={{background:"var(--color-background-secondary)",
              borderRadius:"var(--border-radius-lg)", padding:"1rem"}}>
              <p style={{fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:10}}>{label}</p>
              {figs.map(f=>{
                const cnt = counts[f.id]||0;
                const pv  = n===0 ? 0 : cnt/n;
                const ok  = correct.has(f.id);
                return (
                  <div key={f.id} style={{display:"flex", alignItems:"center", gap:7, marginBottom:5}}>
                    <span style={{width:20, fontSize:12, fontWeight:500,
                      color: ok?"#185FA5":"var(--color-text-secondary)"}}>{f.id}</span>
                    <div style={{flex:1, height:12, background:"var(--color-border-tertiary)",
                      borderRadius:2, overflow:"hidden"}}>
                      <div style={{height:"100%", width:`${pv*100}%`,
                        background: ok?"#185FA5":"#D85A30", borderRadius:2,
                        transition:"width 0.4s"}}/>
                    </div>
                    <span style={{fontSize:11, color:"var(--color-text-secondary)",
                      minWidth:52, textAlign:"right"}}>
                      {cnt}人 {pct(cnt,n)}
                    </span>
                    {ok && <span style={{fontSize:10, color:"#185FA5"}}>✓</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 個別回答テーブル */}
        <p style={{fontSize:13, fontWeight:500, marginBottom:7}}>個別回答一覧（新しい順）</p>
        <div style={{overflowX:"auto", maxHeight:380, overflowY:"auto", fontSize:11,
          border:"0.5px solid var(--color-border-tertiary)",
          borderRadius:"var(--border-radius-md)"}}>
          <table style={{width:"100%", borderCollapse:"collapse", minWidth:680}}>
            <thead>
              <tr style={{background:"var(--color-background-secondary)",
                position:"sticky", top:0, zIndex:1}}>
                {["日時","学年","種別","学校名","三角形 選択","四角形 選択","三角形 判定","四角形 判定"]
                  .map(h=>(
                  <th key={h} style={{padding:"7px 9px", textAlign:"left", fontWeight:500,
                    color:"var(--color-text-secondary)", whiteSpace:"nowrap",
                    borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adminData.map((r,i)=>{
                const ts = calcScore(r.triSelected||[], TRI_CORRECT);
                const qs = calcScore(r.quadSelected||[], QUAD_CORRECT);
                return (
                  <tr key={i} style={{borderTop:"0.5px solid var(--color-border-tertiary)",
                    background: i%2===0?"transparent":"var(--color-background-secondary)"}}>
                    <td style={{padding:"6px 9px", whiteSpace:"nowrap"}}>
                      {new Date(r.timestamp).toLocaleString("ja-JP",
                        {month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}
                    </td>
                    <td style={{padding:"6px 9px"}}>{r.grade}年</td>
                    <td style={{padding:"6px 9px"}}>{r.schoolType}</td>
                    <td style={{padding:"6px 9px", maxWidth:80, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{r.schoolName||"−"}</td>
                    <td style={{padding:"6px 9px", fontFamily:"monospace"}}>
                      {(r.triSelected||[]).join("・")||"なし"}
                    </td>
                    <td style={{padding:"6px 9px", fontFamily:"monospace"}}>
                      {(r.quadSelected||[]).join("・")||"なし"}
                    </td>
                    <td style={{padding:"6px 9px",
                      color: ts.perfect?"#185FA5":"var(--color-text-secondary)"}}>
                      {ts.perfect?"◎完全":`正${ts.hits}/落${ts.missed}/余${ts.extra}`}
                    </td>
                    <td style={{padding:"6px 9px",
                      color: qs.perfect?"#185FA5":"var(--color-text-secondary)"}}>
                      {qs.perfect?"◎完全":`正${qs.hits}/落${qs.missed}/余${qs.extra}`}
                    </td>
                  </tr>
                );
              })}
              {n===0 && (
                <tr><td colSpan={8} style={{padding:"1.5rem", textAlign:"center",
                  color:"var(--color-text-secondary)"}}>
                  まだ回答がありません
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p style={{fontSize:11, color:"var(--color-text-secondary)", marginTop:8}}>
          ※ CSV ダウンロードボタンで全データを Excel 等で開けます（BOM付きUTF-8）
        </p>
      </div>
    );
  }

  return null;
}
