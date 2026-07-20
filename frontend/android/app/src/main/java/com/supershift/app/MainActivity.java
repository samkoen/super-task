package com.supershift.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaPermissionsPlugin.class);
        super.onCreate(savedInstanceState);
        CookieManager.getInstance().setAcceptCookie(true);
        // Ne pas demander caméra/micro au démarrage : ça peut figer le WebView.
        // Les permissions sont demandées à la première capture (plugin JS).
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
            // Scroll tactile plus fiable sur Android WebView
            webView.getSettings().setDomStorageEnabled(true);
            webView.setVerticalScrollBarEnabled(true);
        }
    }
}
