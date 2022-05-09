declare module 'three-ik' {
    import { Bone, Object3D, Color } from 'three';

    class IK {
        constructor();
        chains: [];
        isIK: boolean;
        add(chain: IKChain): void;
        solve(): void;
        getRootBone(): Bone;
    }

    class IKBallConstraint {
        constructor(angle: number);
        angle: number;
    }

    class IKChain {
        constructor();
        isIKChain: boolean;
        totalLengths: number;
        base: any | null;
        effector: any | null;
        effectorIndex: any | null;
        chains: Map<number, number>;
        origin: any | null;
        joints: IKJoint[];
        add(joint: IKJoint, config?: any): Object3D;
        connect(chain: IKChain): void;
    }

    class BoneHelper extends Object3D {
        constructor(height: number, boneSize?: number, axesSize?: number);
        height: number;
        boneSize: number;
        axesSize: number;
    }

    interface IKHelperObject {
        color: Color;
        showBones: boolean;
        boneSize: number;
        showAxes: boolean;
        axesSize: number;
        wireframe: boolean;
    }

    class IKHelper extends Object3D {
        constructor(ik: IK, helperObjs: { helperObj?: IKHelperObject });
        ik: IK;
        config: {
            color: Color,
            showBones: boolean,
            showAxes: boolean,
            wireframe: boolean,
            axesSize: number,
            boneSize: number
        };
        get showBones(): boolean;
        set showBones(showBones: boolean);
        get showAxes(): boolean;
        set showAxes(showAxes: boolean);
        get wireframe(): boolean;
        set wireframe(wireframe: boolean);
        axesSize: number;
        boneSize: number;
        get color(): string;
        set color(color: string);
        updateMatrixWorld(force: any): void;
    }

    interface IKJointObject {
        constraints: IKBallConstraint[];
    }

    class IKJoint {
        constructor(bone: Bone, constraint: { constraint?: IKJointObject })
        bone: Bone;
        config: {
            constraints: IKBallConstraint[];
        };
    }
}