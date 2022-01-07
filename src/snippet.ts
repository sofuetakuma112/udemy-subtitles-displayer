// // 動画を読み取り、response.body を使用してレスポンスのストリームを公開し、
//   // ReadableStream.getReader() を使用してリーダーを作成し、
//   // そのストリームのチャンクを
//   // 2番目のカスタム読み取り可能なストリームのキューに入れます
//   // 動画の同一コピーを効果的に作成します。
//   const createdObjectURL = await fetch(url)
//     // その body を ReadableStream として取得
//     .then((response) => response.body)
//     .then((body) => {
//       if (!body) throw Error("body is null");
//       const reader = body.getReader();

//       return new ReadableStream({
//         start(controller) {
//           return pump();

//           function pump(): any {
//             return reader.read().then(({ done, value }) => {
//               console.log(done, value);
//               // データを消費する必要がなくなったら、ストリームを閉じます
//               if (done) {
//                 controller.close();
//                 return;
//               }

//               // 次のデータチャンクを対象のストリームのキューに入れます
//               controller.enqueue(value);
//               return pump();
//             });
//           }
//         },
//       });
//     })
//     .then((stream) => new Response(stream))
//     .then((response) => response.blob())
//     .then((blob) => URL.createObjectURL(blob)); // 引数で指定されたオブジェクトを表す URL を含む DOMString を生成します

//   let a = document.createElement("a");
//   a.download = filename;
//   a.href = createdObjectURL;
//   console.log('createdObjectURL', createdObjectURL)
//   a.dataset.downloadurl = [type, a.download, a.href].join(":");
//   a.style.display = "none";
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   setTimeout(function () {
//     // オブジェクト URL を解放する
//     URL.revokeObjectURL(a.href);
//   }, 11500);