(async () => {
  const decoder = new TextDecoder();
  // chrome.devtools.network等から字幕データのURLを取得する
  const response = await fetch(
    "https://vtt-b.udemycdn.com/18676122/en_US/2019-07-01_14-27-27-10bf98949869f14c81fc688b77052a9c.vtt?secure=vb8rFbG_SXsy1GnD2HiLAg%3D%3D%2C1641436621",
    {
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
    }
  );
  const reader = await response.body?.getReader();
  let subtitle = "";
  while (true) {
    if (!reader) continue;
    const result = await reader.read();
    if (result.done) {
      break;
    } else {
      subtitle += decoder.decode(result.value);
    }
  }
  // console.log(subtitle);
})();
