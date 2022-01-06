// import 'core-js';  // NOTE: babel で useBuiltIns: 'entry' にする場合に必要
import axios from "axios";
import { db } from "./firebase";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { Pair } from "./type";

// ここに書かないと以下のスクリプトではDOMを見つけるまで処理が停止する
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log('message received!')
  switch (message.type) {
    case "test":
      console.log(message.value);
    default:
      console.log("default");
  }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const watchValue = (obj: any, propName: string, func: Function): void => {
  let value = obj[propName];
  Object.defineProperty(obj, propName, {
    get: () => value,
    set: (newValue) => {
      const oldValue = value;
      value = newValue;
      func(oldValue, newValue);
    },
    configurable: true,
  });
};

const combineTextIntoSentence = (sentence: string, text: string): string => {
  if (sentence) {
    sentence += ` ${text}`;
  } else {
    sentence = text;
  }
  return sentence;
};

(async () => {
  // videoタグのDOMを取得
  let videoElem: HTMLMediaElement | null = null;
  while (!videoElem) {
    console.log("searching video element ...");
    videoElem = document.querySelector(".vjs-tech");
    await sleep(250);
  }

  let sentence_en = "";
  let currentTime = 0;
  let hasMovedToArbitraryTime = false;
  videoElem.addEventListener("timeupdate", () => {
    // if (Math.abs(currentTime - videoElem.currentTime) > 1) {
    //   // 動画で任意の時間へ移動した
    //   // sentence_en = "";
    //   // hasMovedToArbitraryTime = true;
    // }
    // currentTimeの値を使用して翻訳一覧からハイライトを当てる箇所を特定する
    if (!videoElem) return;
    currentTime = videoElem.currentTime;
  });

  // 変更時に実行したい関数を定義
  const textPairs_en_ja: Pair[] = [];
  let latestText_en = "";
  let texts_en: string[] = [];
  const onChange = async (oldText_en: string, newText_en: string) => {
    // 既存のsentenceへの結合
    console.log(newText_en);
    sentence_en = combineTextIntoSentence(sentence_en, newText_en);

    texts_en.push(newText_en);
    if (newText_en.slice(-1) === ".") {
      // 完成したsentenceでDBから翻訳 or APIで翻訳
      const collectionName = "translated_en";
      const docRef = doc(db, collectionName, sentence_en);
      const docSnap = await getDoc(docRef);
      let text_ja = "";
      if (docSnap.exists()) {
        text_ja = docSnap.data().text_ja;
      } else {
        // 翻訳APIを叩く
        console.log("翻訳APIを叩く");
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
          console.log(sentence_en);
        }
      }

      // キャッシュとして格納
      if (!textPairs_en_ja.find((textPair) => textPair.text_ja === text_ja)) {
        textPairs_en_ja.push({
          texts_en,
          text_ja,
          currentTime,
        });
      }

      // 自分の拡張機能に送信する場合は、各ページで runtime.onMessage イベントが発生
      // 拡張機能がこのメソッドを使用して
      // コンテンツスクリプトにメッセージを送信することはできないこと
      // に注意してください。コンテンツスクリプトにメッセージを送信するには、
      // tabs.sendMessage を使用してください。
      // popupに送信
      chrome.runtime.sendMessage(textPairs_en_ja);

      // 初期化
      sentence_en = "";
      texts_en = [];
    }
  };

  const subtitle = {
    text_en: "",
  };
  Object.getOwnPropertyNames(subtitle).forEach((propName) =>
    watchValue(subtitle, propName, onChange)
  );
  // data-purpose="captions-cue-text"のDOMを見つけるまで、繰り返し処理を行う
  // const intervalID = window.setInterval(() => {
  //   const element = document.querySelector(
  //     '[data-purpose="captions-cue-text"]'
  //   );
  //   if (!element) return; // DOMが取得できていない
  //   if (!element.textContent) return;
  //   if (latestText_en === element.textContent) return; // 既に取得済みの原文
  //   latestText_en = element.textContent;
  //   subtitle.text_en = element.textContent;
  // }, 250);
})();