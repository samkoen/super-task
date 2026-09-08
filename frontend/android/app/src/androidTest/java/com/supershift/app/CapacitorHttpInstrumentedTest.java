package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.TimeUnit;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class CapacitorHttpInstrumentedTest {

    @Test
    public void postsEmptyJsonObjectSoStartWouldReachTheServer() throws Exception {
        MockWebServer server = new MockWebServer();
        server.enqueue(jsonOk());
        server.start();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            WebView webView = webViewFrom(scenario);
            assertTrue(
                "CapacitorHttp plugin missing — npx cap sync android",
                WebViewEval.waitUntilTrue(webView, capacitorHttpReadyJs(), 20_000)
            );
            String url = "http://127.0.0.1:" + server.getPort() + "/tasks/occurrences/occ-1/start";
            CapacitorHttpProbe.postJsonObject(webView, url, "{}");
            RecordedRequest req = server.takeRequest(15, TimeUnit.SECONDS);
            assertNotNull("CapacitorHttp never hit the local server", req);
            assertEquals("POST", req.getMethod());
            assertEquals("/tasks/occurrences/occ-1/start", req.getPath());
            assertEquals("{}", req.getBody().readUtf8());
        } finally {
            server.shutdown();
        }
    }

    private static MockResponse jsonOk() {
        return new MockResponse()
            .setBody("{\"ok\":true}")
            .addHeader("Content-Type", "application/json");
    }

    private static String capacitorHttpReadyJs() {
        return "!!(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorHttp)";
    }

    private static WebView webViewFrom(ActivityScenario<MainActivity> scenario) {
        final WebView[] holder = new WebView[1];
        scenario.onActivity(activity -> {
            assertNotNull(activity.getBridge());
            holder[0] = activity.getBridge().getWebView();
            assertNotNull(holder[0]);
        });
        return holder[0];
    }
}
