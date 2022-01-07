/* 1. expressモジュールをロードし、インスタンス化してappに代入。*/
var express = require("express");
const cors = require("cors");
var app = express();
const puppeteer = require("puppeteer");

app.use(cors());
app.use(express.json()); // body-parser settings

/* 2. listen()メソッドを実行して3000番ポートで待ち受け。*/
var server = app.listen(3000, function () {
  console.log("Node.js is listening to PORT:" + server.address().port);
});

/* 3. 以後、アプリケーション固有の処理 */

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const vtt2SntenceArray = (text) => {
  const subtitleSplitByLine = text.split("\n").filter((line) => line);
  const subtitleSplitByLineAndRemovedEmptyChar = subtitleSplitByLine.slice(
    1,
    subtitleSplitByLine.length
  );

  let subtitleSplitByLineAndRemovedEmptyCharAndIndexNumber = [];
  if (Number.isInteger(Number(subtitleSplitByLineAndRemovedEmptyChar[0]))) {
    // timestampの上にindexが存在するタイプのvtt
    subtitleSplitByLineAndRemovedEmptyCharAndIndexNumber =
      subtitleSplitByLineAndRemovedEmptyChar.filter(
        (line, index) => index % 3 !== 0
      );
  } else {
    subtitleSplitByLineAndRemovedEmptyCharAndIndexNumber =
      subtitleSplitByLineAndRemovedEmptyChar;
  }

  const subtitles_array = [];
  for (
    let i = 0;
    i < subtitleSplitByLineAndRemovedEmptyCharAndIndexNumber.length / 2;
    i++
  ) {
    const timeAndSubtitle =
      subtitleSplitByLineAndRemovedEmptyCharAndIndexNumber.slice(
        i * 2,
        i * 2 + 2
      );
    const time = timeAndSubtitle[0];
    const subtitle = timeAndSubtitle[1];
    const fromTo = time.split(" --> ");
    const from = fromTo[0];
    const to = fromTo[1];
    subtitles_array.push({
      from,
      to,
      subtitle,
    });
  }

  let sentence_array = [];
  const sentences_array = [];
  subtitles_array.forEach((subtitle_array) => {
    try {
      subtitle_array.subtitle.length;
    } catch (error) {
      console.log(fileName);
    }
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

  const arrayPerSentence = [];
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

  return arrayPerSentence;
};

app.post("/api/translate", async (req, res, next) => {
  if (!req.body.data) {
    res.status(200);
    return;
  }
  const options = {
    headless: true,
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.goto("https://www.deepl.com/translator");
  console.log("loading page ...");
  await sleep(5000);

  // const subtitle_byte = fs.readFileSync(`./52. React and ReactDOM.vtt`);
  // const subtitle_utf = new TextDecoder().decode(subtitle_byte);
  // // vttをSentence[]に変換
  // const sentenceArray = vtt2SntenceArray(subtitle_utf);

  // Sentence[]からsentenceのみを取り出し配列に格納する
  const sentenceArray = req.body.data;
  const sentences = sentenceArray.map(
    (sentenceAndFromTo) => sentenceAndFromTo.sentence
  );

  // 5000文字ごとに区切る
  const LIMIT = 4998;
  let batchText_en = "";
  const batchTexts_en = [];
  sentences.forEach((sentence, index) => {
    const nextTotalLength = batchText_en.length + sentence.length;
    if (nextTotalLength < LIMIT) {
      // まだ現在のbatchText_enに追加できる
      if (index === sentences.length - 1) {
        // sentencesのラストのsentence
        batchText_en += `${sentence}\n\n`;
        batchTexts_en.push(batchText_en);
        batchText_en = "";
      } else {
        batchText_en += `${sentence}\n\n`;
      }
    } else {
      batchTexts_en.push(batchText_en);
      batchText_en = `${sentence}\n\n`;
    }
  });

  const batchTextsRemovedEndNewlineChar_en = batchTexts_en.map((batchText) =>
    batchText.slice(0, batchText.length - 2)
  );

  const startTime = performance.now(); // 開始時間
  let batchText_ja = "";
  for await (const batchText_en of batchTextsRemovedEndNewlineChar_en) {
    // dl-test="translator-source-clear-button"
    await sleep(200);
    // 入力領域にテキストを入力
    console.log("typing ...");
    await page.type(
      'textarea[dl-test="translator-source-input"]',
      batchText_en
    );
    console.log("translating ...");

    await sleep(5000);
    console.log("maybe translated!");

    // 出力されたテキストを取得
    const elem = await page.$('[id="target-dummydiv"]');
    const jsHandle = await elem.getProperty("textContent");
    const text = await jsHandle.jsonValue();

    // 翻訳されたテキストの末尾に付く/rを取り除く
    // 末尾が\r\nになっている？
    const textRemovedCarriageReturn = text.slice(0, text.length - 2);
    batchText_ja += `${textRemovedCarriageReturn}\n\n`;

    console.log("press delete button");
    await page.click('button[dl-test="translator-source-clear-button"]');
  }
  const endTime = performance.now(); // 終了時間
  console.log((endTime - startTime) / 1000, " [s]"); // 何ミリ秒かかったかを表示する

  const sentences_ja = batchText_ja.split("\n").filter((line) => line);

  const sentenceArray_ja = sentenceArray.map((sentenceAndFromTo, index) => ({
    from: sentenceAndFromTo.from,
    to: sentenceAndFromTo.to,
    sentence: sentences_ja[index],
  }));

  await browser.close();

  res.status(200).send({
    translatedSentences: sentenceArray_ja,
  });
});
