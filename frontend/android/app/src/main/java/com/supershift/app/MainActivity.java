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
            Insets status = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            float density = v.getResources().getDisplayMetrics().density;
            int bottomPx = Math.round(nav.bottom / Math.max(density, 1f));
            int topPx = Math.round(status.top / Math.max(density, 1f));
            // 0px écrase le fallback JS et laisse les contrôles sous les barres Samsung.
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
            if (js.length() > 0) {
                webView.evaluateJavascript(js.toString(), null);
            }
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
