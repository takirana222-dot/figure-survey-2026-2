# かたちのちょうさ - セットアップ手順

小学生向けの図形認識調査アプリです。三角形・四角形の問題を連続して実施し、回答をGoogleスプレッドシートに自動保存します。

---

## 必要なもの

- GitHubアカウント（お持ちのもの）
- Googleアカウント（スプレッドシート・GAS用）
- Vercelアカウント（無料、GitHubでログイン可）

---

## Step 1：Google Apps Script の設定（10〜15分）

### 1-1. スプレッドシートを作成

1. [Googleスプレッドシート](https://sheets.google.com) を開き、「空白のスプレッドシート」を作成
2. ファイル名を「図形認識調査データ」などに変更（任意）

### 1-2. Apps Script を設定

1. メニューの「**拡張機能**」→「**Apps Script**」を開く
2. 左のファイル一覧に「コード.gs」があるので、中身を全部削除
3. `gas_code.js` の中身をコピーして貼り付け
4. 💾 保存ボタン（または Ctrl+S）

### 1-3. デプロイ

1. 右上の「**デプロイ**」→「**新しいデプロイ**」
2. 左の「種類を選択」→ ⚙️ アイコン →「**ウェブアプリ**」を選択
3. 設定：
   - 説明：「図形調査v1」など（任意）
   - 次のユーザーとして実行：**「自分」**
   - アクセスできるユーザー：**「全員」**
4. 「デプロイ」ボタンをクリック
5. Googleアカウントへのアクセスを許可（求められたら）
6. 発行された「**ウェブアプリのURL**」をコピーして保存しておく

```
例：https://script.google.com/macros/s/AKfycbxXXXXXX/exec
```

---

## Step 2：このリポジトリをGitHubにpush

```bash
# GitHubに新しいリポジトリを作成してから：
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/figure-survey.git
git push -u origin main
```

---

## Step 3：Vercelにデプロイ（5分）

1. [vercel.com](https://vercel.com) にアクセスして「Sign Up」→「Continue with GitHub」
2. 「Add New Project」→ 先ほどpushしたリポジトリを選択
3. 「**Environment Variables**」を開いて以下を追加：
   - Name: `VITE_GAS_URL`
   - Value: Step 1-3でコピーしたGASのURL
4. 「**Deploy**」ボタンをクリック
5. 数分でデプロイ完了 → `https://figure-survey-xxxx.vercel.app` のようなURLが発行される

---

## Step 4：動作確認

1. 発行されたURLをブラウザで開く
2. 学年・学校種別を選んで回答してみる
3. Googleスプレッドシートを開いて「回答データ」シートに行が追加されていればOK

---

## 先生方への配布方法

発行されたVercelのURL（またはQRコード）を先生に送るだけです。

```
調査URL：https://figure-survey-xxxx.vercel.app
```

タブレット・スマホ・PCどれでも動きます。複数の学校・学年から同時にアクセスしても大丈夫です。

---

## データの見方（スプレッドシート）

| 列 | 内容 |
|---|---|
| タイムスタンプ | 回答日時 |
| 学年・学校種別・学校名 | イントロで入力した情報 |
| 三角形_選択 / 四角形_選択 | 選んだ図形（ア〜セ） |
| tri_ア〜tri_セ | 各図形を選んだか（1=選択、0=未選択） |
| 三角形_正答数 | 正答4つのうち何個選べたか |
| 三角形_見落し | 正答のうち何個選ばなかったか |
| 三角形_余分 | 誤った図形を何個余分に選んだか |
| 三角形_完全正答 | 完全正答なら1、それ以外は0 |

---

## ローカルで開発する場合

```bash
npm install
cp .env.example .env.local
# .env.local の VITE_GAS_URL にGASのURLを設定
npm run dev
```

GAS_URLを設定しない場合、送信処理はスキップされてコンソールにログが出るだけです（開発中に便利）。

---

## 注意事項

- **GASのURL（VITE_GAS_URL）はGitHubにpushしないでください**（.gitignoreで除外済み）
- VercelのEnvironment Variablesで設定してください
- GASの「ウェブアプリ」は「全員」アクセス可にしないと回答が届きません
