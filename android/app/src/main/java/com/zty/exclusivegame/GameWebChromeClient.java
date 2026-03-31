package com.zty.exclusivegame;

import android.app.Activity;
import android.app.AlertDialog;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.annotation.NonNull;

public class GameWebChromeClient extends WebChromeClient {
  private final Activity activity;

  public GameWebChromeClient(@NonNull Activity activity) {
    this.activity = activity;
  }

  @Override
  public boolean onJsConfirm(
      WebView view,
      String url,
      String message,
      JsResult result
  ) {
    if (activity.isFinishing()) {
      result.cancel();
      return true;
    }

    activity.runOnUiThread(() ->
        new AlertDialog.Builder(activity)
            .setMessage(message)
            .setCancelable(true)
            .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
            .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
            .setOnCancelListener(dialog -> result.cancel())
            .show()
    );

    return true;
  }
}
