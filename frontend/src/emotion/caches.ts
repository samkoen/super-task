import createCache from "@emotion/cache";

/**
 * Le prefixer du paquet `stylis` plante sur `::placeholder`
 * (« Cannot read properties of undefined (reading 'push') »).
 * Emotion en fournit un qui préfixe pareil, sans cet échec.
 */
export const emotionCache = createCache({
  key: "mui",
});
