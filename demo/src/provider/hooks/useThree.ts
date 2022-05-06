import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRM } from "@pixiv/three-vrm";
import { useState } from "react";

export type UseThreeState = {
    scene?: THREE.Scene,
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    loader?: GLTFLoader;
    charactrer?: VRM;
    light?: THREE.DirectionalLight

    /// function
};
export type UseThreeStateAndMethods = UseThreeState & {
    init: (props: ThreeStateInitProps) => void
}
export type ThreeStateInitProps = {
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    loader: GLTFLoader;
    charactrer: VRM;
    light: THREE.DirectionalLight
}
export const useThree = (): UseThreeStateAndMethods => {
    const [threeState, setThreeState] = useState<UseThreeState | null>(null)
    const init = (props: ThreeStateInitProps) => {
        setThreeState({ ...props })
    }

    return {
        ...threeState,
        init,
    }
};
