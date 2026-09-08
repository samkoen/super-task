package com.supershift.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class WebViewInsetScriptTest {
    @Test
    public void skipsZeroInsetsSoJsFallbackStays() {
        assertEquals("", WebViewInsetScript.buildCssVarScript(0, 0));
        assertFalse(WebViewInsetScript.buildCssVarScript(0, 0).contains("0px"));
    }

    @Test
    public void writesOnlyPositiveInsets() {
        String js = WebViewInsetScript.buildCssVarScript(24, 18);
        assertTrue(js.contains("--app-nav-bottom','24px'"));
        assertTrue(js.contains("--app-nav-top','18px'"));
        assertFalse(js.contains("0px"));
    }

    @Test
    public void writesTopOnlyWhenBottomIsZero() {
        String js = WebViewInsetScript.buildCssVarScript(0, 32);
        assertFalse(js.contains("--app-nav-bottom"));
        assertTrue(js.contains("--app-nav-top','32px'"));
    }
}
