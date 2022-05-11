
import { GLTFNode, VRM, VRMSchema } from "@pixiv/three-vrm";
import { Face, Side, TFace, THand, TPose, Utils, Vector } from "./kalido";
import * as THREE from "three";
import { Keypoint, PosePredictionEx } from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workerlite";
export type AvatarOffset = {
    x: number,
    y: number,
    z: number
}

export class MediapipeAvator {

    avatar: VRM;
    offset: AvatarOffset
    enableFace = true
    enableUpperBody = true
    enableLegs = true
    enableHands = true

    oldLookTarget = new THREE.Euler();

    LEFT_LOWER_ARM_TARGET_COLOR = "rgba(255, 0, 0, 0.5)"
    LEFT_UPPER_ARM_TARGET_COLOR = "rgba(0, 255, 0, 0.5)"
    RIGHT_LOWER_ARM_TARGET_COLOR = "rgba(255, 0, 255, 0.5)"
    RIGHT_UPPER_ARM_TARGET_COLOR = "rgba(0, 255, 255, 0.5)"
    INVISIBLE = "rgba(0, 0, 0, 0.0)"

    leftLowerArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.LEFT_LOWER_ARM_TARGET_COLOR }));
    leftUpperArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.LEFT_UPPER_ARM_TARGET_COLOR }));

    rightLowerArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.RIGHT_LOWER_ARM_TARGET_COLOR }));
    rightUpperArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.RIGHT_UPPER_ARM_TARGET_COLOR }));
    constructor(avatar: VRM, scene: THREE.Scene, offset: AvatarOffset = { x: 0, y: 0, z: 0 }) {
        this.avatar = avatar
        this.offset = offset

        scene.add(this.leftLowerArmTarget)
        scene.add(this.leftUpperArmTarget)
        scene.add(this.rightLowerArmTarget)
        scene.add(this.rightUpperArmTarget)

    }
    setOffset(offset: AvatarOffset) {
        this.offset = offset
    }

    //// TARGET VISIBLE
    private _isTargetVisible: boolean = true
    get isTargetVisible(): boolean { return this._isTargetVisible }
    set isTargetVisible(val: boolean) {
        if (val) {
            this.leftLowerArmTarget.material.color.setStyle(this.LEFT_LOWER_ARM_TARGET_COLOR)
            this.leftUpperArmTarget.material.color.setStyle(this.LEFT_UPPER_ARM_TARGET_COLOR)
            this.rightLowerArmTarget.material.color.setStyle(this.RIGHT_LOWER_ARM_TARGET_COLOR)
            this.rightUpperArmTarget.material.color.setStyle(this.RIGHT_UPPER_ARM_TARGET_COLOR)

        } else {
            this.leftLowerArmTarget.material.color.setStyle(this.INVISIBLE)
            this.leftUpperArmTarget.material.color.setStyle(this.INVISIBLE)
            this.rightLowerArmTarget.material.color.setStyle(this.INVISIBLE)
            this.rightUpperArmTarget.material.color.setStyle(this.INVISIBLE)


        }
        this._isTargetVisible = val
    }



    // Animate Rotation Helper function
    rigRotation = (name: string, rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const Part = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName[name]);
        if (!Part) {
            return;
        }

        const euler = new THREE.Euler(rotation.x * dampener, rotation.y * dampener, rotation.z * dampener);
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
    };
    rigPosition = (name: string, position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const Part = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName[name]);
        if (!Part) {
            return;
        }
        const vector = new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener);
        Part.position.lerp(vector, lerpAmount); // interpolate
    };

    rigFace = (_riggedFace: TFace) => {
        const riggedFace = JSON.parse(JSON.stringify(_riggedFace));
        this.rigRotation("Neck", riggedFace.head, 0.7);

        // Blendshapes and Preset Name Schema
        const Blendshape = this.avatar.blendShapeProxy!;
        const PresetName = VRMSchema.BlendShapePresetName;

        // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
        // for VRM, 1 is closed, 0 is open.

        riggedFace.eye.l = Vector.lerp(Utils.clamp(1 - riggedFace.eye.l, 0, 1), Blendshape.getValue(PresetName.Blink)!, 0.5);
        riggedFace.eye.r = Vector.lerp(Utils.clamp(1 - riggedFace.eye.r, 0, 1), Blendshape.getValue(PresetName.Blink)!, 0.5);
        riggedFace.eye = Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y);

        Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);

        // Interpolate and set mouth blendshapes
        Blendshape.setValue(PresetName.I, Vector.lerp(riggedFace.mouth.shape.I, Blendshape.getValue(PresetName.I), 0.5));
        Blendshape.setValue(PresetName.A, Vector.lerp(riggedFace.mouth.shape.A, Blendshape.getValue(PresetName.A), 0.5));
        Blendshape.setValue(PresetName.E, Vector.lerp(riggedFace.mouth.shape.E, Blendshape.getValue(PresetName.E), 0.5));
        Blendshape.setValue(PresetName.O, Vector.lerp(riggedFace.mouth.shape.O, Blendshape.getValue(PresetName.O), 0.5));
        Blendshape.setValue(PresetName.U, Vector.lerp(riggedFace.mouth.shape.U, Blendshape.getValue(PresetName.U), 0.5));
        //PUPILS
        //interpolate pupil and keep a copy of the value
        const lookTarget = new THREE.Euler(Vector.lerp(this.oldLookTarget.x, riggedFace.pupil.y, 0.4), Vector.lerp(this.oldLookTarget.y, riggedFace.pupil.x, 0.4), 0, "XYZ");
        this.oldLookTarget.copy(lookTarget);
        this.avatar.lookAt!.applyer!.lookAt(lookTarget);

        this.avatar.blendShapeProxy!.update();
    };


    rigUpperBody = (riggedPose: TPose) => {
        this.rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
        this.rigPosition(
            "Hips",
            {
                x: riggedPose.Hips.position.x, // Reverse direction
                y: riggedPose.Hips.position.y + 1, // Add a bit of height
                z: -riggedPose.Hips.position.z, // Reverse direction
            },
            1,
            0.07
        );

        this.rigRotation("Chest", riggedPose.Spine, 0.25, 0.3);
        this.rigRotation("Spine", riggedPose.Spine, 0.45, 0.3);

        this.rigRotation("RightUpperArm", riggedPose.RightUpperArm, 1, 0.3);
        this.rigRotation("RightLowerArm", riggedPose.RightLowerArm, 1, 0.3);
        this.rigRotation("LeftUpperArm", riggedPose.LeftUpperArm, 1, 0.3);
        this.rigRotation("LeftLowerArm", riggedPose.LeftLowerArm, 1, 0.3);

    };

    rigLegs = (riggedPose: TPose) => {
        this.rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg, 1, 0.3);
        this.rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg, 1, 0.3);
        this.rigRotation("RightUpperLeg", riggedPose.RightUpperLeg, 1, 0.3);
        this.rigRotation("RightLowerLeg", riggedPose.RightLowerLeg, 1, 0.3);

    }

    rigLeftHand = (riggedHand: THand<"Left">, poseRig: TPose) => {
        this.rigRotation("LeftHand", {
            // Combine pose rotation Z and hand rotation X Y
            z: poseRig.LeftHand.z,
            y: riggedHand.LeftWrist.y,
            x: riggedHand.LeftWrist.x,

            // z: poseRig.RightHand.z,
            // y: riggedHand.LeftWrist.y,
            // x: riggedHand.LeftWrist.x,

        });
        this.rigRotation("LeftRingProximal", riggedHand.LeftRingProximal);
        this.rigRotation("LeftRingIntermediate", riggedHand.LeftRingIntermediate);
        this.rigRotation("LeftRingDistal", riggedHand.LeftRingDistal);
        this.rigRotation("LeftIndexProximal", riggedHand.LeftIndexProximal);
        this.rigRotation("LeftIndexIntermediate", riggedHand.LeftIndexIntermediate);
        this.rigRotation("LeftIndexDistal", riggedHand.LeftIndexDistal);
        this.rigRotation("LeftMiddleProximal", riggedHand.LeftMiddleProximal);
        this.rigRotation("LeftMiddleIntermediate", riggedHand.LeftMiddleIntermediate);
        this.rigRotation("LeftMiddleDistal", riggedHand.LeftMiddleDistal);
        this.rigRotation("LeftThumbProximal", riggedHand.LeftThumbProximal);
        this.rigRotation("LeftThumbIntermediate", riggedHand.LeftThumbIntermediate);
        this.rigRotation("LeftThumbDistal", riggedHand.LeftThumbDistal);
        this.rigRotation("LeftLittleProximal", riggedHand.LeftLittleProximal);
        this.rigRotation("LeftLittleIntermediate", riggedHand.LeftLittleIntermediate);
        this.rigRotation("LeftLittleDistal", riggedHand.LeftLittleDistal);
    }

    rigRightHand = (riggedHand: THand<"Right">, poseRig: TPose) => {
        this.rigRotation("RightHand", {
            // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
            z: poseRig.RightHand.z,
            y: riggedHand.RightWrist.y,
            x: riggedHand.RightWrist.x,

            // z: poseRig.LeftHand.z,
            // y: riggedHand.RightWrist.y,
            // x: riggedHand.RightWrist.x,

        });
        this.rigRotation("RightRingProximal", riggedHand.RightRingProximal);
        this.rigRotation("RightRingIntermediate", riggedHand.RightRingIntermediate);
        this.rigRotation("RightRingDistal", riggedHand.RightRingDistal);
        this.rigRotation("RightIndexProximal", riggedHand.RightIndexProximal);
        this.rigRotation("RightIndexIntermediate", riggedHand.RightIndexIntermediate);
        this.rigRotation("RightIndexDistal", riggedHand.RightIndexDistal);
        this.rigRotation("RightMiddleProximal", riggedHand.RightMiddleProximal);
        this.rigRotation("RightMiddleIntermediate", riggedHand.RightMiddleIntermediate);
        this.rigRotation("RightMiddleDistal", riggedHand.RightMiddleDistal);
        this.rigRotation("RightThumbProximal", riggedHand.RightThumbProximal);
        this.rigRotation("RightThumbIntermediate", riggedHand.RightThumbIntermediate);
        this.rigRotation("RightThumbDistal", riggedHand.RightThumbDistal);
        this.rigRotation("RightLittleProximal", riggedHand.RightLittleProximal);
        this.rigRotation("RightLittleIntermediate", riggedHand.RightLittleIntermediate);
        this.rigRotation("RightLittleDistal", riggedHand.RightLittleDistal);

    }

    updatePose = (faceRig: TFace | null, poseRig: TPose | null, leftHandRig: THand<Side> | null, rightHandRig: THand<Side> | null) => {
        if (this.enableFace && faceRig) {
            this.rigFace(faceRig);
        }
        if (this.enableUpperBody && poseRig) {
            this.rigUpperBody(poseRig)
        }

        if (this.enableLegs && poseRig) {
            this.rigLegs(poseRig)
        }
        if (this.enableHands && poseRig) {
            if (leftHandRig) {
                this.rigLeftHand(leftHandRig, poseRig)
            }

            if (rightHandRig) {
                this.rigRightHand(rightHandRig, poseRig)
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // RigArm With Rawdata
    ///////////////////////////////////////////////////////////////////////////////////



    rigUpperShaft = (riggedPose: TPose) => {
        this.rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
        this.rigPosition(
            "Hips",
            {
                x: riggedPose.Hips.position.x, // Reverse direction
                y: riggedPose.Hips.position.y + 1, // Add a bit of height
                z: -riggedPose.Hips.position.z, // Reverse direction
            },
            1,
            0.07
        );

        this.rigRotation("Chest", riggedPose.Spine, 0.25, 0.3);
        this.rigRotation("Spine", riggedPose.Spine, 0.45, 0.3);
    };

    getArmPointTFList = (keypoints: Keypoint[], shoulder: number, elbow: number, wrist: number) => {
        return [shoulder, elbow, wrist].map(ind => {
            return new THREE.Vector4(keypoints[ind].x, keypoints[ind].y, keypoints[ind].z, keypoints[ind].score)
        })
    }

    getTargetVectorFromShoulderTF = (shoulderTF: THREE.Vector4, targetTF: THREE.Vector4) => {
        const vectorToTarget = targetTF.clone().sub(shoulderTF);
        return new THREE.Vector3(vectorToTarget.x / 2, -1 * vectorToTarget.y / 2, 1 * vectorToTarget.z) // x, yのスケールがおかしいので調整
    }

    getTargetPosition = (avatar: VRM, side: "Left" | "Right", vector: THREE.Vector3) => {
        let VRMShoulder
        if (side == "Left") {
            VRMShoulder = avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftShoulder)
            // VRMShoulder = avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftUpperArm)
        } else {
            VRMShoulder = avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightShoulder)
            // VRMShoulder = avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightUpperArm)
        }
        if (!VRMShoulder) {
            return null
        }

        const VRMShoulderWorldPosition = new THREE.Vector3();
        VRMShoulder.getWorldPosition(VRMShoulderWorldPosition);
        const VRMShoulderLocalPosition = VRMShoulder.worldToLocal(VRMShoulderWorldPosition.clone());

        const targetLocalPosition = VRMShoulderLocalPosition.clone().add(vector);
        const targetWorldPosition = VRMShoulder.localToWorld(targetLocalPosition.clone());
        return targetWorldPosition
    }

    moveArm = (joint: GLTFNode, effecter: GLTFNode, target: THREE.Vector3) => {
        const _goalPosition = new THREE.Vector3(target.x, target.y, target.z);
        // 注目関節のワールド座標・姿勢等を取得する
        const _jointPosition = new THREE.Vector3();
        const _jointQuaternionInverse = new THREE.Quaternion();
        const _jointScale = new THREE.Vector3();
        joint.matrixWorld.decompose(_jointPosition, _jointQuaternionInverse, _jointScale);
        _jointQuaternionInverse.invert();

        //  注目関節 -> エフェクタのベクトル    
        const _effectorPosition = new THREE.Vector3();
        const _joint2EffectorVector = new THREE.Vector3();
        effecter.getWorldPosition(_effectorPosition);
        _joint2EffectorVector.subVectors(_effectorPosition, _jointPosition);
        _joint2EffectorVector.applyQuaternion(_jointQuaternionInverse);
        _joint2EffectorVector.normalize();

        // 注目関節 -> 目標位置のベクトル
        const _joint2GoalVector = new THREE.Vector3();
        _joint2GoalVector.subVectors(_goalPosition, _jointPosition);
        _joint2GoalVector.applyQuaternion(_jointQuaternionInverse);
        _joint2GoalVector.normalize();

        // cos rad
        let deltaAngle = _joint2GoalVector.dot(_joint2EffectorVector);

        if (deltaAngle > 1.0) {
            deltaAngle = 1.0;
        } else if (deltaAngle < -1.0) {
            deltaAngle = - 1.0;
        }

        // rad
        deltaAngle = Math.acos(deltaAngle);

        // 振動回避
        if (deltaAngle < 1e-5) {
            return;
        }

        // 回転軸
        const _axis = new THREE.Vector3();
        _axis.crossVectors(_joint2EffectorVector, _joint2GoalVector);
        _axis.normalize();

        // 回転
        const _quarternion = new THREE.Quaternion();
        _quarternion.setFromAxisAngle(_axis, deltaAngle);
        joint.quaternion.multiply(_quarternion);
        // joint.quaternion.slerp(_quarternion, 0.3);

        joint.updateMatrixWorld(true);

    }


    updatePoseWithRaw = (faceRig: TFace | null, poseRig: TPose | null, leftHandRig: THand<Side> | null, rightHandRig: THand<Side> | null, poses: PosePredictionEx | null) => {
        if (this.enableFace && faceRig) {
            this.rigFace(faceRig);
        }
        if (this.enableUpperBody && poseRig) {
            this.rigUpperShaft(poseRig)

        }
        console.log(poses)

        if (poses && poses.singlePersonKeypoints3DMovingAverage) {
            // (1) TF処理
            // TFの結果を用いて、方から肘、手首までのベクトルを算出
            // 左右のインデックスはMediapipeのドキュメントの名称をベースに設定。ここではフリップは考慮しない。
            // https://google.github.io/mediapipe/solutions/pose.html
            //// (1-1) 右腕
            const rightArmPointTFList = this.getArmPointTFList(poses.singlePersonKeypoints3DMovingAverage, 12, 14, 16)
            const rightElbowFromShoulderVecTF = this.getTargetVectorFromShoulderTF(rightArmPointTFList[0], rightArmPointTFList[1])
            const rightWristFromShoulderVecTF = this.getTargetVectorFromShoulderTF(rightArmPointTFList[0], rightArmPointTFList[2])

            //// (1-2) 左腕
            const leftArmPointTFList = this.getArmPointTFList(poses.singlePersonKeypoints3DMovingAverage, 11, 13, 15)
            const leftElbowFromShoulderVecTF = this.getTargetVectorFromShoulderTF(leftArmPointTFList[0], leftArmPointTFList[1])
            const leftWristFromShoulderVecTF = this.getTargetVectorFromShoulderTF(leftArmPointTFList[0], leftArmPointTFList[2])

            // (2) VRM処理
            //// (2-1) 左腕
            ////// (2-1-1) 上腕、下腕、手首のボーンを取得
            const leftUpperArm = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftUpperArm)!
            const leftLowerArm = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftLowerArm)!
            const leftHand = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.LeftHand)!

            ////// (2-1-2) 上腕の処理 (右腕のTFを使う。)
            let elbowTargetPosition = this.getTargetPosition(this.avatar, "Left", rightElbowFromShoulderVecTF)
            if (elbowTargetPosition) {
                this.moveArm(leftUpperArm, leftLowerArm, elbowTargetPosition)
                this.leftUpperArmTarget.position.set(elbowTargetPosition.x, elbowTargetPosition.y, elbowTargetPosition.z);
            }

            ////// (2-1-3) 下腕の処理
            let handTargetPosition = this.getTargetPosition(this.avatar, "Left", rightWristFromShoulderVecTF)
            if (handTargetPosition) {
                this.moveArm(leftLowerArm, leftHand, handTargetPosition)
                this.leftLowerArmTarget.position.set(handTargetPosition.x, handTargetPosition.y, handTargetPosition.z);
            }

            //// (2-2) 右腕
            ////// (2-2-1) 上腕、下腕、手首のボーンを取得
            const rightUpperArm = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightUpperArm)!
            const rightLowerArm = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightLowerArm)!
            const rightHand = this.avatar.humanoid!.getBoneNode(VRMSchema.HumanoidBoneName.RightHand)!

            ////// (2-1-2) 上腕の処理 (左腕のTFを使う。)
            elbowTargetPosition = this.getTargetPosition(this.avatar, "Right", leftElbowFromShoulderVecTF)
            if (elbowTargetPosition) {
                this.moveArm(rightUpperArm, rightLowerArm, elbowTargetPosition)
                this.rightUpperArmTarget.position.set(elbowTargetPosition.x, elbowTargetPosition.y, elbowTargetPosition.z);
            }

            ////// (2-1-3) 下腕の処理
            handTargetPosition = this.getTargetPosition(this.avatar, "Right", leftWristFromShoulderVecTF)
            if (handTargetPosition) {
                this.moveArm(rightLowerArm, rightHand, handTargetPosition)
                this.rightLowerArmTarget.position.set(handTargetPosition.x, handTargetPosition.y, handTargetPosition.z);
            }

        }

        if (this.enableHands && poseRig) {
            if (leftHandRig) {
                this.rigLeftHand(leftHandRig, poseRig)
            }

            if (rightHandRig) {
                this.rigRightHand(rightHandRig, poseRig)
            }
        }
    }


}