package com.supershift.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaPermissionsPlugin.class);
        registerPlugin(NativeVideoRecorderPlugin.class);
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
            webView.getSettings().setDomStorageEnabled(true);
            webView.setVerticalScrollBarEnabled(true);
            syncNavBottomCssVar(webView);
        }
    }

    private void syncNavBottomCssVar(WebView webView) {
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets nav = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
            float density = v.getResources().getDisplayMetrics().density;
            int cssPx = Math.round(nav.bottom / Math.max(density, 1f));
            // 0px écrase le fallback JS (64px) et laisse les boutons sous la barre Samsung.
            if (cssPx <= 0) {
                return windowInsets;
            }
            String js = "document.documentElement.style.setProperty('--app-nav-bottom','"
                + cssPx + "px')";
            webView.evaluateJavascript(js, null);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
