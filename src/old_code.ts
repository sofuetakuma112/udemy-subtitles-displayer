// グローバル変数
let div = document.createElement("div"); // すべての要素はここに入る
let button1 = document.createElement("button"); // このレクチャーの字幕をダウンロードする（1つの.vttファイル）
let button2 = document.createElement("button"); // コース全体の字幕をダウンロードする（複数の.vttファイル）
let title_element: Node | any = null; // ページ左上のタイトル表示

// UI要素のページへの配置
async function inject_our_script() {
  // https://greasyfork.org/en/scripts/422576-udemy-subtitle-downloader-v3/discussions/110421
  // title_element = document.querySelector(
  //   'a[data-purpose="course-header-title"]'
  // );
  while (!title_element) {
    title_element = document.querySelector(
      '[data-purpose="course-header-title"]'
    );
    await sleep(1000);
  }

  let button1_css = `
    font-size: 14px;
    padding: 1px 12px;
    border-radius: 4px;
    border: none;
    color: black;
  `;

  let button2_css = `
    font-size: 14px;
    padding: 1px 12px;
    border-radius: 4px;
    border: none;
    color: black;
    margin-left: 8px;
  `;

  let div_css = `
    margin-bottom: 10px;
    display: flex;
  `;

  button1.setAttribute("style", button1_css);
  button1.textContent = "このレクチャーの字幕をダウンロードする";
  button1.addEventListener("click", download_lecture_subtitle);

  button2.setAttribute("style", button2_css);
  let num = await get_course_lecture_number();
  button2.textContent = `全コースの字幕をダウンロードする(${num}ドキュメント)`;
  button2.addEventListener("click", download_course_subtitle);

  div.setAttribute("style", div_css);
  div.appendChild(button1);
  div.appendChild(button2);

  insertAfter(div, title_element);
}

// このレクチャーの字幕をダウンロードする
// 移動
async function download_lecture_subtitle() {
  await parse_lecture_data();
}

// 現在のレクチャーの字幕をダウンロードする
// how to call: await parse_lecture_data();
// ダウンロードし、.vtt字幕を取得します。
async function parse_lecture_data(
  course_id: string = "",
  lecture_id: string = ""
) {
  // 引数を渡さなかった（空文字の）場合は、現在のレクチャーとして扱われます
  const data = await get_lecture_data(course_id, lecture_id); // 現在のレクチャーのデータを取得する
  const lecture_id_from_fetched_data = data.id; // 取得したレクチャーデータから、このレクチャーのidを取得する
  const lecture_title = await get_lecture_title_by_id(
    lecture_id_from_fetched_data
  ); // レクチャーidでレクチャータイトルを検索する

  // 複数の言語の字幕データが入ってくるので、data.asset.captions.lengthが1以上になることもある
  const captions_en = data.asset.captions.find(
    (caption: any) => caption.video_label.indexOf("英語") !== -1
  );
  if (!lecture_title) throw Error("lecture_title is null");
  if (!captions_en) return; // 文字のみのレクチャー or 英語字幕がないレクチャーはここで返す
  let filename = `${safe_filename(lecture_title)}.vtt`; // ファイル名の構成
  save_vtt(captions_en.url, filename); // 直接保存
}

// コースのすべての字幕をダウンロードする
// 移動
async function download_course_subtitle() {
  let course_id = get_args_course_id(); // URLからコースIDを取得
  let data = await get_course_data(); // URLから取得したコースIDとCookieから取得した認証情報を元にコース全体のデータを取得する
  let array = data.results; // レクチャー配列
  for (let i = 0; i < array.length; i++) {
    const result = array[i];
    if (result._class == "lecture") {
      let lecture_id = result.id;
      await parse_lecture_data(course_id, lecture_id);
      await sleep(2000);
    }
  }
}

// あるノードの後に新しいノードを挿入する
// 移動
function insertAfter(newNode: any, referenceNode: Node | null) {
  if (!referenceNode) throw Error("referenceNode is null");
  if (!referenceNode.parentNode)
    throw Error("referenceNode.parentNode is null");
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

// 安全なファイル名への変換
// 移動
function safe_filename(string: string) {
  let s = string;
  s = s.replace(":", "-");
  s = s.replace("'", " ");
  return s;
}

// vttを保存
// パラメータ：urlはvttファイルのURL、urlにアクセスするとファイルの内容が表示されるはずです。
// filenameは保存するファイルの名前です
// 移動
function save_vtt(url: string, filename: string) {
  fetch(url, {})
    .then((response) => response.text())
    .then((data) => {
      downloadString(data, "text/plain", filename);
    })
    .catch((e) => {
      console.log(e);
    });
}

// copy from: https://gist.github.com/danallison/3ec9d5314788b337b682
// Example downloadString(srt, "text/plain", filename);
// 移動
function downloadString(
  text: string | Blob,
  fileType: string, // application/x-mpegURL
  fileName: string
) {
  // Blobとは、BLOB（Binary Large Object）を扱うためJavaScriptのオブジェクトです。
  // BlobによってJSでバイナリデータを扱うことが出来る
  // new Blob(【ファイルの内容の配列】,【ファイルの種類（MIMEタイプ）】);
  let blob = new Blob([text], {
    type: fileType,
  });
  let a = document.createElement("a");
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(":");
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
  }, 11500);
}

// ビデオの数を整数で返します。
// 移動
async function get_course_lecture_number() {
  // get_course_data: コース全体のデータを取得する
  let data = await get_course_data();
  let array = data.results;
  let num = 0;
  for (let i = 0; i < array.length; i++) {
    const r = array[i];
    if (r._class == "lecture") {
      num += 1;
    }
  }
  return num;
}
