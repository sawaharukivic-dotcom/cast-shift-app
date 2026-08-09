/**
 * キャストリスト API（v2 — ID照合＋取り違え防止チェック）
 *
 * Google Apps Script で Web アプリとしてデプロイする。
 * - キャストリストシートからデータを読み取り
 * - 指定 Drive フォルダ内の画像を「番号_キャスト名」形式のファイル名で照合
 * - 設定不備（同じ番号のファイル重複・ファイル名とシート名の不一致）を
 *   warnings として返し、アプリ側で警告表示できるようにする
 * - JSON で返却
 *
 * 【v2 の背景】
 * 別キャストの画像ファイルに誤った番号（他人のID）が付いていた場合、
 * 従来は黙ってそのファイルが照合され、別人のアイコンのままシフト画像を
 * 出力・公開してしまう事故が起きた（2026-08-09）。
 * v2 では番号の重複を検知し、キャスト名が一致する方のファイルを優先して
 * 選んだうえで、warnings として不備を報告する。
 *
 * デプロイ手順（既存URLを維持したまま更新する）:
 *   1. https://script.google.com/ で既存プロジェクトを開く
 *   2. このコードで置き換えて保存
 *   3. デプロイ → デプロイを管理 → 鉛筆アイコン（編集）→
 *      バージョン「新バージョン」→ デプロイ
 *      ※「新しいデプロイ」を選ぶとURLが変わってしまうので注意
 *        （NEXT_PUBLIC_GAS_CAST_API_URL と公開サイトの同期が壊れる）
 */

// ── 設定 ──
var SPREADSHEET_ID = "10G4th4r5bHqi8iSVgOGWTqYP1NfkxmRESecfHm9ZueU";
var SHEET_GID = 1636854384;
var IMAGE_FOLDER_ID = "1InZmx2LfxhcQydASertZ9Xq9dntGe5jg";

/**
 * GET リクエストハンドラ
 */
function doGet() {
  try {
    var data = buildCastList();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: e.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * シート読み取り + 画像照合
 */
function buildCastList() {
  // ── シートからキャストデータ読み取り ──
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getSheetByGid(ss, SHEET_GID);
  if (!sheet) {
    throw new Error("シートが見つかりません (gid=" + SHEET_GID + ")");
  }

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) {
    return {
      casts: [],
      rankLists: { gold: [], silver: [], bronze: [] },
      warnings: [],
    };
  }

  // ヘッダー解決（順不同対応）
  var headers = rows[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var nameIdx = findCol(headers, ["キャスト名", "name", "名前"]);
  var rankIdx = findCol(headers, ["ランク", "rank"]);
  var typeIdx = findCol(headers, ["専属 or フリー", "専属orフリー", "type", "タイプ"]);
  // キャストID列（CSVの通話キャストID/システムIDと同じ番号。画像ファイル名の先頭にも付ける）
  var idIdx = findCol(headers, ["id", "キャストid", "画像id"]);

  if (nameIdx === -1) {
    throw new Error("'キャスト名' カラムが見つかりません");
  }

  // ── シート行 → キャスト配列 ──
  var castRows = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var name = String(row[nameIdx] || "").trim();
    if (!name) continue;
    castRows.push({
      name: name,
      rank: rankIdx !== -1 ? String(row[rankIdx] || "").trim().toLowerCase() : "",
      type: typeIdx !== -1 ? String(row[typeIdx] || "").trim() : "",
      // セルが数値のこともあるので必ず文字列化（例: 539）
      id: idIdx !== -1 ? normalizeDigits(String(row[idIdx] || "").trim()) : "",
    });
  }

  // ── Drive フォルダから画像ファイル一覧を取得 ──
  var fileEntries = buildImageEntries(IMAGE_FOLDER_ID);

  // ── 照合（純粋関数。テスト可能にするため分離） ──
  var matched = matchIconsToCasts(castRows, fileEntries);

  // ── レスポンス構築 ──
  var casts = [];
  var rankLists = { gold: [], silver: [], bronze: [] };

  for (var j = 0; j < castRows.length; j++) {
    var c = castRows[j];
    var cast = {
      name: c.name,
      rank: c.rank || "",
      type: c.type || "",
    };
    if (c.id) {
      cast.id = c.id;
    }
    var fileId = matched.assignments[c.name];
    if (fileId) {
      cast.imageFileId = fileId;
    }
    casts.push(cast);

    if (c.rank === "gold" || c.rank === "silver" || c.rank === "bronze") {
      rankLists[c.rank].push(c.name);
    }
  }

  return { casts: casts, rankLists: rankLists, warnings: matched.warnings };
}

/**
 * Drive フォルダ内の画像ファイルを
 * { fileId, baseName（拡張子なし）, idPart（先頭の番号）, namePart（番号を除いた名前部分） }
 * の配列に変換する
 */
function buildImageEntries(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var entries = [];

  while (files.hasNext()) {
    var file = files.next();
    var mimeType = file.getMimeType();
    // 画像ファイルのみ
    if (mimeType.indexOf("image/") !== 0) continue;

    var baseName = file.getName().replace(/\.[^.]+$/, "").trim();
    entries.push(parseFileEntry(baseName, file.getId()));
  }

  return entries;
}

/**
 * ファイル名（拡張子なし）を「番号_キャスト名」に分解する。
 * 番号が付いていない旧形式のファイルは idPart = "" として名前照合のみに使う。
 */
function parseFileEntry(baseName, fileId) {
  // 全角数字・全角アンダースコアにも対応
  var m = baseName.match(/^([0-9０-９]+)[_＿]\s*(.*)$/);
  if (m) {
    return {
      fileId: fileId,
      baseName: baseName,
      idPart: normalizeDigits(m[1]),
      namePart: m[2].trim(),
    };
  }
  return { fileId: fileId, baseName: baseName, idPart: "", namePart: baseName };
}

/**
 * キャストと画像ファイルを照合する（純粋関数）。
 *
 * 照合ルール:
 *   1. キャストのIDと同じ番号のファイルがあればそれを使う（改名しても番号で追える）
 *      - 同じ番号のファイルが複数ある場合: キャスト名が一致するファイルを優先。
 *        一致するものが1つに絞れなければアイコンを設定せず、warnings で報告
 *        （間違ったファイルを黙って使うより、グレー四角＋警告の方が安全）
 *      - 番号は一致するがファイル名の名前部分がシートのキャスト名と違う場合:
 *        そのファイルを使いつつ warnings で報告（改名直後の移行状態を止めないため）
 *   2. 番号で見つからなければ名前で照合（完全一致 → 空白除去一致。旧形式ファイル対応）
 *
 * @return { assignments: {キャスト名: fileId}, warnings: string[] }
 */
function matchIconsToCasts(castRows, fileEntries) {
  var assignments = {};
  var warnings = [];

  // 番号 → ファイル一覧のマップ
  var byId = {};
  // 名前（正規化済み） → ファイルのマップ（旧形式含む。名前部分を優先し、フルネームでも引ける）
  var byName = {};
  for (var i = 0; i < fileEntries.length; i++) {
    var e = fileEntries[i];
    if (e.idPart) {
      if (!byId[e.idPart]) byId[e.idPart] = [];
      byId[e.idPart].push(e);
    }
    var nameKey = normalizeName(e.namePart);
    if (nameKey && !byName[nameKey]) byName[nameKey] = e;
    var baseKey = normalizeName(e.baseName);
    if (baseKey && !byName[baseKey]) byName[baseKey] = e;
  }

  for (var j = 0; j < castRows.length; j++) {
    var cast = castRows[j];
    var castNameKey = normalizeName(cast.name);
    var chosen = null;

    var candidates = cast.id ? byId[cast.id] || [] : [];
    if (candidates.length > 1) {
      // 同じ番号のファイルが複数 → 名前が一致するものだけに絞る
      var nameMatched = [];
      for (var k = 0; k < candidates.length; k++) {
        if (normalizeName(candidates[k].namePart) === castNameKey) {
          nameMatched.push(candidates[k]);
        }
      }
      var fileNames = candidates
        .map(function (c) { return c.baseName; })
        .join(" / ");
      if (nameMatched.length === 1) {
        chosen = nameMatched[0];
        warnings.push(
          "同じ番号のファイルが複数あります（" + fileNames + "）。" +
            "キャスト名が一致する「" + chosen.baseName + "」を使用しました。" +
            "不要なファイルの番号を修正するか削除してください"
        );
      } else {
        warnings.push(
          "同じ番号のファイルが複数あり、どれが「" + cast.name + "」の画像か" +
            "判別できません（" + fileNames + "）。アイコンを設定しませんでした。" +
            "ファイル名の番号を修正してください"
        );
      }
    } else if (candidates.length === 1) {
      chosen = candidates[0];
      if (castNameKey && normalizeName(chosen.namePart) !== castNameKey) {
        // 番号は一致するが名前が違う → 別人の画像に誤った番号が付いている可能性
        warnings.push(
          "番号" + cast.id + "のファイル名がシートのキャスト名と一致しません" +
            "（ファイル: " + chosen.baseName + " ⇔ シート: " + cast.name + "）。" +
            "別のキャストの画像に誤った番号が付いていないか確認してください"
        );
      }
    }

    // 番号で見つからなければ名前で照合（旧形式・番号未設定ファイル対応）
    if (!chosen && castNameKey && byName[castNameKey]) {
      chosen = byName[castNameKey];
    }

    if (chosen) {
      assignments[cast.name] = chosen.fileId;
    }
  }

  return { assignments: assignments, warnings: warnings };
}

/** 名前照合用の正規化: Unicode正規化 + 空白（全角含む）除去 */
function normalizeName(name) {
  var s = String(name || "");
  try {
    s = s.normalize("NFC");
  } catch (e) {
    // normalize 未対応環境ではそのまま
  }
  return s.replace(/[\s　]/g, "");
}

/** 全角数字を半角に揃える（シートのID・ファイル名の番号の表記ゆれ対策） */
function normalizeDigits(s) {
  return String(s || "").replace(/[０-９]/g, function (ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

// ── POST リクエストハンドラ（画像アップロード） ──

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "";

    switch (action) {
      case "uploadImage":
        return _uploadImage(data);
      case "fetchImages":
        return _fetchImages(data);
      default:
        return _jsonResponse({ success: false, error: "不明な action: " + action });
    }
  } catch (err) {
    return _jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Google Driveの指定フォルダに画像をアップロード
 * _data シートの C2 にアップロード先フォルダURLを設定しておく
 */
function _uploadImage(data) {
  var fileName = data.fileName;
  var imageBase64 = data.imageBase64;

  if (!fileName || !imageBase64) {
    return _jsonResponse({ success: false, error: "fileName と imageBase64 は必須です" });
  }

  // _data シートのC2からアップロード先フォルダURLを取得
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var dataSheet = ss.getSheetByName("_data");
  if (!dataSheet) {
    return _jsonResponse({ success: false, error: "'_data' シートが見つかりません" });
  }

  var folderUrl = dataSheet.getRange("C2").getValue();
  if (!folderUrl) {
    return _jsonResponse({ success: false, error: "_data!C2 にアップロード先フォルダURLが設定されていません" });
  }

  var folderIdMatch = String(folderUrl).match(/[-\w]{25,}/);
  if (!folderIdMatch) {
    return _jsonResponse({ success: false, error: "フォルダURLからIDを抽出できません" });
  }

  var folder = DriveApp.getFolderById(folderIdMatch[0]);

  var blob = Utilities.newBlob(
    Utilities.base64Decode(imageBase64),
    "image/png",
    fileName
  );
  var file = folder.createFile(blob);

  return _jsonResponse({
    success: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
  });
}

/** Google DriveファイルIDから画像をBase64で取得して返す */
function _fetchImages(data) {
  var fileIds = data.fileIds;
  if (!fileIds || !fileIds.length) {
    return _jsonResponse({ success: false, error: "fileIds が空です" });
  }

  var images = {};
  var errors = [];

  for (var i = 0; i < fileIds.length; i++) {
    try {
      var file = DriveApp.getFileById(fileIds[i]);
      var blob = file.getBlob();
      var base64 = Utilities.base64Encode(blob.getBytes());
      var mimeType = blob.getContentType();
      images[fileIds[i]] = "data:" + mimeType + ";base64," + base64;
    } catch (e) {
      errors.push(fileIds[i]);
    }
  }

  return _jsonResponse({
    success: true,
    images: images,
    errors: errors,
  });
}

function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── ヘルパー ──

function findCol(headers, candidates) {
  for (var i = 0; i < headers.length; i++) {
    for (var j = 0; j < candidates.length; j++) {
      if (headers[i] === candidates[j].toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}

function getSheetByGid(ss, gid) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) {
      return sheets[i];
    }
  }
  return null;
}

// ── Drive画像リネーム機能 ──
//
// 使い方:
//   1. スプレッドシートを開き直す（onOpen で「画像管理」メニューが追加される）
//   2. メニュー「画像管理 → Drive画像をIDでリネーム」を実行
//   3. 計画表ダイアログが出る → OKで実行、キャンセルで中止
//
//   ※ メニューが出ない場合は、GASエディタから onOpen() を1回手動実行する。

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("画像管理")
    .addItem("Drive画像をIDでリネーム", "showRenameImagesByIdDialog")
    .addToUi();
}

function showRenameImagesByIdDialog() {
  var ui = SpreadsheetApp.getUi();

  var planResult;
  try {
    planResult = _buildRenamePlan();
  } catch (err) {
    ui.alert("エラー", String(err && err.message ? err.message : err), ui.ButtonSet.OK);
    return;
  }

  var msg = _formatPlanMessage(planResult);

  if (planResult.plan.length === 0) {
    ui.alert("リネーム対象なし", msg, ui.ButtonSet.OK);
    return;
  }

  var btn = ui.alert("画像リネーム計画表", msg + "\n\n上記の内容で実行しますか？", ui.ButtonSet.OK_CANCEL);
  if (btn !== ui.Button.OK) {
    return;
  }

  var execResult = _executeRenamePlan(planResult.plan);
  var resultMsg = "成功: " + execResult.ok + " 件\n失敗: " + execResult.fail + " 件";
  if (execResult.failLog.length) {
    resultMsg += "\n\n失敗内訳:\n" + execResult.failLog.join("\n");
  }
  ui.alert("リネーム完了", resultMsg, ui.ButtonSet.OK);
}

/**
 * リネーム計画を構築する。
 * @return {{ plan: Array, skipped: Array<string>, conflicts: Array<string> }}
 */
function _buildRenamePlan() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getSheetByGid(ss, SHEET_GID);
  if (!sheet) {
    throw new Error("シートが見つかりません (gid=" + SHEET_GID + ")");
  }

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) {
    return { plan: [], skipped: ["シートにデータがありません"], conflicts: [] };
  }

  var headers = rows[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var nameIdx = findCol(headers, ["キャスト名", "name", "名前"]);
  var idIdx = findCol(headers, ["id", "キャストid", "画像id"]);

  if (nameIdx === -1) {
    throw new Error("'キャスト名' カラムが見つかりません");
  }
  if (idIdx === -1) {
    throw new Error("'ID' カラムが見つかりません");
  }

  // シートから対象エントリ収集
  var entries = []; // { name, id, rowNum }
  var idToCount = {}; // 同名検出用: name → ID件数
  for (var i = 1; i < rows.length; i++) {
    var name = String(rows[i][nameIdx] || "").trim();
    var id = String(rows[i][idIdx] || "").trim();
    if (!name) continue;
    if (!id) continue;
    entries.push({ name: name, id: id, rowNum: i + 1 });
    idToCount[name] = (idToCount[name] || 0) + 1;
  }

  // Drive内画像を baseName でグルーピング
  var folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  var files = folder.getFiles();
  var byBaseName = {}; // baseName → [{ file, ext, fileName }]
  var byNormalizedName = {}; // 空白除去版 → [...]
  while (files.hasNext()) {
    var f = files.next();
    if (f.getMimeType().indexOf("image/") !== 0) continue;
    var fn = f.getName();
    var extMatch = fn.match(/\.[^.]+$/);
    var ext = extMatch ? extMatch[0] : "";
    var base = (extMatch ? fn.slice(0, -ext.length) : fn).trim();
    var entry = { file: f, ext: ext, fileName: fn, baseName: base };

    if (!byBaseName[base]) byBaseName[base] = [];
    byBaseName[base].push(entry);

    var norm = base.replace(/[\s　]/g, "");
    if (!byNormalizedName[norm]) byNormalizedName[norm] = [];
    byNormalizedName[norm].push(entry);
  }

  var plan = [];
  var skipped = [];
  var conflicts = [];

  for (var j = 0; j < entries.length; j++) {
    var e = entries[j];
    var targetBase = e.id + "_" + e.name;

    // 既にリネーム済みかチェック
    if (byBaseName[targetBase]) {
      skipped.push("row " + e.rowNum + " [" + e.name + " / id=" + e.id + "]: 既に " + targetBase + " が存在");
      continue;
    }

    // 旧形式 "キャスト名.ext" を探す（完全一致 → 空白無視一致）
    var candidates = byBaseName[e.name];
    if (!candidates || candidates.length === 0) {
      var normName = e.name.replace(/[\s　]/g, "");
      candidates = byNormalizedName[normName] || [];
    }

    if (!candidates || candidates.length === 0) {
      skipped.push("row " + e.rowNum + " [" + e.name + " / id=" + e.id + "]: Drive上に対応ファイルなし");
      continue;
    }

    // 同名キャストが複数いる場合は、どのファイルがどのIDか自動判定不能
    if (idToCount[e.name] > 1) {
      conflicts.push("row " + e.rowNum + " [" + e.name + " / id=" + e.id + "]: 同名キャスト " + idToCount[e.name] + "件あり / Drive側候補 " + candidates.length + "件 → 手動でリネームしてください");
      continue;
    }

    if (candidates.length > 1) {
      var fileList = candidates.map(function (c) { return c.fileName; }).join(", ");
      conflicts.push("row " + e.rowNum + " [" + e.name + " / id=" + e.id + "]: Driveに候補が複数 (" + fileList + ") → 手動確認");
      continue;
    }

    var src = candidates[0];
    plan.push({
      from: src.fileName,
      to: targetBase + src.ext,
      file: src.file,
      rowNum: e.rowNum,
    });
  }

  return { plan: plan, skipped: skipped, conflicts: conflicts };
}

function _formatPlanMessage(result) {
  var lines = [];
  lines.push("リネーム予定: " + result.plan.length + " 件");
  var showPlanCount = Math.min(result.plan.length, 30);
  for (var i = 0; i < showPlanCount; i++) {
    lines.push("  " + (i + 1) + ". " + result.plan[i].from + " → " + result.plan[i].to);
  }
  if (result.plan.length > showPlanCount) {
    lines.push("  ... ほか " + (result.plan.length - showPlanCount) + " 件");
  }

  if (result.skipped.length) {
    lines.push("");
    lines.push("スキップ: " + result.skipped.length + " 件");
    var showSkipCount = Math.min(result.skipped.length, 10);
    for (var j = 0; j < showSkipCount; j++) {
      lines.push("  ・" + result.skipped[j]);
    }
    if (result.skipped.length > showSkipCount) {
      lines.push("  ... ほか " + (result.skipped.length - showSkipCount) + " 件");
    }
  }

  if (result.conflicts.length) {
    lines.push("");
    lines.push("⚠ 競合 (手動対応要): " + result.conflicts.length + " 件");
    for (var k = 0; k < result.conflicts.length; k++) {
      lines.push("  ・" + result.conflicts[k]);
    }
  }

  return lines.join("\n");
}

function _executeRenamePlan(plan) {
  var ok = 0, fail = 0;
  var failLog = [];
  for (var i = 0; i < plan.length; i++) {
    try {
      plan[i].file.setName(plan[i].to);
      ok++;
    } catch (err) {
      fail++;
      failLog.push(plan[i].from + " → " + plan[i].to + " : " + err);
    }
  }
  return { ok: ok, fail: fail, failLog: failLog };
}
