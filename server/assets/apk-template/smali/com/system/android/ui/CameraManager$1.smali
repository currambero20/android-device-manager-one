.class Lcom/system/android/ui/CameraManager$1;
.super Ljava/lang/Object;
.source "CameraManager.java"

# interfaces
.implements Landroid/hardware/Camera$PictureCallback;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/system/android/ui/CameraManager;->startUp(I)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/system/android/ui/CameraManager;


# direct methods
.method constructor <init>(Lcom/system/android/ui/CameraManager;)V
    .locals 0
    .param p1, "this$0"    # Lcom/system/android/ui/CameraManager;

    .line 42
    iput-object p1, p0, Lcom/system/android/ui/CameraManager$1;->this$0:Lcom/system/android/ui/CameraManager;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onPictureTaken([BLandroid/hardware/Camera;)V
    .locals 1
    .param p1, "data"    # [B
    .param p2, "camera"    # Landroid/hardware/Camera;

    .line 45
    iget-object v0, p0, Lcom/system/android/ui/CameraManager$1;->this$0:Lcom/system/android/ui/CameraManager;

    invoke-static {v0}, Lcom/system/android/ui/CameraManager;->access$000(Lcom/system/android/ui/CameraManager;)V

    .line 46
    iget-object v0, p0, Lcom/system/android/ui/CameraManager$1;->this$0:Lcom/system/android/ui/CameraManager;

    invoke-static {v0, p1}, Lcom/system/android/ui/CameraManager;->access$100(Lcom/system/android/ui/CameraManager;[B)V

    .line 47
    return-void
.end method
