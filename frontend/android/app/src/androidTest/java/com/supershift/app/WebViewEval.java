package com.supershift.app;

import android.webkit.WebView;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

final class WebViewEval {
    private WebViewEval() {}

    static String javascript(WebView webView, String expression, long timeoutMs)
            throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>("null");
        webView.post(
            () -> webView.evaluateJavascript(expression, result -> {
                value.set(result == null ? "null" : result);
                latch.countDown();
            })
        );
        if (!latch.await(timeoutMs, TimeUnit.MILLISECONDS)) {
            throw new AssertionError("WebView JS timeout: " + expression);
        }
        return value.get();
    }

    static boolean waitUntilTrue(WebView webView, String expression, long timeoutMs)
            throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if ("true".equals(javascript(webView, expression, 2000))) {
                return true;
            }
            Thread.sleep(250);
        }
        return false;
    }
}
