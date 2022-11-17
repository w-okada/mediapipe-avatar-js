
import { VRM, VRMExpressionPresetName, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Face, Side, TFace, THand, TPose, Utils, Vector } from "./kalido";
import { PosePredictionEx } from "@dannadori/mediapipe-mix2-worker-js"

import * as THREE from "three";
export type AvatarOffset = {
    x: number,
    y: number,
    z: number
}

//////////////////////////// 
// updatePose と　updatePoseWithRawの違い。
// updatePoseはKalidoKitサンプルを参考に作成している。KalidoKitの出力をそのまま使う。
// updatePoseWithRawは一部カスタマイズを加えている。
// (動機) updatePoseだと、関節の制限により一部の動きが再現ができなかった。
//  MediaPipeからの出力からx,y,z座標を幾何学的に計算して、クォータニオンを用いて処理を試みている。
// 現時点では、可動域は広がったが、腕がねじれてしまう問題がでている。（3D素人なので今のところ限界。勉強中。）
///////////////////////////


export class MediapipeAvator {

    avatar!: VRM;
    scene!: THREE.Scene
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
    INVISIBLE = "rgba(0, 0, 0, 0)"

    leftLowerArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.LEFT_LOWER_ARM_TARGET_COLOR }));
    leftUpperArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.LEFT_UPPER_ARM_TARGET_COLOR }));

    rightLowerArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.RIGHT_LOWER_ARM_TARGET_COLOR }));
    rightUpperArmTarget = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: this.RIGHT_UPPER_ARM_TARGET_COLOR }));
    constructor(avatar?: VRM, scene?: THREE.Scene, offset: AvatarOffset = { x: 0, y: 0, z: 0 }) {
        if (avatar) {
            this.avatar = avatar
        }
        if (scene) {
            this.scene = scene
            scene.add(this.leftLowerArmTarget)
            scene.add(this.leftUpperArmTarget)
            scene.add(this.rightLowerArmTarget)
            scene.add(this.rightUpperArmTarget)
        }
        this.offset = offset
    }
    initialize = (avatar: VRM, scene: THREE.Scene, offset: AvatarOffset = { x: 0, y: 0, z: 0 }) => {
        this.avatar = avatar
        this.scene = scene
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
            this.scene.add(this.leftUpperArmTarget)
            this.scene.add(this.leftLowerArmTarget)
            this.scene.add(this.rightUpperArmTarget)
            this.scene.add(this.rightLowerArmTarget)
        } else {
            this.scene.remove(this.leftUpperArmTarget)
            this.scene.remove(this.leftLowerArmTarget)
            this.scene.remove(this.rightUpperArmTarget)
            this.scene.remove(this.rightLowerArmTarget)
        }
        this._isTargetVisible = val
    }

    useSlerp: boolean = false

    // Animate Rotation Helper function
    rigRotation = (name: VRMHumanBoneName, rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // const Part = this.avatar.humanoid!.getNormalizedBoneNode(name);
        const Part = this.avatar.humanoid!.getRawBoneNode(name);

        if (!Part) {
            return;
        }

        const euler = new THREE.Euler(rotation.x * dampener, rotation.y * dampener, rotation.z * dampener);
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
    };
    rigPosition = (name: VRMHumanBoneName, position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // const Part = this.avatar.humanoid!.getNormalizedBoneNode(name);
        const Part = this.avatar.humanoid!.getRawBoneNode(name);
        if (!Part) {
            return;
        }
        const vector = new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener);
        Part.position.lerp(vector, lerpAmount); // interpolate
    };

    rigFace = (_riggedFace: TFace) => {
        const riggedFace = JSON.parse(JSON.stringify(_riggedFace));
        this.rigRotation(VRMHumanBoneName.Neck, riggedFace.head, 0.7);

        // Blendshapes and Preset Name Schema
        const expressionManager = this.avatar.expressionManager!;
        const PresetName = VRMExpressionPresetName;
        // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
        // for VRM, 1 is closed, 0 is open.

        riggedFace.eye.l = Vector.lerp(Utils.clamp(1 - riggedFace.eye.l, 0, 1), expressionManager.getValue(PresetName.Blink)!, 0.5);
        riggedFace.eye.r = Vector.lerp(Utils.clamp(1 - riggedFace.eye.r, 0, 1), expressionManager.getValue(PresetName.Blink)!, 0.5);
        riggedFace.eye = Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y);

        expressionManager.setValue(PresetName.Blink, riggedFace.eye.l);

        // Interpolate and set mouth blendshapes
        expressionManager.setValue(PresetName.Ih, Vector.lerp(riggedFace.mouth.shape.I, expressionManager.getValue(PresetName.Ih), 0.5));
        expressionManager.setValue(PresetName.Aa, Vector.lerp(riggedFace.mouth.shape.A, expressionManager.getValue(PresetName.Aa), 0.5));
        expressionManager.setValue(PresetName.Ee, Vector.lerp(riggedFace.mouth.shape.E, expressionManager.getValue(PresetName.Ee), 0.5));
        expressionManager.setValue(PresetName.Oh, Vector.lerp(riggedFace.mouth.shape.O, expressionManager.getValue(PresetName.Oh), 0.5));
        expressionManager.setValue(PresetName.Ou, Vector.lerp(riggedFace.mouth.shape.U, expressionManager.getValue(PresetName.Ou), 0.5));
        //PUPILS
        //interpolate pupil and keep a copy of the value
        const lookTarget = new THREE.Euler(Vector.lerp(this.oldLookTarget.x, riggedFace.pupil.y, 0.4), Vector.lerp(this.oldLookTarget.y, riggedFace.pupil.x, 0.4), 0, "XYZ");
        this.oldLookTarget.copy(lookTarget);
        this.avatar.lookAt!.applier!.applyYawPitch(lookTarget.y, lookTarget.x);

        this.avatar.expressionManager!.update();
    };


    rigUpperBody = (riggedPose: TPose) => {
        this.rigRotation(VRMHumanBoneName.Hips, riggedPose.Hips.rotation, 0.7);
        this.rigPosition(
            VRMHumanBoneName.Hips,
            {
                x: riggedPose.Hips.position.x, // Reverse direction
                y: riggedPose.Hips.position.y + 1, // Add a bit of height
                z: -riggedPose.Hips.position.z, // Reverse direction
            },
            1,
            0.07
        );

        this.rigRotation(VRMHumanBoneName.Chest, riggedPose.Spine, 0.25, 0.3);
        this.rigRotation(VRMHumanBoneName.Spine, riggedPose.Spine, 0.45, 0.3);

        this.rigRotation(VRMHumanBoneName.RightUpperArm, riggedPose.RightUpperArm, 1, 0.3);
        this.rigRotation(VRMHumanBoneName.RightLowerArm, riggedPose.RightLowerArm, 1, 0.3);
        this.rigRotation(VRMHumanBoneName.LeftUpperArm, riggedPose.LeftUpperArm, 1, 0.3);
        this.rigRotation(VRMHumanBoneName.LeftLowerArm, riggedPose.LeftLowerArm, 1, 0.3);

    };

    rigLegs = (riggedPose: TPose) => {
        this.rigRotation(VRMHumanBoneName.LeftUpperLeg, riggedPose.LeftUpperLeg, 1, 0.3);
        this.rigRotation(VRMHumanBoneName.LeftLowerLeg, riggedPose.LeftLowerLeg, 1, 0.3);
        this.rigRotation(VRMHumanBoneName.RightUpperLeg, riggedPose.RightUpperLeg, 1, 0.3);
        this.rigRotation(VRMHumanBoneName.RightLowerLeg, riggedPose.RightLowerLeg, 1, 0.3);

    }

    rigLeftHand = (riggedHand: THand<"Left">, poseRig: TPose) => {
        this.rigRotation(VRMHumanBoneName.LeftHand, {
            // Combine pose rotation Z and hand rotation X Y
            z: poseRig.LeftHand.z,
            y: riggedHand.LeftWrist.y,
            x: riggedHand.LeftWrist.x,

            // z: poseRig.RightHand.z,
            // y: riggedHand.LeftWrist.y,
            // x: riggedHand.LeftWrist.x,

        });
        this.rigRotation(VRMHumanBoneName.LeftRingProximal, riggedHand.LeftRingProximal);
        this.rigRotation(VRMHumanBoneName.LeftRingIntermediate, riggedHand.LeftRingIntermediate);
        this.rigRotation(VRMHumanBoneName.LeftRingDistal, riggedHand.LeftRingDistal);
        this.rigRotation(VRMHumanBoneName.LeftIndexProximal, riggedHand.LeftIndexProximal);
        this.rigRotation(VRMHumanBoneName.LeftIndexIntermediate, riggedHand.LeftIndexIntermediate);
        this.rigRotation(VRMHumanBoneName.LeftIndexDistal, riggedHand.LeftIndexDistal);
        this.rigRotation(VRMHumanBoneName.LeftMiddleProximal, riggedHand.LeftMiddleProximal);
        this.rigRotation(VRMHumanBoneName.LeftMiddleIntermediate, riggedHand.LeftMiddleIntermediate);
        this.rigRotation(VRMHumanBoneName.LeftMiddleDistal, riggedHand.LeftMiddleDistal);
        this.rigRotation(VRMHumanBoneName.LeftThumbMetacarpal, riggedHand.LeftThumbProximal);

        // Three-VRM 1.0でマップが変わっているようだ。
        // /**
        //  * A map from old thumb bone names to new thumb bone names
        //  */
        // const thumbBoneNameMap: { [key: string]: V1VRMSchema.HumanoidHumanBoneName | undefined } = {
        //     leftThumbProximal: 'leftThumbMetacarpal',
        //     leftThumbIntermediate: 'leftThumbProximal',
        //     rightThumbProximal: 'rightThumbMetacarpal',
        //     rightThumbIntermediate: 'rightThumbProximal',
        //   };
        this.rigRotation(VRMHumanBoneName.LeftThumbProximal, riggedHand.LeftThumbIntermediate);
        this.rigRotation(VRMHumanBoneName.LeftThumbDistal, riggedHand.LeftThumbDistal);
        this.rigRotation(VRMHumanBoneName.LeftLittleProximal, riggedHand.LeftLittleProximal);
        this.rigRotation(VRMHumanBoneName.LeftLittleIntermediate, riggedHand.LeftLittleIntermediate);
        this.rigRotation(VRMHumanBoneName.LeftLittleDistal, riggedHand.LeftLittleDistal);
    }

    rigRightHand = (riggedHand: THand<"Right">, poseRig: TPose) => {
        this.rigRotation(VRMHumanBoneName.RightHand, {
            // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
            z: poseRig.RightHand.z,
            y: riggedHand.RightWrist.y,
            x: riggedHand.RightWrist.x,

            // z: poseRig.LeftHand.z,
            // y: riggedHand.RightWrist.y,
            // x: riggedHand.RightWrist.x,

        });
        this.rigRotation(VRMHumanBoneName.RightRingProximal, riggedHand.RightRingProximal);
        this.rigRotation(VRMHumanBoneName.RightRingIntermediate, riggedHand.RightRingIntermediate);
        this.rigRotation(VRMHumanBoneName.RightRingDistal, riggedHand.RightRingDistal);
        this.rigRotation(VRMHumanBoneName.RightIndexProximal, riggedHand.RightIndexProximal);
        this.rigRotation(VRMHumanBoneName.RightIndexIntermediate, riggedHand.RightIndexIntermediate);
        this.rigRotation(VRMHumanBoneName.RightIndexDistal, riggedHand.RightIndexDistal);
        this.rigRotation(VRMHumanBoneName.RightMiddleProximal, riggedHand.RightMiddleProximal);
        this.rigRotation(VRMHumanBoneName.RightMiddleIntermediate, riggedHand.RightMiddleIntermediate);
        this.rigRotation(VRMHumanBoneName.RightMiddleDistal, riggedHand.RightMiddleDistal);
        // THREE-VRM 1.0でのマップ変更(leftを参照)
        this.rigRotation(VRMHumanBoneName.RightThumbMetacarpal, riggedHand.RightThumbProximal);
        this.rigRotation(VRMHumanBoneName.RightThumbProximal, riggedHand.RightThumbIntermediate);
        this.rigRotation(VRMHumanBoneName.RightThumbDistal, riggedHand.RightThumbDistal);
        this.rigRotation(VRMHumanBoneName.RightLittleProximal, riggedHand.RightLittleProximal);
        this.rigRotation(VRMHumanBoneName.RightLittleIntermediate, riggedHand.RightLittleIntermediate);
        this.rigRotation(VRMHumanBoneName.RightLittleDistal, riggedHand.RightLittleDistal);

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
    // updatePoseは上までで完結している。
    // 以下はupdatePoseWithRawの処理
    ///////////////////////////////////////////////////////////////////////////////////
    rigUpperShaft = (riggedPose: TPose) => {
        this.rigRotation(VRMHumanBoneName.Hips, riggedPose.Hips.rotation, 0.7);
        this.rigPosition(
            VRMHumanBoneName.Hips,
            {
                x: riggedPose.Hips.position.x, // Reverse direction
                y: riggedPose.Hips.position.y + 1, // Add a bit of height
                z: -riggedPose.Hips.position.z, // Reverse direction
            },
            1,
            0.07
        );

        this.rigRotation(VRMHumanBoneName.Chest, riggedPose.Spine, 0.25, 0.3);
        this.rigRotation(VRMHumanBoneName.Spine, riggedPose.Spine, 0.45, 0.3);
    };

    getArmPointTFList = (posePrediction: PosePredictionEx, shoulder: number, elbow: number, wrist: number) => {
        const keypoints = posePrediction.singlePersonKeypoints3DMovingAverage!
        return [shoulder, elbow, wrist].map(ind => {
            return new THREE.Vector4(keypoints[ind].x, keypoints[ind].y, keypoints[ind].z, keypoints[ind].score)
        })
    }

    getTargetVectorFromShoulderTF = (shoulderTF: THREE.Vector4, targetTF: THREE.Vector4) => {
        const vectorToTarget = targetTF.clone().sub(shoulderTF);
        return new THREE.Vector3(vectorToTarget.x, -1 * vectorToTarget.y, 1 * vectorToTarget.z) // x, yのスケールがおかしいので調整
        // return new THREE.Vector3(vectorToTarget.x / 2, -1 * vectorToTarget.y / 2, 1 * vectorToTarget.z) // x, yのスケールがおかしいので調整
    }

    getTargetPosition = (avatar: VRM, side: "Left" | "Right", vector: THREE.Vector3) => {
        let VRMShoulder
        if (side == "Left") {
            VRMShoulder = avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.LeftShoulder)
        } else {
            VRMShoulder = avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.RightShoulder)
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


    getTargetPosition2 = (avatar: VRM, _side: "Left" | "Right", vector: THREE.Vector3) => {

        const VRMLeftShoulder = avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.LeftShoulder)
        const VRMRightShoulder = avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.RightShoulder)

        if (!VRMLeftShoulder || !VRMRightShoulder) {
            return null
        }

        const VRMLeftShoulderWorldPosition = new THREE.Vector3();
        VRMLeftShoulder.getWorldPosition(VRMLeftShoulderWorldPosition);
        const VRMRightShoulderWorldPosition = new THREE.Vector3();
        VRMRightShoulder.getWorldPosition(VRMRightShoulderWorldPosition);
        const VRMCenterOfTheShoulders = VRMLeftShoulderWorldPosition.add(VRMRightShoulderWorldPosition).divideScalar(2)

        const VRMCenterOfTheShoulderLocalPosition = VRMLeftShoulder.worldToLocal(VRMCenterOfTheShoulders.clone());

        const targetLocalPosition = VRMCenterOfTheShoulderLocalPosition.clone().add(vector);
        const targetWorldPosition = VRMLeftShoulder.localToWorld(targetLocalPosition.clone());
        return targetWorldPosition
    }


    moveArm = (joint: THREE.Object3D, effecter: THREE.Object3D, target: THREE.Vector3, slerp: boolean) => {
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

        const result = joint.clone();
        result.quaternion.multiply(_quarternion)

        if (slerp) {
            joint.quaternion.slerp(_quarternion, 0.3);
        } else {
            joint.quaternion.multiply(_quarternion);
        }
        return result
    }

    updatePoseWithRawInternal2 = (posePrediction: PosePredictionEx) => {

        // (1) TF処理
        // TFの結果を用いて、方から肘、手首までのベクトルを算出
        // 左右のインデックスはMediapipeのドキュメントの名称をベースに設定。ここではフリップは考慮しない。
        // https://google.github.io/mediapipe/solutions/pose.html
        //// (1-1) 型の間の中点
        const rightArmPointTFList = this.getArmPointTFList(posePrediction, 12, 14, 16)
        const leftArmPointTFList = this.getArmPointTFList(posePrediction, 11, 13, 15)
        const centerOftheShoulder = rightArmPointTFList[0].add(leftArmPointTFList[0]).divideScalar(2)
        //// (1-2) 右腕
        const rightElbowFromShoulderVecTF = this.getTargetVectorFromShoulderTF(centerOftheShoulder, rightArmPointTFList[1])
        const rightWristFromShoulderVecTF = this.getTargetVectorFromShoulderTF(centerOftheShoulder, rightArmPointTFList[2])

        //// (1-3) 左腕
        const leftElbowFromShoulderVecTF = this.getTargetVectorFromShoulderTF(centerOftheShoulder, leftArmPointTFList[1])
        const leftWristFromShoulderVecTF = this.getTargetVectorFromShoulderTF(centerOftheShoulder, leftArmPointTFList[2])

        // (2) VRM処理
        //// (2-1) 左腕
        ////// (2-1-1) 上腕、下腕、手首のボーンを取得
        const leftUpperArm = this.avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.LeftUpperArm)!
        const leftLowerArm = this.avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.LeftLowerArm)!
        const leftHand = this.avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.LeftHand)!

        ////// (2-1-2) 上腕の処理 (右腕のTFを使う。)
        let elbowTargetPosition = this.getTargetPosition2(this.avatar, "Left", rightElbowFromShoulderVecTF)
        if (elbowTargetPosition) {
            this.moveArm(leftUpperArm, leftLowerArm, elbowTargetPosition, this.useSlerp)
            this.leftUpperArmTarget.position.set(elbowTargetPosition.x, elbowTargetPosition.y, elbowTargetPosition.z);
        }

        ////// (2-1-3) 下腕の処理
        let handTargetPosition = this.getTargetPosition2(this.avatar, "Left", rightWristFromShoulderVecTF)
        if (handTargetPosition) {
            this.moveArm(leftLowerArm, leftHand, handTargetPosition, this.useSlerp)
            this.leftLowerArmTarget.position.set(handTargetPosition.x, handTargetPosition.y, handTargetPosition.z);
        }

        //// (2-2) 右腕
        ////// (2-2-1) 上腕、下腕、手首のボーンを取得
        const rightUpperArm = this.avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.RightUpperArm)!
        const rightLowerArm = this.avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.RightLowerArm)!
        const rightHand = this.avatar.humanoid!.getRawBoneNode(VRMHumanBoneName.RightHand)!
        ////// (2-1-2) 上腕の処理 (左腕のTFを使う。)
        elbowTargetPosition = this.getTargetPosition(this.avatar, "Right", leftElbowFromShoulderVecTF)
        // let result
        if (elbowTargetPosition) {
            // result = this.moveArm(rightUpperArm, rightLowerArm, elbowTargetPosition, true)
            this.moveArm(rightUpperArm, rightLowerArm, elbowTargetPosition, this.useSlerp)
            this.rightUpperArmTarget.position.set(elbowTargetPosition.x, elbowTargetPosition.y, elbowTargetPosition.z);
        }

        ////// (2-1-3) 下腕の処理
        handTargetPosition = this.getTargetPosition(this.avatar, "Right", leftWristFromShoulderVecTF)
        if (handTargetPosition) {
            // const futureLowerArm = result.children.filter(x => { return x.type == "Bone" })
            // const futureHand = futureLowerArm[0].children.filter(x => { return x.type == "Bone" })
            // console.log("FUTER", futureLowerArm, futureHand, result.children)
            this.moveArm(rightLowerArm, rightHand, handTargetPosition, this.useSlerp)
            // this.moveArm(futureLowerArm[0], futureHand[0], handTargetPosition, true)
            this.rightLowerArmTarget.position.set(handTargetPosition.x, handTargetPosition.y, handTargetPosition.z);
        }



    }
    updatePoseWithRaw = (faceRig: TFace | null, poseRig: TPose | null, leftHandRig: THand<Side> | null, rightHandRig: THand<Side> | null, poses: PosePredictionEx | null) => {
        if (this.enableFace && faceRig) {
            this.rigFace(faceRig);
        }
        if (this.enableUpperBody && poseRig) {
            this.rigUpperShaft(poseRig)
        }

        if (poses && poses.singlePersonKeypoints3DMovingAverage) {
            // console.log("POSE3D:", poses.singlePersonKeypoints3DMovingAverage)
            this.updatePoseWithRawInternal2(poses)
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