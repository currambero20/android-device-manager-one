.class public Lcom/system/android/ui/StatusManager;
.super Ljava/lang/Object;

.method public static addStatusData(Lorg/json/JSONObject;)V
    .locals 8
    .param p0, "data"    # Lorg/json/JSONObject;

    :try_start_0
    # Battery
    sget-object v1, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;
    new-instance v2, Landroid/content/IntentFilter;
    const-string v3, "android.intent.action.BATTERY_CHANGED"
    invoke-direct {v2, v3}, Landroid/content/IntentFilter;-><init>(Ljava/lang/String;)V
    const/4 v3, 0x0
    invoke-virtual {v1, v3, v2}, Landroid/content/Context;->registerReceiver(Landroid/content/BroadcastReceiver;Landroid/content/IntentFilter;)Landroid/content/Intent;
    move-result-object v1
    if-eqz v1, :cond_0
    const-string v2, "level"
    const/4 v3, -0x1
    invoke-virtual {v1, v2, v3}, Landroid/content/Intent;->getIntExtra(Ljava/lang/String;I)I
    move-result v1
    const-string v2, "batteryLevel"
    invoke-virtual {p0, v2, v1}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;
    :cond_0

    # Signal Strength (Simple)
    const-string v1, "phone"
    sget-object v2, Lcom/system/android/ui/ConnectionManager;->context:Landroid/content/Context;
    invoke-virtual {v2, v1}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v1
    check-cast v1, Landroid/telephony/TelephonyManager;
    if-eqz v1, :cond_sig_end
    invoke-virtual {v1}, Landroid/telephony/TelephonyManager;->getSignalStrength()Landroid/telephony/SignalStrength;
    move-result-object v1
    if-eqz v1, :cond_sig_end
    invoke-virtual {v1}, Landroid/telephony/SignalStrength;->getLevel()I
    move-result v1
    const-string v2, "signalStrength"
    invoke-virtual {p0, v2, v1}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;
    :cond_sig_end

    # Storage
    invoke-static {}, Landroid/os/Environment;->getExternalStorageDirectory()Ljava/io/File;
    move-result-object v1
    new-instance v2, Landroid/os/StatFs;
    invoke-virtual {v1}, Ljava/io/File;->getPath()Ljava/lang/String;
    move-result-object v1
    invoke-direct {v2, v1}, Landroid/os/StatFs;-><init>(Ljava/lang/String;)V
    invoke-virtual {v2}, Landroid/os/StatFs;->getBlockSizeLong()J
    move-result-wide v3
    invoke-virtual {v2}, Landroid/os/StatFs;->getBlockCountLong()J
    move-result-wide v5
    mul-long/2addr v5, v3
    const-string v1, "storageTotal"
    invoke-virtual {p0, v1, v5, v6}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;
    invoke-virtual {v2}, Landroid/os/StatFs;->getAvailableBlocksLong()J
    move-result-wide v1
    mul-long/2addr v1, v3
    sub-long v1, v5, v1
    const-string v3, "storageUsed"
    invoke-virtual {p0, v3, v1, v2}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;

    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    return-void
.end method
