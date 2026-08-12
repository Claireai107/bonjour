// 테스트에서만 쓰는 모듈 해석 도우미.
//
// 앱 코드는 `import { MODEL } from "./modelParams"` 처럼 확장자를 생략한다.
// Next.js(번들러)는 이걸 알아서 찾지만, node 로 직접 실행할 때는 못 찾는다.
// 그래서 테스트를 돌릴 때만 .ts / .tsx 확장자를 붙여 다시 시도하게 한다.
// 앱 코드나 빌드 설정은 건드리지 않는다.

import { register } from "node:module";

register(new URL("./resolveTsHook.mjs", import.meta.url));
