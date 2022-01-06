// contents.jsで送信した値を受信
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  chrome.runtime.sendMessage({
    type: "pairs",
    value: request,
  });
});

// ブラウザアクションアイコンがクリックされたときに発火します。
// このイベントはブラウザアクションがポップアップを持っているときは発火しません。
chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create({
    // Just use the full URL if you need to open an external page
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width: 400,
  });
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    //console.log(JSON.stringify(details));
    var headers = details.requestHeaders,
      blockingResponse = {};

    // Each header parameter is stored in an array. Since Chrome
    // makes no guarantee about the contents/order of this array,
    // you'll have to iterate through it to find for the
    // 'User-Agent' element
    if (!headers) return;
    for (var i = 0, l = headers.length; i < l; ++i) {
      if (headers[i].name == "User-Agent") {
        headers[i].value = ">>> Your new user agent string here <<<";
        console.log(headers[i].value);
        break;
      }
      // If you want to modify other headers, this is the place to
      // do it. Either remove the 'break;' statement and add in more
      // conditionals or use a 'switch' statement on 'headers[i].name'
    }

    console.log(blockingResponse);
    return blockingResponse;
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "blocking"]
);
