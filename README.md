環境変数をenvファイル等から読み込むことに対応できていません

firebaseプロジェクトを新規で作成して
srcディレクトリ配下に以下の内容で`firebase.ts`という名前のファイルを作成してください
```ts
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  projectId: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  storageBucket: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  messagingSenderId: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  appId: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
};

const app = initializeApp(firebaseConfig);

export const storage = getStorage(app);
```

その後

`npm i`

`npm run build`

を実行して生成されるdistディレクトリをChromeの「パッケージ化されていない拡張機能を読み込む」から読み込むことで使用することができます
