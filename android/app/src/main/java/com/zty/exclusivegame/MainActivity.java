package com.zty.exclusivegame;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
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

  private ActivityMainBinding binding;
  private WebView webView;

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
    getOnBackPressedDispatcher().addCallback(
        this,
        new OnBackPressedCallback(true) {
          @Override
          public void handleOnBackPressed() {
            if (webView != null && webView.canGoBack()) {
              webView.goBack();
              return;
            }

            setEnabled(false);
            getOnBackPressedDispatcher().onBackPressed();
            setEnabled(true);
          }
        }
    );
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
