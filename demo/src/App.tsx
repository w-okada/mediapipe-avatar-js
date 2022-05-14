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
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const LandmarkGrid = window.LandmarkGrid;
console.log("LANDMARK_GRID", LandmarkGrid);

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, updateDetector, detector, avatar, useCustomArmRig, setUseCustomArmRig } = useAppState();
    const [_lastUpdateTime, setLastUpdateTime] = useState(0);

    const videoInputSelectorProps: VideoInputSelectorProps = {
        id: "video-input-selector",
        currentValue: inputSourceType || "File",
        onInputSourceTypeChanged: setInputSourceType,
        onInputSourceChanged: setInputSource,
    };

    const useFullbodyCaptureProps: CommonSwitchProps = {
        id: "use-fullbody-capture-switch",
        title: "use-fullbody-capture-switch",
        currentValue: detector ? detector!.enableFullBodyCapture : false,
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

    const handControlProps: CommonSwitchProps = {
        id: "hand-control-switch",
        title: "hand-control-switch",
        currentValue: avatar ? avatar!.enableHands : false,
        onChange: (value: boolean) => {
            avatar!.enableHands = value;
            setLastUpdateTime(new Date().getTime());
        },
    };

    const tfliteProcessWidthSliderProps: CommonSliderProps = {
        id: "tflite-process-width-slider",
        title: "tflite process width",
        currentValue: detector ? detector!.faceParams.faceProcessWidth : 300,
        max: 1024,
        min: 100,
        step: 10,
        width: "30%",
        onChange: (value: number) => {
            detector!.handParams.handProcessWidth = value;
            detector!.faceParams.faceProcessWidth = value;
            detector!.poseParams.poseProcessWidth = value;
            updateDetector();
        },
        integer: true,
    };
    const tfliteProcessHeightSliderProps: CommonSliderProps = {
        id: "tflite-process-height-slider",
        title: "tflite process height",
        currentValue: detector ? detector!.faceParams.faceProcessHeight : 300,
        max: 1000,
        min: 100,
        step: 10,
        width: "30%",
        onChange: (value: number) => {
            detector!.handParams.handProcessHeight = value;
            detector!.faceParams.faceProcessHeight = value;
            detector!.poseParams.poseProcessHeight = value;
            updateDetector();
        },
        integer: true,
    };

    const movingAverageWindowSliderProps: CommonSliderProps = {
        id: "moving-average-window-slider",
        title: "moving average window",
        currentValue: detector ? detector!.faceParams.faceMovingAverageWindow : 1,
        max: 100,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            detector!.faceParams.faceMovingAverageWindow = value;
            detector!.poseParams.poseMovingAverageWindow = value;
            updateDetector();
        },
        integer: true,
    };

    const affineResizedSliderProps: CommonSliderProps = {
        id: "affine-resized-slider",
        title: "affine resized ",
        currentValue: detector ? detector!.handParams.handAffineResizedFactor : 2,
        max: 8,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            detector!.handParams.handAffineResizedFactor = value;
            detector!.poseParams.poseAffineResizedFactor = value;
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
        currentValue: detector ? detector!.poseParams.poseCropExt : 0,
        max: 2,
        min: 0,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            detector!.poseParams.poseCropExt = value;
            updateDetector();
        },
        integer: true,
    };

    const targetVisibleSwitchProps: CommonSwitchProps = {
        id: "target-visible-switch",
        title: "target-visible-switch",
        currentValue: avatar ? avatar.isTargetVisible : false,
        onChange: (value: boolean) => {
            avatar!.isTargetVisible = value;
            updateDetector();
        },
    };

    const useCustomArmRigSwitchProps: CommonSwitchProps = {
        id: "use-custom-arm-rig-switch",
        title: "use-custom-arm-rig-switch",
        currentValue: useCustomArmRig,
        onChange: (value: boolean) => {
            setUseCustomArmRig(value);
        },
    };

    const useSlerpSwitchProps: CommonSwitchProps = {
        id: "use-slerp-switch",
        title: "use-slerp-switch",
        currentValue: avatar ? avatar.useSlerp : false,
        onChange: (value: boolean) => {
            avatar!.useSlerp = value;
            setLastUpdateTime(new Date().getTime());
        },
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

            <CommonSwitch {...useFullbodyCaptureProps}></CommonSwitch>
            <CommonSwitch {...legControlProps}></CommonSwitch>
            <CommonSwitch {...handControlProps}></CommonSwitch>

            <CommonSlider {...movingAverageWindowSliderProps}></CommonSlider>
            <CommonSlider {...affineResizedSliderProps}></CommonSlider>
            <CommonSlider {...tfliteProcessHeightSliderProps}></CommonSlider>
            <CommonSlider {...tfliteProcessWidthSliderProps}></CommonSlider>
            <CommonSlider {...calcModeSliderProps}></CommonSlider>
            <CommonSwitch {...targetVisibleSwitchProps}></CommonSwitch>
            <CommonSwitch {...useCustomArmRigSwitchProps}></CommonSwitch>
            <CommonSwitch {...useSlerpSwitchProps}></CommonSwitch>
        </div>
    );
};

const App = () => {
    const { inputSource, threeState, applyMediapipe, setAvatarVRM, detector, avatar, useCustomArmRig } = useAppState();

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

            // const vrmPath = "./test.vrm";
            const vrmPath = "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981";
            // const vrmPath = "https://yeemachine.github.io/k2021/vrm/Ashtra.vrm";

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
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.target.x = 0;
            controls.target.y = 1.3;
            controls.target.x = 0;
            controls.update();
            //// (1-7) ステート設定
            threeState.init({
                scene: scene,
                camera: camera,
                renderer: renderer,
                loader: loader,
                charactrer: vrm,
                light: light,
                controls: controls,
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
                    const { poses, faceRig, leftHandRig, rightHandRig, poseRig } = await detector.predict(snap);
                    // drawPoses(poses, posesMP);
                    if (useCustomArmRig) {
                        avatar.updatePoseWithRaw(faceRig, poseRig, leftHandRig, rightHandRig, poses);
                    } else {
                        avatar.updatePose(faceRig, poseRig, leftHandRig, rightHandRig);
                    }
                    if (poses) {
                        grid.updateLandmarks(poses.singlePersonKeypoints3DMovingAverage, POSE_CONNECTIONS, [
                            { list: Object.values(POSE_LANDMARKS_LEFT), color: "LEFT" },
                            { list: Object.values(POSE_LANDMARKS_RIGHT), color: "RIGHT" },
                        ]);
                    }
                }
            } catch (error) {
                console.log(error);
            }
            // threeState.controls.update();
            // console.log(threeState.charactrer?.springBoneManager?.springBoneGroupList);
            // threeState.charactrer?.springBoneManager?.springBoneGroupList.forEach((element) => {
            //     element.forEach((node) => {
            //         node.update(0.01);
            //     });
            // });
            threeState.charactrer?.springBoneManager?.lateUpdate(0.1);

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
    }, [inputSourceElement, applyMediapipe, grid, detector, avatar, useCustomArmRig]);

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
