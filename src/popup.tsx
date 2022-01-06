import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Pair } from "./type";

const Popup = () => {
  const [currentURL, setCurrentURL] = useState<string>();
  const [message, setMessage] = useState<string>("");
  const [pairs, setPairs] = useState<Pair[]>([]);

  const formatTime = (second: number) => {
    const date = new Date(null as any as number);
    date.setSeconds(second); // specify value for SECONDS here
    return date.toISOString().slice(14, 19);
  };

  // content.js => background.js => popup
  useEffect(() => {
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (request.type === "pairs")
      setPairs(request.value);
    });
  }, []);

  useEffect(() => {
    // tabs
    // ブラウザのタブシステムと対話するには、chrome.tabs APIを使用します。
    // この API を使用して、ブラウザのタブを作成、変更、並べ替えすることができます。
    // query
    // 指定されたプロパティを持つすべてのタブ、
    // またはプロパティが指定されていない場合はすべてのタブを取得します。
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setCurrentURL(tabs[0].url);
    });
  }, []);

  const changeBackground = (pair: Pair) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "getText" }, (response) => {
          setMessage(response);
        });
      }
    });
  };

  return (
    <>
      <ul style={{ minWidth: "700px" }}>
        {pairs.map((pair) => (
          <li key={pair.currentTime} onClick={() => changeBackground(pair)}>
            {formatTime(pair.currentTime)} : {pair.text_ja}
          </li>
        ))}
      </ul>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
