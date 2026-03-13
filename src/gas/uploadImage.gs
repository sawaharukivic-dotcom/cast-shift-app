/**
 * GAS Webアプリ — 画像をGoogle Driveにアップロードする
 *
 * アップロード先フォルダ:
 *   「_data」シートのC2セルに指定されたGoogle DriveフォルダURL
 *
 * 設定手順:
 * 1. Googleスプレッドシート → 拡張機能 → Apps Script
 * 2. このコードを貼り付けて保存
 * 3. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 全員
 * 4. デプロイURLを src/config.ts の IMAGE_UPLOAD_GAS_URL に設定
 *
 * リクエスト形式 (POST):
 *   { "fileName": "schedule_2026_03_13.png", "imageBase64": "iVBOR..." }
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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

    // Base64 → Blob → Drive に保存
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
  } catch (err) {
    return _jsonResponse({ success: false, error: err.toString() });
  }
}

function _jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
