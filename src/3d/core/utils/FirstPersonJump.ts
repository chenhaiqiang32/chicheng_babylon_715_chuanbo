import { Editor } from "@/3d/Editor";
import { UniversalCamera, Vector3, Ray, AbstractMesh, Scene, Observable, Observer } from "@babylonjs/core";

export class FirstPersonJump{
    private gravity: number = -9.8;
    private jumpSpeed: number = 5;
    private isGrounded: boolean = false;
    private verticalVelocity: number = 0;
    private camera:UniversalCamera;
    private observer: Observer<Scene>;

    constructor(camera:UniversalCamera, jumpSpeed:number = 5){
        this.jumpSpeed = jumpSpeed;
        this.camera = camera;

        window.addEventListener("keydown", (evt) => {
          if(evt.code == "Space"){
                // 只有在落地状态才允许起跳，避免无限连跳
                if (this.isGrounded) {
                    this.verticalVelocity = this.jumpSpeed;
                    this.isGrounded = false;
                }
            }
        });

        this.observer = Editor.Instance.Scene.onBeforeRenderObservable.add(() => {
            const dt = Editor.Instance.Scene.getEngine().getDeltaTime() / 1000;

            // 先做一次地面检测
            this.isGrounded = this.checkGround();
            if (this.isGrounded && this.verticalVelocity <= 0) {
                this.verticalVelocity = 0;
            }
    
            // v = v + a * dt
            this.verticalVelocity += this.gravity * dt;
    
            // 预期的竖直位移
            const deltaY = this.verticalVelocity * dt;
    
            if (deltaY <= 0) {
                // 正在下落：检测这一小段位移内是否会撞到地面
                const scene = Editor.Instance.Scene;
                const ellipsoid = this.camera.ellipsoid ?? new Vector3(1, 1, 1);
                const rayOrigin = this.camera.position.add(new Vector3(0, -ellipsoid.y, 0));
                const rayLength = Math.abs(deltaY);
                const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), rayLength);
    
                const pick = scene.pickWithRay(
                    ray,
                    (mesh) => (mesh as AbstractMesh).checkCollisions === true
                );
    
                if (pick?.hit && pick.pickedPoint) {
                    // 撞到地面：把相机放到地面上方（按 ellipsoid 高度抬起），并认为落地
                    //this.camera.position.y = pick.pickedPoint.y + ellipsoid.y;
                    this.verticalVelocity = 0;
                    this.isGrounded = true;
                    return;
                }
            }
    
            // 正常位移（上升或者还在空中下落但没撞到地）
            this.camera.position.y += deltaY;
        });
    }

        /**
     * 使用射线检测相机脚下是否有开启了 checkCollisions 的网格
     */
        private checkGround(): boolean {
            const scene = Editor.Instance.Scene;
    
            // 从相机“脚底”稍微往下打一条射线
            const ellipsoid = this.camera.ellipsoid ?? new Vector3(1, 1, 1);
            const rayOrigin = this.camera.position.add(new Vector3(0, -ellipsoid.y, 0));
            const rayLength = 0.2;
            const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), rayLength);
    
            const pick = scene.pickWithRay(
                ray,
                (mesh) => (mesh as AbstractMesh).checkCollisions === true
            );
    
            return !!pick?.hit;
        }

    dispose(){
    }
}