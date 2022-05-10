import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { useAppState } from "./provider/AppStateProvider";

import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, CreditProps, VideoInputSelector, VideoInputSelectorProps } from "@dannadori/demo-base";
import * as THREE from "three";

import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRM } from "@pixiv/three-vrm";
let GlobalLoopID = 0;
import { POSE_CONNECTIONS, POSE_LANDMARKS_LEFT, POSE_LANDMARKS_RIGHT } from "@mediapipe/pose";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const LandmarkGrid = window.LandmarkGrid;
console.log("LANDMARK_GRID", LandmarkGrid);

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, threeState, updateDetector, applyMediapipe, setApplyMediapipe, detector, avatar } = useAppState();
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

    const legControlProps: CommonSwitchProps = {
        id: "leg-control-switch",
        title: "leg-control-switch",
        currentValue: avatar ? avatar!.enableLegs : false,
        onChange: (value: boolean) => {
            avatar!.enableLegs = value;
            setLastUpdateTime(new Date().getTime());
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

    const movingAverageWindowSliderProps: CommonSliderProps = {
        id: "moving-average-window-slider",
        title: "moving average window",
        currentValue: detector ? detector!.params.faceMovingAverageWindow : 1,
        max: 100,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            detector!.setMovingAverageWindow(value);
            updateDetector();
        },
        integer: true,
    };

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

    const calcModeSliderProps: CommonSliderProps = {
        id: "calcmode-slider",
        title: "calcmode(debug) ",
        currentValue: detector ? detector!.params.calcMode : 0,
        max: 2,
        min: 0,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            detector!.setCalcMode(value);
            updateDetector();
        },
        integer: true,
    };

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
            <CommonSwitch {...legControlProps}></CommonSwitch>

            <CommonSlider {...movingAverageWindowSliderProps}></CommonSlider>
            <CommonSlider {...affineResizedSliderProps}></CommonSlider>
            <CommonSlider {...tfliteProcessHeightSliderProps}></CommonSlider>
            <CommonSlider {...tfliteProcessWidthSliderProps}></CommonSlider>
            <CommonSlider {...calcModeSliderProps}></CommonSlider>

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
    const { inputSource, threeState, applyMediapipe, setAvatarVRM, detector, avatar } = useAppState();

    const [grid, setGrid] = useState<any>();
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
            // scene.add(new THREE.AxesHelper(5));
            scene.add(new THREE.GridHelper(10, 10));
            //// (1-3)カメラの生成
            const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
            camera.position.set(0, 1.3, -1.5);
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
            // @ts-ignore
            // const controls = new OrbitControls(camera, renderer.domElement);
            // controls.enableDamping = true;
            // controls.dampingFactor = 0.2;

            //// (1-7) ステート設定
            threeState.init({
                scene: scene,
                camera: camera,
                renderer: renderer,
                loader: loader,
                charactrer: vrm,
                light: light,
                // controls: controls,
            });
            // (1-8) avatar 登録
            console.log("three init !!!!!!!!");
            setAvatarVRM(vrm, scene);
        };
        initThree();
    }, []);

    useEffect(() => {
        const landmarkContainer = document.getElementById("grid") as HTMLDivElement;
        const grid = new LandmarkGrid(landmarkContainer, {
            connectionColor: 0xcccccc,
            definedColors: [
                { name: "LEFT", value: 0xffa500 },
                { name: "RIGHT", value: 0x00ffff },
            ],
            range: 2,
            fitToGrid: true,
            labelSuffix: "m",
            landmarkSize: 2,
            numCellsPerAxis: 4,
            showHidden: false,
            centered: true,
            isRotating: false,
            rotationSpeed: 0.1,
        });
        setGrid(grid);
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

        const render = async () => {
            if (!detector) {
                console.log("detector null");
                return;
            }
            if (!avatar) {
                console.log("avatar null");
                return;
            }
            if (!grid) {
                console.log("grid null");
            }
            // console.log("detector and avatar not null");

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
                    // drawPoses(poses, posesMP);

                    if (applyMediapipe) {
                        avatar.updatePose(faceRigMP, poseRigMP, leftHandRigMP, rightHandRigMP);
                        if (posesMP) {
                            grid.updateLandmarks(posesMP.singlePersonKeypoints3DMovingAverage, POSE_CONNECTIONS, [
                                { list: Object.values(POSE_LANDMARKS_LEFT), color: "LEFT" },
                                { list: Object.values(POSE_LANDMARKS_RIGHT), color: "RIGHT" },
                            ]);
                        }
                    } else {
                        avatar.updatePose(faceRig, poseRig, leftHandRig, rightHandRig);
                        // avatar.updatePoseWithRaw(faceRig, poseRig, leftHandRig, rightHandRig, poses);
                        if (poses) {
                            grid.updateLandmarks(poses.singlePersonKeypoints3DMovingAverage, POSE_CONNECTIONS, [
                                { list: Object.values(POSE_LANDMARKS_LEFT), color: "LEFT" },
                                { list: Object.values(POSE_LANDMARKS_RIGHT), color: "RIGHT" },
                            ]);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
            }
            // threeState.controls.update();

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
    }, [inputSourceElement, applyMediapipe, grid, detector, avatar]);

    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", objectFit: "contain", alignItems: "flex-start" }}>
            <div style={{ width: "100%", height: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
                <div style={{ width: "20%", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div
                        style={{ width: "100%", objectFit: "contain", height: "50%" }}
                        ref={(ref) => {
                            ref?.replaceChildren(inputSourceElement);
                        }}
                    ></div>

                    <div id="cont" style={{ backgroundColor: "#99999999", width: "100%", height: "50%" }}>
                        <div id="grid" style={{ backgroundColor: "#99999999", width: "100%", height: "100%" }} />
                    </div>
                </div>

                <div id="avatar" style={{ width: "50%", height: "100%", objectFit: "contain" }}></div>
                <div style={{ width: "30%", marginLeft: "3%", objectFit: "contain" }}>{<Controller></Controller>}</div>
                <div style={{ position: "absolute", top: "2%", left: "2%", background: "#000000", color: "#aabbaa" }} id="info"></div>
            </div>
            <div style={{ width: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
                <canvas id="test" style={{ width: "33%", objectFit: "contain" }}></canvas>
            </div>
        </div>
    );
};

export default App;
