package com.zty.exclusivegame;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.webkit.WebViewAssetLoader;

public class GameWebViewClient extends WebViewClient {
  public interface Listener {
    void onPageStarted();

    void onPageFinished();

    void onPageError(String description);
  }

  private final Context context;
  private final WebViewAssetLoader assetLoader;
  private final Listener listener;
  private boolean mainFrameError;

  public GameWebViewClient(
      @NonNull Context context,
      @NonNull WebViewAssetLoader assetLoader,
      @NonNull Listener listener
  ) {
    this.context = context;
    this.assetLoader = assetLoader;
    this.listener = listener;
  }

  @Override
  public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
    return assetLoader.shouldInterceptRequest(request.getUrl());
  }

  @Override
  public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
    Uri uri = request.getUrl();
    if (WebViewAssetLoader.DEFAULT_DOMAIN.equals(uri.getHost())) {
      return false;
    }

    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
    intent.addCategory(Intent.CATEGORY_BROWSABLE);

    try {
      context.startActivity(intent);
    } catch (ActivityNotFoundException ignored) {
      return false;
    }

    return true;
  }

  @Override
  public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
    mainFrameError = false;
    listener.onPageStarted();
  }

  @Override
  public void onPageFinished(WebView view, String url) {
    if (!mainFrameError) {
      listener.onPageFinished();
    }
  }

  @Override
  public void onReceivedError(
      WebView view,
      WebResourceRequest request,
      WebResourceError error
  ) {
    if (request.isForMainFrame()) {
      mainFrameError = true;
      CharSequence description = error.getDescription();
      listener.onPageError(description == null ? "Unknown error" : description.toString());
    }
  }
}
