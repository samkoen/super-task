package com.supershift.app;

/**
 * JS injecté dans le WebView pour les barres système.
 * Ne jamais écrire 0px : ça écrase le fallback JS et cache les boutons Samsung.
 */
final class WebViewInsetScript {
    private WebViewInsetScript() {}

    static String buildCssVarScript(int bottomPx, int topPx) {
        StringBuilder js = new StringBuilder();
        if (bottomPx > 0) {
            js.append("document.documentElement.style.setProperty('--app-nav-bottom','")
                .append(bottomPx)
                .append("px');");
        }
        if (topPx > 0) {
            js.append("document.documentElement.style.setProperty('--app-nav-top','")
                .append(topPx)
                .append("px');");
        }
        return js.toString();
    }
}
