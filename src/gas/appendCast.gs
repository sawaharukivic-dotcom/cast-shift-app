/**
 * GAS Webアプリ — 統合エンドポイント
 *
 * action で処理を分岐:
 *   "appendCast"   — スプレッドシートにキャストを追加
 *   "uploadImage"  — Google Driveに画像をアップロード（_data!C2 のフォルダ）
 *   "fetchImages"  — Google DriveファイルIDから画像をBase64で返す
 *   (未指定)       — 後方互換: appendCast として動作
 *
 * 設定手順:
 * 1. Googleスプレッドシート → 拡張機能 → Apps Script
 * 2. このコードを貼り付けて保存
 * 3. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 全員
 * 4. デプロイURLを src/config.ts の MASTER_SHEET_WRITE_URL / IMAGE_UPLOAD_GAS_URL に設定
 *    （同じURLでOK）
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "appendCast";

    switch (action) {
      case "appendCast":
        return _appendCast(data);
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

/** スプレッドシートにキャストを追加 */
function _appendCast(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1");
  data.casts.forEach(function(cast) {
    sheet.appendRow([cast.name, cast.color || "", cast.imageUrl || "", ""]);
  });
  return _jsonResponse({ success: true, added: data.casts.length });
}

/** Google Driveに画像をアップロード */
function _uploadImage(data) {
  var fileName = data.fileName;
  var imageBase64 = data.imageBase64;

  if (!fileName || !imageBase64) {
    return _jsonResponse({ success: false, error: "fileName と imageBase64 は必須です" });
  }

  // _data シートのC2からアップロード先フォルダURLを取得
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  var fileIds = data.fileIds; // ["fileId1", "fileId2", ...]
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
