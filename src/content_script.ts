import { Subtitle } from "./type";

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
  let course_id = param_course_id || get_args_course_id(); // HTMLから現在表示しているコースのcourseIdを取得
  let lecture_id = param_lecture_id || get_args_lecture_id(); // URLからlectureIdを取得
  let url = `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${course_id}/lectures/${lecture_id}/?fields[lecture]=asset,description,download_url,is_free,last_watched_second&fields[asset]=asset_type,length,media_license_token,media_sources,captions,thumbnail_sprite,slides,slide_urls,download_urls`;
  return url;
}

// https://greasyfork.org/en/scripts/422576-udemy-subtitle-downloader-v3/discussions/110421
function get_args_lecture_id() {
  const result = /(?<=lecture\/)\d*/.exec(document.URL);
  if (!result) return;
  return result[0];
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
  let course_id = get_args_course_id();
  // let example_url = "https://www.udemy.com/api-2.0/courses/3681012/subscriber-curriculum-items/?page_size=1400&fields[lecture]=title,object_index,is_published,sort_order,created,asset,supplementary_assets,is_free&fields[quiz]=title,object_index,is_published,sort_order,type&fields[practice]=title,object_index,is_published,sort_order&fields[chapter]=title,object_index,is_published,sort_order&fields[asset]=title,filename,asset_type,status,time_estimation,is_external&caching_intent=True"
  let url = `https://www.udemy.com/api-2.0/courses/${course_id}/subscriber-curriculum-items/?page_size=1400&fields[lecture]=title,object_index,is_published,sort_order,created,asset,supplementary_assets,is_free&fields[quiz]=title,object_index,is_published,sort_order,type&fields[practice]=title,object_index,is_published,sort_order&fields[chapter]=title,object_index,is_published,sort_order&fields[asset]=title,filename,asset_type,status,time_estimation,is_external&caching_intent=True`;
  return url;
}

// テキスト形式のvttを{ from, to, subtitle }型の構造化されたものに変換する
const convertToStructuredVtt = (vtt: string) => {
  const regex = /(\d{2}):(\d{2}):(\d{2}).(\d{3}) --> (\d{2}):(\d{2}):(\d{2}).(\d{3})\n(.*)\n/g;
  const subtitles: Subtitle[] = [];
  let match;
  while ((match = regex.exec(vtt))) {
    subtitles.push({
      from: `${match[1]}:${match[2]}:${match[3]}.${match[4]}`,
      to: `${match[5]}:${match[6]}:${match[7]}.${match[8]}`,
      subtitle: match[9].trim(),
    });
  }

  return subtitles;
};

const get_all_vtt_data_and_upload_storage = async () => {
  const course_id = get_args_course_id(); // URLからコースIDを取得
  const courseData = await get_course_data(); // URLから取得したコースIDとCookieから取得した認証情報を元にコース全体のデータを取得する
  const lectures = courseData.results.filter(
    (result: any) => result._class === "lecture"
  ); // chapter, lecture等が入った配列
  await sleep(1000);
  for (const lecture of lectures) {
    const lecture_id = lecture.id;
    // 引数を渡さなかった（空文字の）場合は、現在のレクチャーとして扱われます
    const lectureData = await get_lecture_data(course_id, lecture_id); // 現在のレクチャーのデータを取得する
    await sleep(1000);

    const lecture_id_from_fetched_data = lectureData.id; // 取得したレクチャーデータから、このレクチャーのidを取得する
    const lecture_title = await get_lecture_title_by_id(
      lecture_id_from_fetched_data
    ); // レクチャーidでレクチャータイトルを検索する
    await sleep(1000);

    // 複数の言語の字幕データが入ってくるので、data.asset.captions.lengthが1以上になることもある
    const captions_en = lectureData.asset.captions.find(
      (caption: any) => caption.video_label === "英語"
    );
    const captions_en_auto = lectureData.asset.captions.find(
      (caption: any) => caption.video_label === "英語 [自動]"
    );
    if (
      (!captions_en || !captions_en.url) &&
      (!captions_en_auto || !captions_en_auto.url)
    ) {
      // 英語字幕が存在しないレクチャー
      continue;
    }

    // 字幕データのダウンロード
    const url = captions_en?.url || captions_en_auto?.url;
    const vtt = await fetch(url).then(res => res.text());
    const structuredVtt = convertToStructuredVtt(vtt);
    // バリデーション
    structuredVtt.forEach(({ from, to, subtitle }) => {
      const isOk =
        (from.match(/^\d{2}\:\d{2}\:\d{2}\.\d{3}$/) ||
          from.match(/^\d{2}\:\d{2}\.\d{3}$/)) &&
        (to.match(/^\d{2}\:\d{2}\:\d{2}\.\d{3}$/) ||
          to.match(/^\d{2}\:\d{2}\.\d{3}$/)) &&
        subtitle &&
        isString(subtitle);
      if (!isOk) {
        console.log("該当箇所", { from, to, subtitle });
        throw Error("正しくvttを構造化出来ていない");
      } else return isOk;
    });

    downloadJson(structuredVtt, `en-${course_id}-${lecture_id}.json`)
  }
};

function downloadJson(data: any, filename: string) {
  // JSONデータを文字列に変換
  const jsonString = JSON.stringify(data);

  // Blobオブジェクトを作成
  const blob = new Blob([jsonString], { type: 'application/json' });

  // aタグを作成
  const a = document.createElement('a');

  // ダウンロードするファイル名を設定
  a.download = filename;

  // BlobオブジェクトをURLに変換
  a.href = URL.createObjectURL(blob);

  // クリックイベントを発火してダウンロードを実行
  a.dispatchEvent(new MouseEvent('click'));
}

get_all_vtt_data_and_upload_storage();
