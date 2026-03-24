/**
 * キャストリスト API
 *
 * Google Apps Script で Web アプリとしてデプロイする。
 * - キャストリストシートからデータを読み取り
 * - 指定 Drive フォルダ内の画像をキャスト名で照合
 * - JSON で返却
 *
 * デプロイ手順:
 *   1. https://script.google.com/ で新規プロジェクトを作成
 *   2. このコードを貼り付け
 *   3. デプロイ → 新しいデプロイ → ウェブアプリ
 *      - 実行するユーザー: 自分
 *      - アクセスできるユーザー: 全員
 *   4. 生成された URL をアプリの config.ts にセット
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
    return { casts: [], rankLists: { gold: [], silver: [], bronze: [] } };
  }

  // ヘッダー解決（順不同対応）
  var headers = rows[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var nameIdx = findCol(headers, ["キャスト名", "name", "名前"]);
  var rankIdx = findCol(headers, ["ランク", "rank"]);
  var typeIdx = findCol(headers, ["専属 or フリー", "専属orフリー", "type", "タイプ"]);

  if (nameIdx === -1) {
    throw new Error("'キャスト名' カラムが見つかりません");
  }

  // ── Drive フォルダから画像一覧を取得 ──
  var imageMap = buildImageMap(IMAGE_FOLDER_ID);

  // ── キャストデータ構築 ──
  var casts = [];
  var rankLists = { gold: [], silver: [], bronze: [] };

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var name = String(row[nameIdx] || "").trim();
    if (!name) continue;

    var rank = rankIdx !== -1 ? String(row[rankIdx] || "").trim().toLowerCase() : "";
    var type = typeIdx !== -1 ? String(row[typeIdx] || "").trim() : "";

    // キャスト名で画像を検索（完全一致 → 前方一致）
    var imageFileId = imageMap[name] || findPartialMatch(imageMap, name) || "";

    var cast = {
      name: name,
      rank: rank || "",
      type: type || "",
    };
    if (imageFileId) {
      cast.imageFileId = imageFileId;
    }

    casts.push(cast);

    if (rank === "gold" || rank === "silver" || rank === "bronze") {
      rankLists[rank].push(name);
    }
  }

  return { casts: casts, rankLists: rankLists };
}

/**
 * Drive フォルダ内のファイルを { ファイル名(拡張子なし): fileId } のマップに変換
 */
function buildImageMap(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var map = {};

  while (files.hasNext()) {
    var file = files.next();
    var mimeType = file.getMimeType();
    // 画像ファイルのみ
    if (mimeType.indexOf("image/") !== 0) continue;

    var fileName = file.getName();
    // 拡張子を除去してキーにする
    var baseName = fileName.replace(/\.[^.]+$/, "").trim();
    map[baseName] = file.getId();
  }

  return map;
}

/**
 * 部分一致でマッチを試みる（スペースの有無や表記揺れ対策）
 */
function findPartialMatch(imageMap, castName) {
  // スペースを除去して比較
  var normalizedName = castName.replace(/[\s\u3000]/g, "");

  var keys = Object.keys(imageMap);
  for (var i = 0; i < keys.length; i++) {
    var normalizedKey = keys[i].replace(/[\s\u3000]/g, "");
    if (normalizedKey === normalizedName) {
      return imageMap[keys[i]];
    }
  }
  return null;
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
