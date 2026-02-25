/**
 * GAS — Google Driveフォルダ内のファイル一覧をシートに書き出す
 *
 * 使い方:
 * 1. 「_data」シートのA2セルにGoogle DriveフォルダのURLを入力
 * 2. この関数を実行すると、アクティブシートにファイル名（拡張子なし）とURLの一覧を書き出す
 */

function listFilesFromSheetUrl() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheetByName("_data");

  // 1. _dataシートが存在するかチェック
  if (!dataSheet) {
    Browser.msgBox("エラー: '_data' という名前のシートが見つかりません。");
    return;
  }

  // 2. A2セルのURLを取得
  var url = dataSheet.getRange("A2").getValue();
  if (!url) {
    Browser.msgBox("エラー: A2セルが空です。URLを入力してください。");
    return;
  }

  // 3. URLからフォルダIDを抽出 (正規表現)
  var folderIdMatch = url.match(/[-\w]{25,}/);
  if (!folderIdMatch) {
    Browser.msgBox("エラー: A2セルの内容からフォルダIDが見つかりませんでした。正しいURLか確認してください。");
    return;
  }
  var folderId = folderIdMatch[0];

  try {
    // 4. フォルダを参照
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();

    // 5. 書き出し先のシート（現在のシート）を準備
    var outputSheet = ss.getActiveSheet();
    outputSheet.clear(); // 内容をクリア
    outputSheet.appendRow(['名前', 'URL']); // ヘッダー

    var rows = [];
    while (files.hasNext()) {
      var file = files.next();
      var fileName = file.getName();
      // 拡張子を除去
      var nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      var fileUrl = file.getUrl();
      rows.push([nameWithoutExt, fileUrl]);
    }

    // 6. 結果をシートに書き込み
    if (rows.length > 0) {
      outputSheet.getRange(2, 1, rows.length, 2).setValues(rows);
      outputSheet.autoResizeColumns(1, 2);
      Browser.msgBox("完了！ " + rows.length + " 件のファイルを取得しました。");
    } else {
      Browser.msgBox("フォルダ内にファイルが見つかりませんでした。");
    }

  } catch (e) {
    Browser.msgBox("エラー: フォルダにアクセスできません。権限やURLを確認してください。\n" + e.toString());
  }
}
