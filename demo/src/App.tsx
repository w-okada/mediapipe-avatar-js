import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { useAppState } from "./provider/AppStateProvider";

import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, CreditProps, VideoInputSelector, VideoInputSelectorProps } from "@dannadori/demo-base";
import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRM } from "@pixiv/three-vrm";
import { poses } from "@dannadori/mediapipe-avatar-js";
let GlobalLoopID = 0;

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, threeState, detector, updateDetector, applyMediapipe, setApplyMediapipe } = useAppState();
    const [_lastUpdateTime, setLastUpdateTime] = useState(0);

    const videoInputSelectorProps: VideoInputSelectorProps = {
        id: "video-input-selector",
        currentValue: inputSourceType || "File",
        onInputSourceTypeChanged: setInputSourceType,
        onInputSourceChanged: setInputSource,
    };

    const useTFLiteSwitchProps: CommonSwitchProps = {
        id: "use-tflite-switch",
        title: "use-tflite-switch",
        currentValue: detector ? detector!.config.useTFLiteWebWorker : false,
        onChange: (value: boolean) => {
            detector?.setUseTFLiteWebWorker(value);
            updateDetector();
        },
    };
    const useMediapipeProps: CommonSwitchProps = {
        id: "use-mediapipe-switch",
        title: "use-mediapipe-switch",
        currentValue: detector ? detector!.config.useMediapipe : false,
        onChange: (value: boolean) => {
            detector?.setUseMediapipe(value);
            updateDetector();
        },
    };

    const applyMediaPipeProps: CommonSwitchProps = {
        id: "apply-mediapipe-switch",
        title: "apply-mediapipe-switch",
        currentValue: applyMediapipe,
        onChange: (value: boolean) => {
            setApplyMediapipe(value);
            updateDetector();
        },
    };

    const useFullbodyCaptureProps: CommonSwitchProps = {
        id: "use-fullbody-capture-switch",
        title: "use-fullbody-capture-switch",
        currentValue: detector ? detector!.config.enableFullBodyCapture : false,
        onChange: (value: boolean) => {
            detector?.setEnableFullbodyCapture(value);
            updateDetector();
        },
    };

    const tfliteProcessWidthSliderProps: CommonSliderProps = {
        id: "tflite-process-width-slider",
        title: "tflite process width",
        currentValue: detector ? detector!.params.TFLiteProcessWidth : 300,
        max: 1024,
        min: 100,
        step: 10,
        width: "30%",
        onChange: (value: number) => {
            detector!.setTFLiteProcessSize(value, detector!.params.TFLiteProcessHeight);
            updateDetector();
        },
        integer: true,
    };
    const tfliteProcessHeightSliderProps: CommonSliderProps = {
        id: "tflite-process-height-slider",
        title: "tflite process height",
        currentValue: detector ? detector!.params.TFLiteProcessHeight : 300,
        max: 1000,
        min: 100,
        step: 10,
        width: "30%",
        onChange: (value: number) => {
            detector!.setTFLiteProcessSize(detector!.params.TFLiteProcessWidth, value);
            updateDetector();
        },
        integer: true,
    };

    // const movingAverageWindowSliderProps: CommonSliderProps = {
    //     id: "moving-average-window-slider",
    //     title: "moving average window",
    //     currentValue: motionDetectorState?.motionDetector ? motionDetectorState!.motionDetector!.params.faceMovingAverageWindow : 3,
    //     max: 100,
    //     min: 1,
    //     step: 1,
    //     width: "30%",
    //     onChange: (value: number) => {
    //         motionDetectorState!.motionDetector!.set
    //         reconfigMotionDetector();
    //     },
    //     integer: true,
    // };

    const affineResizedSliderProps: CommonSliderProps = {
        id: "affine-resized-slider",
        title: "affine resized ",
        currentValue: detector ? detector!.params.TFLiteAffineResizedFactor : 2,
        max: 8,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            detector!.setTFLiteAffineResizedFactor(value);
            updateDetector();
        },
        integer: true,
    };
    // const cropExtentionSliderProps: CommonSliderProps = {
    //     id: "crop-extention-slider",
    //     title: "crop extention",
    //     currentValue: motionDetectorState?.motionDetector ? motionDetectorState!.motionDetector!.params.TFLitePoseCropExt: 1.3,
    //     max: 2,
    //     min: 1,
    //     step: 0.1,
    //     width: "30%",
    //     onChange: (value: number) => {
    //         motionDetectorState!.motionDetector!.set
    //         reconfigMotionDetector();
    //     },
    //     integer: false,
    // };

    const perspectiveCameraXSliderProps: CommonSliderProps = {
        id: "perspective-camera-x-slider",
        title: "perspective-camera-x-slider",
        currentValue: threeState.camera?.position.x || 0,
        max: 3,
        min: -3,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            if (threeState.camera) {
                threeState.camera.position.set(value, threeState.camera?.position.y, threeState.camera?.position.z);
                setLastUpdateTime(new Date().getTime());
            }
        },
        integer: false,
    };
    const perspectiveCameraYSliderProps: CommonSliderProps = {
        id: "perspective-camera-y-slider",
        title: "perspective-camera-y-slider",
        currentValue: threeState.camera?.position.y || 0,
        max: 3,
        min: -3,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            if (threeState.camera) {
                threeState.camera.position.set(threeState.camera.position.x, value, threeState.camera.position.z);
                setLastUpdateTime(new Date().getTime());
            }
        },
        integer: false,
    };
    const perspectiveCameraZSliderProps: CommonSliderProps = {
        id: "perspective-camera-z-slider",
        title: "perspective-camera-z-slider",
        currentValue: threeState.camera?.position.z || 0,
        max: 3,
        min: -3,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            if (threeState.camera) {
                threeState.camera.position.set(threeState.camera.position.x, threeState.camera.position.y, value);
                setLastUpdateTime(new Date().getTime());
            }
        },
        integer: false,
    };

    const [lookAtVector, setLookAtVector] = useState<THREE.Vector3>(new THREE.Vector3(0, 1.3, 0));
    const perspectiveCameraLookAtXSliderProps: CommonSliderProps = {
        id: "perspective-camera-look-at-x-slider",
        title: "perspective-camera-look-at-x-slider",
        currentValue: lookAtVector.x,
        max: 3,
        min: -3,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            if (threeState.camera) {
                lookAtVector.x = value;
                threeState.camera.lookAt(lookAtVector);
                setLookAtVector(lookAtVector);
                setLastUpdateTime(new Date().getTime());
            }
        },
        integer: false,
    };
    const perspectiveCameraLookAtYSliderProps: CommonSliderProps = {
        id: "perspective-camera-look-at-y-slider",
        title: "perspective-camera-look-at-y-slider",
        currentValue: lookAtVector.y,
        max: 3,
        min: -3,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            if (threeState.camera) {
                lookAtVector.y = value;
                threeState.camera.lookAt(lookAtVector);
                setLookAtVector(lookAtVector);
                setLastUpdateTime(new Date().getTime());
            }
        },
        integer: false,
    };
    const perspectiveCameraLookAtZSliderProps: CommonSliderProps = {
        id: "perspective-camera-look-at-z-slider",
        title: "perspective-camera-look-at-z-slider",
        currentValue: lookAtVector.z,
        max: 3,
        min: -3,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            if (threeState.camera) {
                lookAtVector.z = value;
                threeState.camera.lookAt(lookAtVector);
                setLookAtVector(lookAtVector);
                setLastUpdateTime(new Date().getTime());
            }
        },
        integer: false,
    };

    const creditProps: CreditProps = {
        title: "Created by w-okada. FLECT, Co., Ltd.",
        homepage: "https://www.flect.co.jp/",
        github: "https://github.com/w-okada/mediapipe-avatar-js",
        twitter: "https://twitter.com/DannadoriYellow",
        linkedin: "https://www.linkedin.com/in/068a68187/",
        blog: "https://medium.com/@dannadori",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Credit {...creditProps}></Credit>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...useTFLiteSwitchProps}></CommonSwitch>
            <CommonSwitch {...useMediapipeProps}></CommonSwitch>
            <CommonSwitch {...applyMediaPipeProps}></CommonSwitch>
            <CommonSwitch {...useFullbodyCaptureProps}></CommonSwitch>

            <CommonSlider {...affineResizedSliderProps}></CommonSlider>
            <CommonSlider {...tfliteProcessHeightSliderProps}></CommonSlider>
            <CommonSlider {...tfliteProcessWidthSliderProps}></CommonSlider>

            <CommonSlider {...perspectiveCameraXSliderProps}></CommonSlider>
            <CommonSlider {...perspectiveCameraYSliderProps}></CommonSlider>
            <CommonSlider {...perspectiveCameraZSliderProps}></CommonSlider>
            <CommonSlider {...perspectiveCameraLookAtXSliderProps}></CommonSlider>
            <CommonSlider {...perspectiveCameraLookAtYSliderProps}></CommonSlider>
            <CommonSlider {...perspectiveCameraLookAtZSliderProps}></CommonSlider>
        </div>
    );
};

const App = () => {
    const { inputSource, threeState, applyMediapipe, detector, avatar, setAvatarVRM } = useAppState();
    // window.renderer = new THREE.WebGLRenderer();
    // window.renderer.setSize(320, 240);
    // window.renderer.setPixelRatio(window.devicePixelRatio);

    // (X) InputSource設定
    const inputSourceElement = useMemo(() => {
        let elem: HTMLVideoElement | HTMLImageElement;
        if (typeof inputSource === "string") {
            const sourceType = getDataTypeOfDataURL(inputSource);
            if (sourceType === DataTypesOfDataURL.video) {
                elem = document.createElement("video");
                elem.controls = true;
                elem.autoplay = true;
                elem.loop = true;
                elem.src = inputSource;
            } else {
                elem = document.createElement("img");
                elem.src = inputSource;
            }
        } else {
            elem = document.createElement("video");
            elem.autoplay = true;
            elem.srcObject = inputSource;
        }
        elem.style.objectFit = "contain";
        elem.style.width = "100%";
        elem.style.height = "100%";
        return elem;
    }, [inputSource]);

    // (A) 初期化処理
    //// (1) three の初期化
    useEffect(() => {
        const initThree = async () => {
            //// (1-1) Canvas取得
            const canvas = document.getElementById("avatar") as HTMLCanvasElement;

            //// (1-2) シーン設定
            const scene = new THREE.Scene();
            scene.add(new THREE.AxesHelper(5));
            scene.add(new THREE.GridHelper(10, 10));
            //// (1-3)カメラの生成
            const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
            camera.position.set(0, 0.7, -3);
            camera.rotation.set(0, Math.PI, 0);

            //// (1-4)レンダラーの生成
            const renderer = new THREE.WebGLRenderer();
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setClearColor(0x7fbfff, 1.0);
            canvas.appendChild(renderer.domElement);

            //// (1-5) アバター読み込み
            const loader = new GLTFLoader();

            const vrmPath = "./test.vrm";
            // const vrmPath = "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981";
            // const vrmPath = "./kame.vrm";
            // const vrmPath = "./AliciaSolid.vrm";

            const p = new Promise<VRM>((resolve, _reject) => {
                loader.load(vrmPath, async (gltf: GLTF) => {
                    const vrm = await VRM.from(gltf);
                    resolve(vrm);
                });
            });
            const vrm = await p;
            scene.add(vrm.scene);

            //// (1-6) light設定
            const light = new THREE.DirectionalLight(0xffffff);
            light.position.set(-1, 1, -1).normalize();
            scene.add(light);

            //// (1-7) ステート設定
            console.log("three init");
            threeState.init({
                scene: scene,
                camera: camera,
                renderer: renderer,
                loader: loader,
                charactrer: vrm,
                light: light,
            });
            //// (1-8) avatar 登録
            setAvatarVRM(vrm);
        };
        initThree();
    }, []);

    // (B) Processing
    //// (1) Main
    useEffect(() => {
        console.log("Renderer Initialized");
        let renderRequestId: number;
        const LOOP_ID = performance.now();
        GlobalLoopID = LOOP_ID;

        // const dst = document.getElementById("output") as HTMLCanvasElement;
        const snap = document.createElement("canvas");
        const info = document.getElementById("info") as HTMLDivElement;

        const perfs: number[] = [];
        const avr = (perfs: number[]) => {
            const sum = perfs.reduce((prev, cur) => {
                return prev + cur;
            }, 0);
            return (sum / perfs.length).toFixed(3);
        };

        const drawPoses = (_poses: poses.Pose[] | null, _posesMP: poses.Pose[] | null) => {
            // const test = document.getElementById("test") as HTMLCanvasElement;
            // test.width = 300;
            // test.height = 300;
            // const testCtx = test.getContext("2d")!;
            // if (poses && poses.length > 0) {
            //     testCtx.fillStyle = "#ff0000";
            //     poses[0].keypoints.forEach((x) => {
            //         testCtx.fillRect(x.x * test.width, x.y * test.height, 5, 5);
            //     });
            // }
            // if (posesMP && posesMP.length > 0) {
            //     testCtx.fillStyle = "#00ff00";
            //     posesMP[0].keypoints.forEach((x) => {
            //         testCtx.fillRect(x.x, x.y, 5, 5);
            //     });
            // }
        };

        const render = async () => {
            if (!detector) {
                console.log("detector null");
                return;
            }
            if (!avatar) {
                console.log("avatar null");
                return;
            }
            console.log("detector and avatar not null");

            const start = performance.now();
            [snap].forEach((x) => {
                const width = inputSourceElement instanceof HTMLVideoElement ? inputSourceElement.videoWidth : inputSourceElement.naturalWidth;
                const height = inputSourceElement instanceof HTMLVideoElement ? inputSourceElement.videoHeight : inputSourceElement.naturalHeight;
                if (x.width != width || x.height != height) {
                    x.width = width;
                    x.height = height;
                }
            });
            const snapCtx = snap.getContext("2d")!;
            snapCtx.drawImage(inputSourceElement, 0, 0, snap.width, snap.height);
            try {
                if (snap.width > 0 && snap.height > 0) {
                    const { poses, posesMP, faceRig, leftHandRig, rightHandRig, poseRig, faceRigMP, leftHandRigMP, rightHandRigMP, poseRigMP } = await detector.predict(snap);
                    drawPoses(poses, posesMP);

                    if (applyMediapipe) {
                        avatar.updatePose(faceRigMP, poseRigMP, leftHandRigMP, rightHandRigMP);
                    } else {
                        avatar.updatePose(faceRig, poseRig, leftHandRig, rightHandRig);
                    }
                }
            } catch (error) {
                console.log(error);
            }

            threeState.renderer!.render(threeState.scene!, threeState.camera!);
            if (GlobalLoopID === LOOP_ID) {
                renderRequestId = requestAnimationFrame(render);
            }
            const end = performance.now();
            if (perfs.length > 100) {
                perfs.shift();
            }
            perfs.push(end - start);
            const avrElapsedTime = avr(perfs);
            info.innerText = `time:${avrElapsedTime}ms`;
        };
        render();
        return () => {
            console.log("CANCEL", renderRequestId);
            cancelAnimationFrame(renderRequestId);
        };
    }, [inputSourceElement, detector, avatar, applyMediapipe]);

    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", objectFit: "contain", alignItems: "flex-start" }}>
            <div style={{ width: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
                <div
                    style={{ width: "20%", objectFit: "contain" }}
                    ref={(ref) => {
                        ref?.replaceChildren(inputSourceElement);
                    }}
                ></div>
                <div id="avatar" style={{ width: "50%", height: "100%", objectFit: "contain" }}></div>
                <div style={{ width: "30%", marginLeft: "3%", objectFit: "contain" }}>
                    <Controller></Controller>
                </div>
                <div style={{ position: "absolute", top: "2%", left: "2%", background: "#000000", color: "#aabbaa" }} id="info"></div>
            </div>
            <div style={{ width: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
                <canvas id="test" style={{ width: "33%", objectFit: "contain" }}></canvas>
                <canvas id="mask" style={{ width: "33%", objectFit: "contain" }}></canvas>
            </div>
        </div>
    );
};

export default App;