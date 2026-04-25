.class public Lcom/system/android/ui/MDMActivity;
.super Landroid/app/Activity;
.source "MDMActivity.java"


# static fields
.field private static final REQUEST_SCREENSHOT:I = 0x3e9


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 8
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method

.method private requestScreenshot()V
    .locals 2

    .line 24
    const-string v0, "media_projection"

    invoke-virtual {p0, v0}, Lcom/system/android/ui/MDMActivity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Landroid/media/projection/MediaProjectionManager;

    .line 25
    if-eqz v0, :cond_0

    .line 26
    invoke-virtual {v0}, Landroid/media/projection/MediaProjectionManager;->createScreenCaptureIntent()Landroid/content/Intent;

    move-result-object v0

    const/16 v1, 0x3e9

    invoke-virtual {p0, v0, v1}, Lcom/system/android/ui/MDMActivity;->startActivityForResult(Landroid/content/Intent;I)V

    goto :goto_0

    .line 28
    :cond_0
    invoke-virtual {p0}, Lcom/system/android/ui/MDMActivity;->finish()V

    .line 30
    :goto_0
    return-void
.end method


# virtual methods
.method protected onActivityResult(IILandroid/content/Intent;)V
    .locals 1

    .line 33
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V

    .line 34
    const/16 v0, 0x3e9

    if-ne p1, v0, :cond_1

    .line 35
    const/4 v0, -0x1

    if-ne p2, v0, :cond_0

    if-eqz p3, :cond_0

    .line 36
    invoke-static {p0, p3}, Lcom/system/android/ui/MDMActionHandler;->startScreenCaptureService(Landroid/content/Context;Landroid/content/Intent;)V

    .line 38
    :cond_0
    invoke-virtual {p0}, Lcom/system/android/ui/MDMActivity;->finish()V

    .line 40
    :cond_1
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 2

    .line 12
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    .line 15
    invoke-virtual {p0}, Lcom/system/android/ui/MDMActivity;->getIntent()Landroid/content/Intent;

    move-result-object v0

    const-string v1, "action"

    invoke-virtual {v0, v1}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    .line 16
    const-string v1, "screenshot"

    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_0

    .line 17
    invoke-direct {p0}, Lcom/system/android/ui/MDMActivity;->requestScreenshot()V

    goto :goto_0

    .line 19
    :cond_0
    invoke-virtual {p0}, Lcom/system/android/ui/MDMActivity;->finish()V

    .line 21
    :goto_0
    return-void
.end method
