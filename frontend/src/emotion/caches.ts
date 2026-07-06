import createCache from "@emotion/cache";
import { prefixer } from "stylis";

export const emotionCache = createCache({
  key: "mui",
  stylisPlugins: [prefixer],
});
