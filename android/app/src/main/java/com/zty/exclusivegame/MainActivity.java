package com.zty.exclusivegame;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;

import com.zty.exclusivegame.databinding.ActivityMainBinding;

public class MainActivity extends AppCompatActivity {
  private static final String GAME_URL =
      "https://appassets.androidplatform.net/assets/web/index.html";
  private static final String HANDLE_BACK_SCRIPT =
      "(function(){try{return !!(window.androidHandleBack && window.androidHandleBack());}"
          + "catch(e){return false;}})();";

  private ActivityMainBinding binding;
  private WebView webView;
  private boolean awaitingBackResult = false;
  private OnBackPressedCallback backPressedCallback;

  @Override
  protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    binding = ActivityMainBinding.inflate(getLayoutInflater());
    setContentView(binding.getRoot());

    webView = binding.gameWebView;
    configureWebView();
    configureBackNavigation();

    binding.retryButton.setOnClickListener(view -> loadGame());
    loadGame();
  }

  private void configureWebView() {
    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setSupportZoom(false);
    settings.setUseWideViewPort(true);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      settings.setSafeBrowsingEnabled(true);
    }

    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

    webView.setBackgroundColor(Color.TRANSPARENT);
    webView.setVerticalScrollBarEnabled(false);
    webView.setHorizontalScrollBarEnabled(false);
    webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
    webView.setWebChromeClient(new GameWebChromeClient(this));

    WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
        .build();

    webView.setWebViewClient(
        new GameWebViewClient(
            this,
            assetLoader,
            new GameWebViewClient.Listener() {
              @Override
              public void onPageStarted() {
                showLoading();
              }

              @Override
              public void onPageFinished() {
                showGame();
              }

              @Override
              public void onPageError(String description) {
                showError(description);
              }
            }
        )
    );
  }

  private void loadGame() {
    showLoading();
    webView.loadUrl(GAME_URL);
  }

  private void configureBackNavigation() {
    backPressedCallback =
        new OnBackPressedCallback(true) {
          @Override
          public void handleOnBackPressed() {
            handleAndroidBack();
          }
        };

    getOnBackPressedDispatcher().addCallback(this, backPressedCallback);
  }

  private void handleAndroidBack() {
    if (webView == null) {
      fallbackToSystemBack();
      return;
    }

    if (awaitingBackResult) {
      return;
    }

    awaitingBackResult = true;
    webView.evaluateJavascript(
        HANDLE_BACK_SCRIPT,
        value -> {
          awaitingBackResult = false;

          if ("true".equals(value)) {
            return;
          }

          if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
          }

          fallbackToSystemBack();
        }
    );
  }

  private void fallbackToSystemBack() {
    if (backPressedCallback == null) {
      finish();
      return;
    }

    backPressedCallback.setEnabled(false);
    getOnBackPressedDispatcher().onBackPressed();
    backPressedCallback.setEnabled(true);
  }

  @Override
  public boolean dispatchKeyEvent(KeyEvent event) {
    if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
      handleAndroidBack();
      return true;
    }

    return super.dispatchKeyEvent(event);
  }

  private void showLoading() {
    binding.loadingOverlay.setVisibility(View.VISIBLE);
    binding.errorOverlay.setVisibility(View.GONE);
    binding.gameWebView.setAlpha(0f);
  }

  private void showGame() {
    binding.loadingOverlay.setVisibility(View.GONE);
    binding.errorOverlay.setVisibility(View.GONE);
    binding.gameWebView.animate().alpha(1f).setDuration(180L).start();
  }

  private void showError(String description) {
    binding.loadingOverlay.setVisibility(View.GONE);
    binding.errorOverlay.setVisibility(View.VISIBLE);
    binding.errorDetail.setText(getString(R.string.android_error_detail, description));
  }

  @Override
  protected void onDestroy() {
    if (webView != null) {
      webView.stopLoading();
      webView.setWebViewClient(null);
      webView.destroy();
      webView = null;
    }

    binding = null;
    super.onDestroy();
  }
}
