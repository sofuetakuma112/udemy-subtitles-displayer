import axios from "axios";
import { db } from "./firebase";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";

const timeToNumber = (time: string) => {
  const minute = time.split(":")[0];
  const second = time.split(":")[1].split(".")[0];
  const millisecond = time.split(":")[1].split(".")[1];
  return {
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(millisecond),
    time_number:
      Number(minute) * 60 + Number(second) + 0.001 * Number(millisecond),
    time_string: time,
  };
};

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// グローバル変数
let div = document.createElement("div"); // すべての要素はここに入る
let button1 = document.createElement("button"); // このレクチャーの字幕をダウンロードする（1つの.vttファイル）
let button2 = document.createElement("button"); // コース全体の字幕をダウンロードする（複数の.vttファイル）
let button3 = document.createElement("button"); // このビデオレクチャーをダウンロードする
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

  button3.setAttribute("style", button2_css);
  button3.textContent = "このビデオレクチャーをダウンロードする";
  button3.addEventListener("click", download_lecture_video);

  div.setAttribute("style", div_css);
  div.appendChild(button1);
  div.appendChild(button2);
  div.appendChild(button3);

  insertAfter(div, title_element);
}

// このレクチャーの字幕をダウンロードする
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

// このビデオレクチャーをダウンロードする
async function download_lecture_video() {
  button3.textContent = "このビデオをダウンロードする（ダウンロード開始）";
  let data = await get_lecture_data(); // 現在のレクチャーのデータを取得する
  let lecture_id = data.id; // このレクチャーのidを取得する
  let lecture_title = await get_lecture_title_by_id(lecture_id); // idでタイトルを検索する

  let r = data.asset.media_sources[0];
  // let example = {
  //   "type": "video/mp4",
  //   "src": "https://mp4-a.udemycdn.com/2020-12-04_12-48-10-150cfde997c5ba9f05e5e7d86c813db3/1/WebHD_720p.mp4?lKL6M-V-HXBl9MVKyHqfbP9nVBBFDd6lLLXl7USDCVB63OhpUk722Vt6EW1NlopbdZmF9J_9YZCTOhMrhxj26O1uGmgUqUL4F8e79BxKUeKCnxjTKPo3vA6eRzNAINw4k174S8MaD7ND9b37F_TOs4mxC9BLcUyPTxrSMhDLbjQuWl_P",
  //   "label": "720"
  // }

  let url = r.src; // "https://mp4-a.udemycdn.com/2020-12-04_12-48-10-150cfde997c5ba9f05e5e7d86c813db3/1/WebHD_720p.mp4?XquxJGAXiyTc17qxb6iyah_9GXvjHC43UK98UHC3LUkZk7q9yPPll-BJ-5RKz--T9ucjtKOES68m_rZ6vzDZkyEROWwuaoHGFsr3DDuN0AWwk3RpjEo-JNfp98iIaEd_0Vfk0te375rNGtvtCnXibgcZmxDOx4tI5jqFKkl5hVDnwVE7"
  let resolution = r.label; // 720 or 1080
  let filename = `${safe_filename(lecture_title ?? "")}_${resolution}p.mp4`; // 构造文件名
  let type = r.type;

  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      downloadString(blob, type, filename);
      button3.textContent =
        "この動画レクチャーをダウンロードする（ダウンロード完了）";
    });
}

// あるノードの後に新しいノードを挿入する
function insertAfter(newNode: any, referenceNode: Node | null) {
  if (!referenceNode) throw Error("referenceNode is null");
  if (!referenceNode.parentNode)
    throw Error("referenceNode.parentNode is null");
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

// レクチャーのデータを取得する
function get_lecture_data(
  course_id: string = "",
  lecture_id: string = ""
): any {
  return new Promise((resolve, reject) => {
    let access_token = getCookie("access_token");
    let bearer_token = `Bearer ${access_token}`;
    // 引数を渡さなかった（空文字の）場合は、現在のレクチャーとして扱われます
    fetch(get_lecture_data_url(course_id, lecture_id), {
      headers: {
        "x-udemy-authorization": bearer_token,
        authorization: bearer_token,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        resolve(data);
      })
      .catch((e) => {
        reject(e);
      });
  });
}

// 指定された名前のCookieの値を返します。
// https://stackoverflow.com/questions/5639346/what-is-the-shortest-function-for-reading-a-cookie-by-name-in-javascript
function getCookie(name: string) {
  return (document.cookie.match(
    "(?:^|;)\\s*" + name.trim() + "\\s*=\\s*([^;]*?)\\s*(?:;|$)"
  ) || [])[1];
}

// 個別レクチャーのデータURL
// パラメータを渡すかどうかは自由ですが、
// 引数を渡さなかった場合は、現在のレクチャーとして扱われます
function get_lecture_data_url(
  param_course_id: string = "",
  param_lecture_id: string = ""
) {
  // let course_id = '3681012'
  // let lecture_id = '23665120'
  // let example_url = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/3681012/lectures/23665120/?fields[lecture]=asset,description,download_url,is_free,last_watched_second&fields[asset]=asset_type,length,media_license_token,media_sources,captions,thumbnail_sprite,slides,slide_urls,download_urls`
  let course_id = param_course_id || get_args_course_id(); // HTMLから現在表示しているコースのcourseIdを取得
  let lecture_id = param_lecture_id || get_args_lecture_id(); // URLからlectureIdを取得
  let url = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${course_id}/lectures/${lecture_id}/?fields[lecture]=asset,description,download_url,is_free,last_watched_second&fields[asset]=asset_type,length,media_license_token,media_sources,captions,thumbnail_sprite,slides,slide_urls,download_urls`;
  return url;
}

// https://greasyfork.org/en/scripts/422576-udemy-subtitle-downloader-v3/discussions/110421
// このレクチャーのidを取得する
// function get_args_lecture_id() {
//   let json = get_args();
//   return json.initialCurriculumItemId;
// }
function get_args_lecture_id() {
  const result = /(?<=lecture\/)\d*/.exec(document.URL);
  if (!result) return;
  return result[0];
  // 以下の（？）方法では、
  // lecture_id は常にページを開いたときと同じレクチャーになり、
  // 他のサブレクチャーに切り替えても変更されません。
  // let json = get_args()
  // return json.initialCurriculumItemId
}

// コースIDを取得する
function get_args_course_id() {
  let json = get_args();
  return json.courseId;
}

// パラメータの取得
// HTMLのDOMのdata-module-args属性のJSONを返す
function get_args() {
  let ud_app_loader = document.querySelector(".ud-app-loader");
  if (!ud_app_loader || !(ud_app_loader as any).dataset)
    throw Error("ud_app_loader or ud_app_loader.dataset is null");
  let args = (ud_app_loader as any).dataset.moduleArgs;
  let json = JSON.parse(args);
  return json;
}

// idを入力
// そのセッションのタイトルに戻る
// await get_lecture_title_by_id(id)
async function get_lecture_title_by_id(id: string) {
  let data = await get_course_data();
  let lectures = data.results; // コース配下のレクチャー配列
  const foundLecture = lectures.find(
    (lecture: any) => lecture._class === "lecture" && lecture.id === id
  );
  if (foundLecture) {
    return `${foundLecture.object_index}. ${foundLecture.title}`;
  } else {
    throw Error("lectureIdが一致するレクチャーがコース内になかった");
  }
  // for (let i = 0; i < lectures.length; i++) {
  //   const lecture = lectures[i];
  //   if (lecture._class == "lecture" && lecture.id == id) {
  //     let name = `${lecture.object_index}. ${lecture.title}`;
  //     return name;
  //   }
  // }
}

// コース全体のデータを取得する
// OK
function get_course_data(): any {
  return new Promise((resolve, reject) => {
    // Udemyでログイン済みのブラウザで実行していることが条件
    let access_token = getCookie("access_token");
    let bearer_token = `Bearer ${access_token}`;
    // get_course_data_url: Udemy apiからコース全体のデータURLを取得する
    fetch(get_course_data_url(), {
      headers: {
        "x-udemy-authorization": bearer_token,
        authorization: bearer_token,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        resolve(data);
      })
      .catch((e) => {
        reject(e);
      });
  });
}

// コース全体のデータ URL
function get_course_data_url() {
  let course_id = get_args_course_id();
  // let example_url = "https://www.udemy.com/api-2.0/courses/3681012/subscriber-curriculum-items/?page_size=1400&fields[lecture]=title,object_index,is_published,sort_order,created,asset,supplementary_assets,is_free&fields[quiz]=title,object_index,is_published,sort_order,type&fields[practice]=title,object_index,is_published,sort_order&fields[chapter]=title,object_index,is_published,sort_order&fields[asset]=title,filename,asset_type,status,time_estimation,is_external&caching_intent=True"
  let url = `https://www.udemy.com/api-2.0/courses/${course_id}/subscriber-curriculum-items/?page_size=1400&fields[lecture]=title,object_index,is_published,sort_order,created,asset,supplementary_assets,is_free&fields[quiz]=title,object_index,is_published,sort_order,type&fields[practice]=title,object_index,is_published,sort_order&fields[chapter]=title,object_index,is_published,sort_order&fields[asset]=title,filename,asset_type,status,time_estimation,is_external&caching_intent=True`;
  return url;
}

// 安全なファイル名への変換
function safe_filename(string: string) {
  let s = string;
  s = s.replace(":", "-");
  s = s.replace("'", " ");
  return s;
}

// vttを保存
// パラメータ：urlはvttファイルのURL、urlにアクセスするとファイルの内容が表示されるはずです。
// filenameは保存するファイルの名前です
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
function downloadString(
  text: string | Blob,
  fileType: string,
  fileName: string
) {
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

inject_our_script();

const translate_current_lecture = async () => {
  // chrome.devtools.network等から字幕データのURLを取得する
  let dom = null;
  while (!dom) {
    // コースIDを取得するために必要なDOM（get_args関数内で使用するDOM）が描画されるまで待機
    dom = document.querySelector(".ud-app-loader");
    await sleep(250);
  }
  const data = await get_lecture_data(); // 現在のレクチャーのデータを取得する（引数を渡さなかった（空文字の）場合は、現在のレクチャーを取得）
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
  const subtitleUrl = captions_en.url;

  // 字幕データのURLから字幕データを取得する
  const response = await fetch(subtitleUrl, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
      "referrer-policy": "strict-origin-when-cross-origin",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
    },
    referrer: "https://www.udemy.com/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
    mode: "cors",
    credentials: "omit",
  });
  const reader = response.body?.getReader();
  let subtitle = "";
  while (true) {
    if (!reader) continue;
    const result = await reader.read();
    if (result.done) {
      break;
    } else {
      const decoder = new TextDecoder();
      subtitle += decoder.decode(result.value);
    }
  }

  // console.log(subtitle)

  const subtitleSplitByLine = subtitle.split("\n").filter((line) => line);
  const subtitleSplitByLineAndRemovedEmptyChar = subtitleSplitByLine.slice(
    1,
    subtitleSplitByLine.length
  );

  type Subtitle = {
    from: string;
    to: string;
    subtitle: string;
  };

  const subtitles_array: Subtitle[] = [];
  for (let i = 0; i < subtitleSplitByLineAndRemovedEmptyChar.length / 2; i++) {
    const timeAndSubtitle = subtitleSplitByLineAndRemovedEmptyChar.slice(
      i * 2,
      i * 2 + 2
    );
    const time = timeAndSubtitle[0];
    const subtitle = timeAndSubtitle[1];
    const fromTo = time.split(" --> ");
    const from = fromTo[0];
    const to = fromTo[1];
    subtitles_array.push({
      // from: timeToNumber(from),
      // to: timeToNumber(to),
      from,
      to,
      subtitle,
    });
  }

  let sentence_array: Subtitle[] = [];
  const sentences_array: Subtitle[][] = [];
  subtitles_array.forEach((subtitle_array) => {
    const endChar = subtitle_array.subtitle[subtitle_array.subtitle.length - 1];
    if (endChar === "." || endChar === "?") {
      // 文末がピリオド or ?
      sentence_array.push(subtitle_array);
      sentences_array.push(sentence_array);
      sentence_array = [];
    } else {
      // 文の途中
      sentence_array.push(subtitle_array);
    }
  });

  type Sentence = {
    from: string;
    to: string;
    sentence: string;
  };

  const arrayPerSentence: Sentence[] = [];
  sentences_array.forEach((sentenceArray) => {
    let sentence = "";
    sentenceArray.forEach((subtitleAndFromTo) => {
      sentence += subtitleAndFromTo.subtitle;
    });
    if (sentenceArray.length === 1) {
      // 一つで完結した字幕
      arrayPerSentence.push({
        from: sentenceArray[0].from,
        to: sentenceArray[0].to,
        sentence,
      });
    } else {
      const firstTime_string = sentenceArray[0].from;
      const endTime_string = sentenceArray[sentenceArray.length - 1].to;
      arrayPerSentence.push({
        from: firstTime_string,
        to: endTime_string,
        sentence,
      });
    }
  });

  console.log(
    "このレクチャーの原文の文字数: ",
    arrayPerSentence
      .map((sentenceAndFromTo) => sentenceAndFromTo.sentence)
      .join(" ").length
  );

  // let vttPerSentence = `WEBVTT\n\n`;
  const startTime = performance.now(); // 開始時間

  const translatedSentences: Sentence[] = [];
  for await (const sentenceAndFromTo of arrayPerSentence) {
    const collectionName = "translated_en";
    const sentence_en = sentenceAndFromTo.sentence;
    const docRef = doc(db, collectionName, sentence_en);
    const docSnap = await getDoc(docRef);
    let text_ja = "";
    if (docSnap.exists()) {
      text_ja = docSnap.data().text_ja;
    } else {
      // 翻訳APIを叩く
      const source = "en";
      const target = "ja";
      const res = await axios.get(
        `https://script.google.com/macros/s/AKfycbwHvOCeufro86JCbI8pZh_XdDXahWLv8tvmqhC_jfYkEXMtm00N6o-pzU5D0bTvGZLfDA/exec?text=${sentence_en}&source=${source}&target=${target}`
      );
      text_ja = res.data.text;
      // 英語と日本語の対を保存しておき、再度同じテキストを翻訳するのを防ぐ
      const translatedEnRef = collection(db, collectionName);
      try {
        await setDoc(doc(translatedEnRef, sentence_en), {
          text_ja,
        });
      } catch (error: any) {
        console.log(error.message);
      }
    }
    translatedSentences.push({
      from: sentenceAndFromTo.from,
      to: sentenceAndFromTo.to,
      sentence: text_ja,
    });
    // vttPerSentence += `${sentenceAndFromTo.from} --> ${sentenceAndFromTo.to}\n${sentenceAndFromTo.sentence}\n\n`;
  }

  const endTime = performance.now(); // 終了時間

  console.log((endTime - startTime) / 1000, " [s]"); // 何ミリ秒かかったかを表示する

  // console.log(translatedSentences);

  console.log(
    translatedSentences
      .map((sentenceAndFromTo) => sentenceAndFromTo.sentence)
      .join("\n")
  );
};
