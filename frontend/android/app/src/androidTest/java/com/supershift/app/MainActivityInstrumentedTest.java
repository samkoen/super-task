package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class MainActivityInstrumentedTest {

    @Test
    public void webViewKeepsCookiesDomStorageAndMixedContent() {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                WebView webView = requireWebView(activity);
                WebSettings settings = webView.getSettings();
                assertTrue(settings.getJavaScriptEnabled());
                assertTrue(settings.getDomStorageEnabled());
                assertEquals(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW, settings.getMixedContentMode());
                assertTrue(CookieManager.getInstance().acceptCookie());
                assertTrue(CookieManager.getInstance().acceptThirdPartyCookies(webView));
            });
        }
    }

    @Test
    public void registersNativeCapturePlugins() {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertNotNull(activity.getBridge().getPlugin("MediaPermissions"));
                assertNotNull(activity.getBridge().getPlugin("NativeVideoRecorder"));
                assertNotNull(activity.getBridge().getPlugin("NativePhotoCapture"));
                assertNotNull(activity.getBridge().getPlugin("NativeBlobUpload"));
            });
        }
    }

    @Test
    public void capacitorBridgeIsInjectedIntoWebView() throws InterruptedException {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            WebView webView = webViewFrom(scenario);
            assertTrue(
                "Capacitor JS bridge missing — sync android assets (npx cap sync)",
                WebViewEval.waitUntilTrue(webView, "!!window.Capacitor", 20_000)
            );
            String inset = WebViewEval.javascript(
                webView,
                "document.documentElement.style.getPropertyValue('--app-nav-bottom')",
                2000
            );
            assertFalse("native 0px inset would hide dialog buttons", "\"0px\"".equals(inset));
        }
    }

    private static WebView webViewFrom(ActivityScenario<MainActivity> scenario) {
        final WebView[] holder = new WebView[1];
        scenario.onActivity(activity -> holder[0] = requireWebView(activity));
        return holder[0];
    }

    private static WebView requireWebView(MainActivity activity) {
        assertNotNull(activity.getBridge());
        WebView webView = activity.getBridge().getWebView();
        assertNotNull(webView);
        return webView;
    }
}
