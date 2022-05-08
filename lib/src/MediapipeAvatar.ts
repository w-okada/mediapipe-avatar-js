
import { VRM, VRMSchema } from "@pixiv/three-vrm";
import { Face, Side, TFace, THand, TPose, Utils, Vector } from "./kalido";
import * as THREE from "three";

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

    constructor(avatar: VRM, offset: AvatarOffset = { x: 0, y: 0, z: 0 }) {
        this.avatar = avatar
        this.offset = offset
    }
    setOffset(offset: AvatarOffset) {
        this.offset = offset
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


}