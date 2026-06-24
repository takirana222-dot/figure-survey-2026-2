/**
 * 図形認識調査 - Google Apps Script
 *
 * 使い方：
 * 1. Googleスプレッドシートを新規作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードを貼り付けて保存
 * 4. デプロイ > 新しいデプロイ > 種類「ウェブアプリ」
 *    - 次のユーザーとして実行：自分
 *    - アクセスできるユーザー：全員
 * 5. 発行されたURLを .env.local と Vercel環境変数に貼る
 */

// ─── 設定 ──────────────────────────────────────────
const SHEET_NAME = "回答データ";

// スプレッドシートのヘッダー列
const HEADERS = [
  "タイムスタンプ", "学年", "学校種別", "学校名",
  "三角形_選択", "四角形_選択",
  // 三角形 各図形フラグ
  "tri_ア","tri_イ","tri_ウ","tri_エ","tri_オ","tri_カ","tri_キ","tri_ク",
  "tri_ケ","tri_コ","tri_サ","tri_シ","tri_ス","tri_セ",
  // 四角形 各図形フラグ
  "quad_ア","quad_イ","quad_ウ","quad_エ","quad_オ","quad_カ","quad_キ","quad_ク",
  "quad_ケ","quad_コ","quad_サ","quad_シ","quad_ス","quad_セ",
  // 集計
  "三角形_正答数","三角形_見落し","三角形_余分","三角形_完全正答",
  "四角形_正答数","四角形_見落し","四角形_余分","四角形_完全正答",
];

const TRI_CORRECT  = ["ウ","ケ","コ","セ"];
const QUAD_CORRECT = ["イ","カ","ケ","シ"];
const TRI_IDS  = ["ア","イ","ウ","エ","オ","カ","キ","ク","ケ","コ","サ","シ","ス","セ"];
const QUAD_IDS = ["ア","イ","ウ","エ","オ","カ","キ","ク","ケ","コ","サ","シ","ス","セ"];

// ─── POST受信 ─────────────────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    writeRow(data);
    return ContentService
      .createTextOutput(JSON.stringify({ status:"ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status:"error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ─── GETで動作確認 ────────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status:"ok", message:"GAS is running" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── スプレッドシートへの書き込み ─────────────────
function writeRow(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);

  // シートがなければ作成してヘッダーを追加
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    // ヘッダー行を太字・背景色
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight("bold")
         .setBackground("#E8F0FE");
  }

  // 三角形の集計
  const triSel  = data.triSelected  ? data.triSelected.split(",").filter(Boolean)  : [];
  const quadSel = data.quadSelected ? data.quadSelected.split(",").filter(Boolean) : [];

  const triScore  = calcScore(triSel,  TRI_CORRECT);
  const quadScore = calcScore(quadSel, QUAD_CORRECT);

  // 行データを組み立て
  const row = [
    new Date(data.timestamp).toLocaleString("ja-JP"),
    data.grade       || "",
    data.schoolType  || "",
    data.schoolName  || "",
    triSel.join("・"),
    quadSel.join("・"),
    // 三角形フラグ
    ...TRI_IDS.map(id  => triSel.includes(id)  ? 1 : 0),
    // 四角形フラグ
    ...QUAD_IDS.map(id => quadSel.includes(id) ? 1 : 0),
    // 集計
    triScore.hits,  triScore.missed,  triScore.extra,  triScore.perfect  ? 1 : 0,
    quadScore.hits, quadScore.missed, quadScore.extra, quadScore.perfect ? 1 : 0,
  ];

  sheet.appendRow(row);
}

// ─── 正誤集計ヘルパー ─────────────────────────────
function calcScore(selected, correct) {
  const selSet     = new Set(selected);
  const correctSet = new Set(correct);
  const hits   = selected.filter(x => correctSet.has(x)).length;
  const extra  = selected.filter(x => !correctSet.has(x)).length;
  const missed = correct.filter(x => !selSet.has(x)).length;
  return { hits, extra, missed, perfect: hits === correct.length && extra === 0 };
}
