const fs = require("fs");

const DIR_NAME = "subtitles";
const fileList = fs.readdirSync(`./${DIR_NAME}`);

let totalCharLength = 0;
const errorFileName = fileList;
for (const fileName of fileList) {
  const encoder = new TextDecoder();
  const subtitle_byte = fs.readFileSync(`./${DIR_NAME}/${fileName}`);
  const subtitle_utf = encoder.decode(subtitle_byte);

  const subtitleSplitByLine = subtitle_utf.split("\n").filter((line) => line);
  const subtitleSplitByLineAndRemovedEmptyChar = subtitleSplitByLine.slice(
    1,
    subtitleSplitByLine.length
  );
  // .filter((line, index) => Number.isInteger(Number(line)));

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

  // console.log(subtitleSplitByLineAndRemovedEmptyChar)

  const subtitles_array = [];
  for (
    let i = 0;
    i < subtitleSplitByLineAndRemovedEmptyCharAndIndexNumber.length / 2;
    i++
  ) {
    const timeAndSubtitle = subtitleSplitByLineAndRemovedEmptyCharAndIndexNumber.slice(
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

  totalCharLength += arrayPerSentence
    .map((sentenceAndFromTo) => sentenceAndFromTo.sentence)
    .join(" ").length;
}

console.log("このコースの原文の文字数: ", totalCharLength);
