/**
 * GAS Webアプリ — スプレッドシートにキャストを追加する
 *
 * 設定手順:
 * 1. Googleスプレッドシート → 拡張機能 → Apps Script
 * 2. このコードを貼り付けて保存
 * 3. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 全員
 * 4. デプロイURLを src/config.ts の MASTER_SHEET_WRITE_URL に設定
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("シート1");
  var data = JSON.parse(e.postData.contents);
  data.casts.forEach(function(cast) {
    sheet.appendRow([cast.name, cast.color || "", cast.imageUrl || "", ""]);
  });
  return ContentService.createTextOutput(
    JSON.stringify({ success: true, added: data.casts.length })
  ).setMimeType(ContentService.MimeType.JSON);
}
