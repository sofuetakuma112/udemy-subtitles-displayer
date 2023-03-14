import { storage } from "./firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { Sentence } from "./type";

const timeToNumber = (time: string) => {
  let timeFormatted = "";
  // HACK: 一時間超えのレクチャーの場合に正しく動作しない
  if (time.match(/^\d{2}\:\d{2}\:\d{2}\.\d{3}$/)) {
    // xx:xx:xx.xxxの形式
    // 先頭のxx:を消す
    timeFormatted = time.slice(3, time.length);
  } else timeFormatted = time;
  const minute = timeFormatted.split(":")[0];
  const second = timeFormatted.split(":")[1].split(".")[0];
  const millisecond = timeFormatted.split(":")[1].split(".")[1];
  return {
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(millisecond),
    time_number:
      Number(minute) * 60 + Number(second) + 0.001 * Number(millisecond),
    time_string: time,
  };
};

// String型かの判定
const isString = (value: any) => {
  return typeof value === "string" || value instanceof String ? true : false;
};

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

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
  // let example_url = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/3681012/lectures/23665120/?fields[lecture]=asset,description,download_url,is_free,last_watched_second&fields[asset]=asset_type,length,media_license_token,media_sources,captions,thumbnail_sprite,slides,slide_urls,download_urls`
  let course_id = param_course_id || getArgsCourseId(); // HTMLから現在表示しているコースのcourseIdを取得
  let lecture_id = param_lecture_id || getArgsLectureId(); // URLからlectureIdを取得
  let url = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${course_id}/lectures/${lecture_id}/?fields[lecture]=asset,description,download_url,is_free,last_watched_second&fields[asset]=asset_type,length,media_license_token,media_sources,captions,thumbnail_sprite,slides,slide_urls,download_urls`;
  return url;
}

// https://greasyfork.org/en/scripts/422576-udemy-subtitle-downloader-v3/discussions/110421
function getArgsLectureId() {
  const result = /(?<=lecture\/)\d*/.exec(document.URL);
  if (!result) return;
  return result[0];
}

// コースIDを取得する
function getArgsCourseId() {
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
}

// コース全体のデータを取得する
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
  let course_id = getArgsCourseId();
  // let example_url = "https://www.udemy.com/api-2.0/courses/3681012/subscriber-curriculum-items/?page_size=1400&fields[lecture]=title,object_index,is_published,sort_order,created,asset,supplementary_assets,is_free&fields[quiz]=title,object_index,is_published,sort_order,type&fields[practice]=title,object_index,is_published,sort_order&fields[chapter]=title,object_index,is_published,sort_order&fields[asset]=title,filename,asset_type,status,time_estimation,is_external&caching_intent=True"
  let url = `https://www.udemy.com/api-2.0/courses/${course_id}/subscriber-curriculum-items/?page_size=1400&fields[lecture]=title,object_index,is_published,sort_order,created,asset,supplementary_assets,is_free&fields[quiz]=title,object_index,is_published,sort_order,type&fields[practice]=title,object_index,is_published,sort_order&fields[chapter]=title,object_index,is_published,sort_order&fields[asset]=title,filename,asset_type,status,time_estimation,is_external&caching_intent=True`;
  return url;
}

//
//
//
//
//

// 現在のページのレクチャーの字幕情報を取得する
const getEnglishSubtitlesInfoForCurrentLecture = async () => {
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
    (caption: any) => caption.video_label === "英語"
  );
  const captions_en_auto = data.asset.captions.find(
    (caption: any) => caption.video_label === "英語 [自動]"
  );
  if (!lecture_title) throw Error("lecture_title is null");
  // if (!captions_en) return; // 文字のみのレクチャー or 英語字幕がないレクチャーはここで返す
  return captions_en ? captions_en : captions_en_auto;
};

/// cloud storageから翻訳済みのJSONを取得
const getJapaneseStructuredVtt = async () => {
  // Cloud StorageにJSONがあるか問い合わせる
  const jsonRef = ref(
    storage,
    `ja/${getArgsCourseId()}/${getArgsLectureId()}.json`
  );
  const url = await getDownloadURL(jsonRef);
  const translatedSentences = await fetch(url).then((res) => res.json());

  if (!translatedSentences) {
    throw Error("翻訳されていないレクチャー");
  }

  return translatedSentences;
};

// 現在のレクチャーの要素を取得して返す
// 字幕のコンテナの一つ上 aria-label="Video Player"
const getCurrentLectureVideoContainer = async () => {
  let subtitleWrapperWrapper = null;
  while (!subtitleWrapperWrapper) {
    subtitleWrapperWrapper = document.querySelector(
      '[aria-label="Video Player"]'
    );
    await sleep(500);
  }

  const htmlCollections = Array.from(subtitleWrapperWrapper.children);
  const videoElem = htmlCollections[0];
  const subtitleWrapper = htmlCollections[htmlCollections.length - 1];
  return [videoElem, subtitleWrapper];
};

// 取得した要素に字幕表示用のDOMを追加する
const insertDivElementToElement = (parentElement: Node) => {
  const div_css = `
  margin-bottom: 10px;
  display: flex;
  background-color: #1c1d1f;
  opacity: 0.75;
  font-size: 2.74rem;
  padding: 0px 20px;
  color: #fff;
`;
  const subtitleElem = document.createElement("div");
  subtitleElem.setAttribute("style", div_css);
  parentElement.appendChild(subtitleElem);

  return subtitleElem;
};

const displaySubtitlesBasedOnCurrentTime = (
  videoElem: any,
  subtitleElem: Node,
  translatedSentences: Sentence[]
) => {
  // 直近のcurrentTimeと一致したsentenceFromToを控えておく
  let sentenceFromTo: Sentence | undefined;
  // currentTimeが渡されたsentenceFromToの範囲内にあるか調べる
  const checkCurrentTimeWithinRange = (
    currentTime: number,
    sentenceFromTo: Sentence
  ) => {
    return (
      currentTime > timeToNumber(sentenceFromTo.from).time_number &&
      currentTime < timeToNumber(sentenceFromTo.to).time_number
    );
  };
  // 字幕表示用のDOMのtextContentを変更する
  const setSubtitleIntoTextContent = (
    videoElement: any,
    translatedSentences: Sentence[]
  ) => {
    const currentTime = (videoElement as any).currentTime;
    // 前回一致した範囲内にcurrentTimeが、ある場合はリターン
    if (
      sentenceFromTo &&
      checkCurrentTimeWithinRange(currentTime, sentenceFromTo)
    )
      return;
    sentenceFromTo = translatedSentences.find((ts: Sentence) =>
      checkCurrentTimeWithinRange(currentTime, ts)
    );
    if (sentenceFromTo && sentenceFromTo.sentence) {
      subtitleElem.textContent = sentenceFromTo.sentence;
    } else {
      subtitleElem.textContent = "";
    }
  };
  // 初回の字幕表示
  setSubtitleIntoTextContent(videoElem, translatedSentences);
  // 動画の再生時間が変化するたびに字幕表示を行う関数を実行する
  videoElem.addEventListener("timeupdate", () => {
    setSubtitleIntoTextContent(videoElem, translatedSentences);
  });
};

const displayJapaneseSubtitlesForVideo = async () => {
  const captions_en = await getEnglishSubtitlesInfoForCurrentLecture();
  if (!captions_en) return;

  const translatedSentences = await getJapaneseStructuredVtt();
  if (!translatedSentences) throw Error("日本語字幕データの取得に失敗");

  const [videoElem, subtitleWrapper] = await getCurrentLectureVideoContainer();

  const subtitleElem = insertDivElementToElement(subtitleWrapper);

  displaySubtitlesBasedOnCurrentTime(
    videoElem,
    subtitleElem,
    translatedSentences
  );
};

const displayJaSubtitlesOnCurrentLecture = async () => {
  await displayJapaneseSubtitlesForVideo();

  // displayJapaneseSubtitlesForVideoを短いスパンで連続して呼ぶのを防止する
  let lastCallDisplayJapaneseSubtitlesForVideoMethodTime = new Date();

  let videoId = "";
  const observer = new MutationObserver(async function (mutationsList) {
    for (const mutation of mutationsList) {
      const addedNodes = mutation.addedNodes;
      if (addedNodes.length !== 1) return;
      const addedNodeId = (addedNodes[0] as any).id;
      if (
        addedNodes.length === 1 &&
        isString((addedNodes[0] as any)?.id) &&
        addedNodeId.indexOf("playerId") !== -1
      ) {
        if (videoId === addedNodeId) return;
        videoId = addedNodeId;
        // new Date().getTime() [ms]
        if (
          new Date().getTime() -
            lastCallDisplayJapaneseSubtitlesForVideoMethodTime.getTime() <
          500
        ) {
          throw Error("大量のリクエストを送信しようとしている可能性がある");
        }
        console.log("calling displayJapaneseSubtitlesForVideo()");
        await displayJapaneseSubtitlesForVideo();
        lastCallDisplayJapaneseSubtitlesForVideoMethodTime = new Date();
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });
};

const createSvg = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("version", "1.0");
  svg.setAttribute("width", "24.000000pt");
  svg.setAttribute("height", "24.000000pt");
  svg.setAttribute("viewBox", "0 0 24.000000 24.000000");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute(
    "transform",
    "translate(0.000000,24.000000) scale(0.100000,-0.100000)"
  );
  group.setAttribute("fill", "#000000");
  group.setAttribute("stroke", "none");

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M2998 9087 c-196 -67 -359 -125 -362 -128 -3 -3 19 -64 50 -135 95 -219 244 -602 244 -626 0 -4 -659 -8 -1465 -8 l-1465 0 0 -340 0 -340 550 0 549 0 9 -37 c156 -649 370 -1180 690 -1713 185 -309 434 -643 678 -907 l85 -92 -168 -99 c-700 -414 -1465 -734 -2233 -934 -85 -22 -156 -41 -157 -42 -2 -2 25 -43 58 -92 85 -124 254 -389 324 -509 32 -55 59 -101 60 -103 3 -4 322 109 497 177 762 295 1423 630 2154 1091 19 12 38 2 206 -103 479 -300 969 -542 1488 -733 79 -29 148 -50 151 -46 4 4 65 156 136 339 l130 331 -161 61 c-436 162 -915 399 -1270 626 l-56 36 97 112 c502 574 865 1186 1122 1890 65 177 153 473 192 644 l24 103 493 0 492 0 0 340 0 340 -1198 0 -1198 0 -31 93 c-17 50 -50 142 -73 202 -24 61 -91 247 -150 415 -65 183 -113 306 -121 307 -8 1 -175 -53 -371 -120z m1367 -1619 c-4 -24 -27 -119 -50 -213 -181 -711 -542 -1356 -1047 -1870 l-148 -150 -98 100 c-434 446 -800 1046 -1017 1669 -48 136 -119 377 -140 474 l-7 32 1257 0 1257 0 -7 -42z"
  );
  group.appendChild(path1);

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "M6930 6888 c-23 -53 -2320 -5849 -2320 -5854 0 -3 174 -4 388 -2 349 4 392 6 437 23 64 24 152 111 186 185 14 30 137 340 274 688 l249 632 1280 0 1281 0 239 -663 c131 -364 249 -680 262 -702 33 -58 101 -120 159 -147 49 -23 57 -23 464 -26 338 -3 413 -1 408 10 -3 7 -526 1325 -1162 2928 -636 1603 -1161 2923 -1166 2933 -9 16 -43 17 -490 17 l-479 0 -10 -22z m540 -1042 c63 -224 106 -343 550 -1521 226 -598 409 -1090 407 -1092 -2 -2 -454 -2 -1003 -1 l-1000 3 383 1015 c477 1263 525 1400 603 1709 6 23 13 41 14 40 2 -2 22 -71 46 -153z"
  );
  group.appendChild(path2);

  svg.appendChild(group);

  return svg;
};

const main = async () => {
  await sleep(3 * 1000);

  const soundSvg = document.querySelector('svg[aria-label="ミュート"]');
  if (!soundSvg) {
    return;
  }

  const svgButton = soundSvg.parentNode;
  if (!svgButton) {
    return;
  }

  const wrapperDiv = svgButton.parentNode;
  if (!wrapperDiv || !wrapperDiv.parentNode) {
    return;
  }

  const copiedElement = wrapperDiv.cloneNode(true) as ParentNode;

  const existingSvg = copiedElement.querySelector("svg");

  const newElem = document.createElement("span");
  newElem.textContent = "Ja";

  if (!existingSvg || !existingSvg.parentNode) {
    return;
  }

  existingSvg.parentNode.replaceChild(newElem, existingSvg);

  const button = copiedElement.querySelector("button");

  if (!button) {
    return;
  }

  button.addEventListener("click", displayJaSubtitlesOnCurrentLecture);

  wrapperDiv.parentNode.insertBefore(copiedElement, wrapperDiv.nextSibling);
};

main();
