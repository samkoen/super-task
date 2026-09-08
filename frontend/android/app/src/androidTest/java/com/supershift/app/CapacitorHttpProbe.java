package com.supershift.app;

import android.webkit.WebView;
import org.json.JSONObject;

final class CapacitorHttpProbe {
    private CapacitorHttpProbe() {}

    static void postJsonObject(WebView webView, String url, String jsonObjectLiteral)
            throws InterruptedException {
        String js = "(function(){"
            + "window.__capHttpTest={done:false,ok:false,err:''};"
            + "window.Capacitor.Plugins.CapacitorHttp.request({"
            + "url:" + JSONObject.quote(url) + ","
            + "method:'POST',"
            + "headers:{'Content-Type':'application/json'},"
            + "data:" + jsonObjectLiteral
            + "}).then(function(){window.__capHttpTest.ok=true;window.__capHttpTest.done=true;})"
            + ".catch(function(e){window.__capHttpTest.err=String(e);window.__capHttpTest.done=true;});"
            + "return true;})()";
        WebViewEval.javascript(webView, js, 2000);
        if (!WebViewEval.waitUntilTrue(webView, "!!(window.__capHttpTest&&window.__capHttpTest.done)", 15_000)) {
            throw new AssertionError("CapacitorHttp request did not finish");
        }
        if (!"true".equals(WebViewEval.javascript(webView, "window.__capHttpTest.ok", 2000))) {
            throw new AssertionError(
                "CapacitorHttp request failed: "
                    + WebViewEval.javascript(webView, "window.__capHttpTest.err", 2000)
            );
        }
    }
}
