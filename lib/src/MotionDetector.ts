
import * as faces from "@dannadori/face-landmark-detection-worker-js/dist/face-landmark-detection-workershort_with_attention";
import * as hands from "@dannadori/hand-pose-detection-worker-js/dist/hand-pose-detection-workerlite";
import * as poses from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workerlite"
import * as kalido from "./kalido"
import { MotionDetectorConfig, MotionDetectorParams } from "./MotionDetectorConst";
export { poses }

const initialConfig: MotionDetectorConfig = {
    useMediapipe: false,
    useTFLiteWebWorker: true,
    enableFullBodyCapture: false,
    blazeFaceDetectorType: faces.DetectorTypes.short,
    blazeFaceLandmarkType: faces.LandmarkTypes.with_attention,
    handsLandmarkType: hands.ModelTypes2.lite,
    blazePoseDetectorType: poses.DetectorTypes.lite,
    blazePoseLandmarkType: poses.LandmarkTypes.lite
}

const initialParams: MotionDetectorParams = {
    TFLiteProcessWidth: 512,
    TFLiteProcessHeight: 512,
    TFLiteAffineResizedFactor: 2,
    TFLitePoseCropExt: 1.3,
    MPProcessWidth: 300,
    MPProcessHeight: 300,

    faceMovingAverageWindow: 3,
    calcMode: 0 // for debug
}
export class MotionDetector {
    config: MotionDetectorConfig
    params: MotionDetectorParams

    private faceDetector: faces.FaceLandmarkDetectionWorkerManager | null = null
    private faceDetectorMP: faces.FaceLandmarkDetectionWorkerManager | null = null
    private handDetector: hands.HandPoseDetectionWorkerManager | null = null
    private handDetectorMP: hands.HandPoseDetectionWorkerManager | null = null
    private poseDetector: poses.BlazePoseWorkerManager | null = null
    private poseDetectorMP: poses.BlazePoseWorkerManager | null = null

    private faceConfig: faces.FaceLandmarkDetectionConfig
    private faceParams: faces.FaceLandmarkDetectionOperationParams
    private handConfig: hands.HandPoseDetectionConfig
    private handParams: hands.HandPoseDetectionOperationParams
    private poseConfig: poses.BlazePoseConfig
    private poseParams: poses.BlazePoseOperationParams
    private faceConfigMP: faces.FaceLandmarkDetectionConfig
    private faceParamsMP: faces.FaceLandmarkDetectionOperationParams
    private handConfigMP: hands.HandPoseDetectionConfig
    private handParamsMP: hands.HandPoseDetectionOperationParams
    private poseConfigMP: poses.BlazePoseConfig
    private poseParamsMP: poses.BlazePoseOperationParams


    //////////////////////////////////////////////
    // *** (A) Constructor and Configuration *** 
    //// (A-1) constructor   
    //////////////////////////////////////////////
    constructor(config: MotionDetectorConfig = initialConfig, params: MotionDetectorParams = initialParams) {
        this.config = config
        this.params = params
        this.faceConfig = faces.generateFaceLandmarkDetectionDefaultConfig()
        this.faceParams = faces.generateDefaultFaceLandmarkDetectionParams()
        this.handConfig = hands.generateHandPoseDetectionDefaultConfig()
        this.handParams = hands.generateDefaultHandPoseDetectionParams()
        this.poseConfig = poses.generateBlazePoseDefaultConfig()
        this.poseParams = poses.generateDefaultBlazePoseParams()

        this.faceConfigMP = faces.generateFaceLandmarkDetectionDefaultConfig()
        this.faceParamsMP = faces.generateDefaultFaceLandmarkDetectionParams()
        this.handConfigMP = hands.generateHandPoseDetectionDefaultConfig()
        this.handParamsMP = hands.generateDefaultHandPoseDetectionParams()
        this.poseConfigMP = poses.generateBlazePoseDefaultConfig()
        this.poseParamsMP = poses.generateDefaultBlazePoseParams()
        this.configure()
    }
    //////////////////////////////////////////
    //// (A-2) common configuration   
    //////////////////////////////////////////
    configure = () => {
        // (1) Face Config/Params
        //// (1-1) config for tflite
        this.faceConfig.modelType = faces.ModelTypes.tflite
        this.faceConfig.processOnLocal = false
        this.faceConfig.detectorModelKey = this.config.blazeFaceDetectorType
        this.faceConfig.landmarkModelKey = this.config.blazeFaceLandmarkType
        this.faceConfig.useSimd = true

        //// (1-2) config for mediapipe
        this.faceConfigMP.modelType = faces.ModelTypes.mediapipe
        this.faceConfigMP.processOnLocal = true
        // this.faceConfigMP.detectorModelKey = this.config.blazeFaceDetectorType // no choice in mp
        // this.faceConfigMP.landmarkModelKey = this.config.blazeFaceLandmarkType // no choice in mp
        this.faceConfigMP.model.refineLandmarks = true

        //// (1-3) params
        this.faceParams.movingAverageWindow = this.params.faceMovingAverageWindow
        this.faceParams.processWidth = this.params.TFLiteProcessWidth
        this.faceParams.processHeight = this.params.TFLiteProcessHeight
        this.faceParamsMP.movingAverageWindow = this.params.faceMovingAverageWindow
        this.faceParamsMP.processWidth = this.params.MPProcessWidth
        this.faceParamsMP.processHeight = this.params.MPProcessHeight


        // (2) Hand Config/Params
        //// (2-1) config for tflite
        this.handConfig.modelType = hands.ModelTypes.tflite
        this.handConfig.processOnLocal = false
        this.handConfig.modelType2 = this.config.handsLandmarkType
        this.handConfig.useSimd = true

        //// (2-2) config for mediapipe
        this.handConfigMP.modelType = hands.ModelTypes.mediapipe
        this.handConfigMP.processOnLocal = true
        this.handConfigMP.modelType2 = this.config.handsLandmarkType

        //// (2-3) params
        this.handParams.affineResizedFactor = this.params.TFLiteAffineResizedFactor
        this.handParams.processWidth = this.params.TFLiteProcessWidth
        this.handParams.processHeight = this.params.TFLiteProcessHeight
        this.handParamsMP.processWidth = this.params.MPProcessWidth
        this.handParamsMP.processHeight = this.params.MPProcessHeight

        // (3) Pose Config/Params
        //// (3-1) config for tflite
        this.poseConfig.modelType = poses.ModelTypes.tflite
        this.poseConfig.processOnLocal = false
        this.poseConfig.detectorModelKey = this.config.blazePoseDetectorType
        this.poseConfig.landmarkModelKey = this.config.blazePoseLandmarkType
        this.poseConfig.useSimd = true


        //// (3-2) config for mediapipe
        this.poseConfigMP.modelType = poses.ModelTypes.tflite
        this.poseConfigMP.processOnLocal = true
        this.poseConfigMP.detectorModelKey = this.config.blazePoseDetectorType
        this.poseConfigMP.landmarkModelKey = this.config.blazePoseLandmarkType

        //// (3-3) params
        this.poseParams.affineResizedFactor = this.params.TFLiteAffineResizedFactor
        this.poseParams.cropExt = this.params.TFLitePoseCropExt
        this.poseParams.processWidth = this.params.TFLiteProcessWidth
        this.poseParams.processHeight = this.params.TFLiteProcessHeight
        this.poseParams.calculate_mode = this.params.calcMode
        this.poseParams.movingAverageWindow = this.params.faceMovingAverageWindow
        this.poseParamsMP.processWidth = this.params.MPProcessWidth
        this.poseParamsMP.processHeight = this.params.MPProcessHeight
        this.poseParamsMP.movingAverageWindow = this.params.faceMovingAverageWindow
    }

    //////////////////////////////////////////
    //// (A-3) reconfiguration   
    //////////////////////////////////////////
    setTFLiteProcessSize = (width: number, height: number) => {
        this.params.TFLiteProcessWidth = width
        this.params.TFLiteProcessHeight = height
        this.configure()
    }
    setTFLiteAffineResizedFactor = (size: number) => {
        this.params.TFLiteAffineResizedFactor = size
        this.configure()
    }
    setMovingAverageWindow = (size: number) => {
        this.params.faceMovingAverageWindow = size
        this.configure()
    }
    setCalcMode = (mode: number) => {
        this.params.calcMode = mode
        this.configure()
    }
    setUseMediapipe = (enable: boolean) => {
        this.config.useMediapipe = enable
        this.configure()
        this.initializeManagers()
    }
    setUseTFLiteWebWorker = (enable: boolean) => {
        this.config.useTFLiteWebWorker = enable
        this.configure()
        this.initializeManagers()
    }
    setEnableFullbodyCapture = (enable: boolean) => {
        this.config.enableFullBodyCapture = enable
        this.configure()
        this.initializeManagers()
    }


    //////////////////////////////////////////////
    // *** (B) initializeManagers *** 
    //////////////////////////////////////////////
    initializeManagers = async () => {

        // (1) TFLite Initialize
        if (this.config.useTFLiteWebWorker) {
            // (1-1) initialize face
            if (!this.faceDetector) {
                this.faceDetector = new faces.FaceLandmarkDetectionWorkerManager()
            }
            await this.faceDetector.init(this.faceConfig)

            // (1-2) initialize hand and pose when fullbody capture is enabled
            if (this.config.enableFullBodyCapture) {
                if (!this.handDetector) {
                    this.handDetector = new hands.HandPoseDetectionWorkerManager()
                }
                await this.handDetector.init(this.handConfig)
                if (!this.poseDetector) {
                    this.poseDetector = new poses.BlazePoseWorkerManager()
                }
                await this.poseDetector.init(this.poseConfig)
            }
        }

        // (2) MP Initialize
        if (this.config.useMediapipe) {
            // (2-1) initialize face
            if (!this.faceDetectorMP) {
                this.faceDetectorMP = new faces.FaceLandmarkDetectionWorkerManager()
            }
            await this.faceDetectorMP.init(this.faceConfigMP)

            // (2-2) initialize hand and pose when fullbody capture is enabled
            if (this.config.enableFullBodyCapture) {
                if (!this.handDetectorMP) {
                    this.handDetectorMP = new hands.HandPoseDetectionWorkerManager()
                }
                await this.handDetectorMP.init(this.handConfigMP)
                if (!this.poseDetectorMP) {
                    this.poseDetectorMP = new poses.BlazePoseWorkerManager()
                }
                await this.poseDetectorMP.init(this.poseConfigMP)
            }
        }
    }


    //////////////////////////////////////////////
    // *** (C) prediction *** 
    //////////////////////////////////////////////
    faceProcessing = false
    handProcessing = false
    poseProcessing = false
    faceProcessingMP = false
    handProcessingMP = false
    poseProcessingMP = false

    facePromise: Promise<string> | null = null
    handPromise: Promise<string> | null = null
    posePromise: Promise<string> | null = null
    facePromiseMP: Promise<string> | null = null
    handPromiseMP: Promise<string> | null = null
    posePromiseMP: Promise<string> | null = null

    latestFaces: faces.FacemeshPredictionMediapipe | null = null
    latestHands: hands.Hand[] | null = null
    latestPoses: poses.PosePredictionEx | null = null
    latestFacesMP: faces.FacemeshPredictionMediapipe | null = null
    latestHandsMP: hands.Hand[] | null = null
    latestPosesMP: poses.PosePredictionEx | null = null


    latestFaceRig: kalido.TFace | null = null
    latestLeftHandRig: kalido.THand<kalido.Side> | null = null
    latestRightHandRig: kalido.THand<kalido.Side> | null = null
    latestPoseRig: kalido.TPose | null = null
    latestFaceRigMP: kalido.TFace | null = null
    latestLeftHandRigMP: kalido.THand<kalido.Side> | null = null
    latestRightHandRigMP: kalido.THand<kalido.Side> | null = null
    latestPoseRigMP: kalido.TPose | null = null


    //////////////////////////////////////////
    //// (C-1) main prediction   
    //////////////////////////////////////////
    predict = async (snap: HTMLCanvasElement) => {
        if (this.faceDetector && !this.faceProcessing && this.config.useTFLiteWebWorker) {
            this.faceProcessing = true
            this.facePromise = this.predictFaces(snap)
            // console.log("WAITING... new face")
        }
        if (this.handDetector && !this.handProcessing && this.config.useTFLiteWebWorker && this.config.enableFullBodyCapture) {
            this.handProcessing = true
            this.handPromise = this.predictHands(snap)
            // console.log("WAITING... new hand")
        }
        if (this.poseDetector && !this.poseProcessing && this.config.useTFLiteWebWorker && this.config.enableFullBodyCapture) {
            this.poseProcessing = true
            this.posePromise = this.predictPoses(snap)
            // console.log("WAITING... new pose")
        }
        if (!this.config.useTFLiteWebWorker) {
            this.facePromise = null
            this.handPromise = null
            this.posePromise = null
        }

        if (this.faceDetectorMP && !this.faceProcessingMP && this.config.useMediapipe) {
            this.faceProcessingMP = true
            this.facePromiseMP = this.predictFacesMP(snap)
            // console.log("WAITING... new face mp")
        }

        if (this.handDetectorMP && !this.handProcessingMP && this.config.useMediapipe && this.config.enableFullBodyCapture) {
            this.handProcessingMP = true
            this.handPromiseMP = this.predictHandsMP(snap)
            // console.log("WAITING... new hand mp")
        }
        if (this.poseDetectorMP && !this.poseProcessingMP && this.config.useMediapipe && this.config.enableFullBodyCapture) {
            this.poseProcessingMP = true
            this.posePromiseMP = this.predictPosesMP(snap)
            // console.log("WAITING... new pose mp")
        }
        if (!this.config.useMediapipe) {
            this.facePromiseMP = null
            this.handPromiseMP = null
            this.posePromiseMP = null
        }

        try {
            const promiss = [this.facePromise, this.handPromise, this.posePromise, this.facePromiseMP, this.handPromiseMP, this.posePromiseMP].filter(x => { return x !== null })
            if (promiss.length > 0) {
                await Promise.race(promiss)

            }
        } catch (err) {
            console.log("catch error:::", err)
        }

        return {
            faces: this.latestFaces,
            hands: this.latestHands,
            poses: this.latestPoses,
            facesMP: this.latestFacesMP,
            handsMP: this.latestHandsMP,
            posesMP: this.latestPosesMP,

            faceRig: this.latestFaceRig,
            leftHandRig: this.latestLeftHandRig,
            rightHandRig: this.latestRightHandRig,
            poseRig: this.latestPoseRig,
            faceRigMP: this.latestFaceRigMP,
            leftHandRigMP: this.latestLeftHandRigMP,
            rightHandRigMP: this.latestRightHandRigMP,
            poseRigMP: this.latestPoseRigMP,
        }
    }

    //////////////////////////////////////////
    //// (C-2) face prediction   
    //////////////////////////////////////////
    count = 0
    predictFaces = async (snap: HTMLCanvasElement): Promise<string> => {
        if (!this.faceDetector) {
            this.faceProcessing = false
            return "predictFaces"

        }

        try {
            this.latestFaces = await this.faceDetector.predict(this.faceParams, snap)
        } catch (error) {
            console.log("predictFaces:", error)
        }
        // console.log("FACE:::", this.latestFaces)
        if (this.latestFaces && this.latestFaces.rowPrediction && this.latestFaces.rowPrediction.length > 0 && this.latestFaces.rowPrediction[0].keypoints) {
            // if (this.faceConfig.modelType === ModelTypes.tflite) {
            //     face.rowPrediction![0].keypoints.forEach((x) => {
            //         (x.x *= snap.width), (x.y *= snap.height);
            //     });
            // }

            if (this.count < 10) {
                // this.count++
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const faceRig = kalido.Face.solve(this.latestFaces.singlePersonKeypointsMovingAverage, {
                    // const faceRig = kalido.Face.solve(this.latestFaces.rowPrediction[0].keypoints!, {
                    runtime: "mediapipe", // `mediapipe` or `tfjs`
                    imageSize: { height: snap.height, width: snap.width },
                    // imageSize: { height: 1, width: 1 },
                    smoothBlink: true, // smooth left and right eye blink delays
                    // blinkSettings: [0.25, 0.75], // adjust upper and lower bound blink sensitivity
                });

                this.latestFaceRig = JSON.parse(JSON.stringify(faceRig))
            }
        }
        this.faceProcessing = false
        return "predictFaces"
    }

    predictFacesMP = async (snap: HTMLCanvasElement): Promise<string> => {
        if (!this.faceDetectorMP) {
            this.faceProcessingMP = false
            return "predictFacesMP"
        }
        try {
            this.latestFacesMP = await this.faceDetectorMP.predict(this.faceParamsMP, snap)
        } catch (error) {
            console.log("predictFacesMP:", error)
        }
        // console.log("FACE MP:::", this.latestFacesMP)
        if (this.latestFacesMP && this.latestFacesMP.rowPrediction && this.latestFacesMP.rowPrediction.length > 0 && this.latestFacesMP.rowPrediction[0].keypoints) {
            // if (this.faceConfig.modelType === ModelTypes.tflite) {
            //     face.rowPrediction![0].keypoints.forEach((x) => {
            //         (x.x *= snap.width), (x.y *= snap.height);
            //     });
            // }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const faceRig = kalido.Face.solve(this.latestFacesMP.rowPrediction[0].keypoints!, {
                runtime: "mediapipe", // `mediapipe` or `tfjs`
                imageSize: { height: snap.height, width: snap.width },
                // imageSize: { height: 1, width: 1 },
                smoothBlink: true, // smooth left and right eye blink delays
                // blinkSettings: [0.25, 0.75], // adjust upper and lower bound blink sensitivity
            });
            this.latestFaceRigMP = JSON.parse(JSON.stringify(faceRig))
        }
        this.faceProcessingMP = false
        return "predictFacesMP"
    }

    //////////////////////////////////////////
    //// (C-3) hand prediction   
    //////////////////////////////////////////

    predictHands = async (snap: HTMLCanvasElement): Promise<string> => {
        if (!this.handDetector) {
            this.handProcessing = false
            return "predictHands"
        }
        try {
            this.latestHands = await this.handDetector.predict(this.handParams, snap)
        } catch (error) {
            console.log("predictHands:", error)
        }

        if (this.latestHands && this.latestHands.length > 0) {
            for (let i = 0; i < this.latestHands.length; i++) {
                const hand = this.latestHands[i]
                hand.keypoints.forEach((x) => {
                    (x.x *= snap.width), (x.y *= snap.height);
                    (x.z = undefined)
                });
                // console.log("HAND:::", hand)

                if (hand.handedness == "Left") {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const handRing = kalido.Hand.solve(hand.keypoints, "Right")
                    this.latestRightHandRig = JSON.parse(JSON.stringify(handRing))
                } else {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const handRing = kalido.Hand.solve(hand.keypoints, "Left")
                    this.latestLeftHandRig = JSON.parse(JSON.stringify(handRing))
                }
            }
        }
        this.handProcessing = false
        return "predictHands"
    }

    predictHandsMP = async (snap: HTMLCanvasElement): Promise<string> => {
        if (!this.handDetectorMP) {
            this.handProcessingMP = false
            return "predictHandsMP"
        }
        try {
            this.latestHandsMP = await this.handDetectorMP.predict(this.handParamsMP, snap)
        } catch (error) {
            console.log("predictHandsMP:", error)
        }

        if (this.latestHandsMP && this.latestHandsMP.length > 0) {
            for (let i = 0; i < this.latestHandsMP.length; i++) {
                const hand = this.latestHandsMP[i]
                // console.log("HAND MP:::", hand)

                if (hand.handedness == "Left") {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const handRing = kalido.Hand.solve(hand.keypoints, "Left")
                    this.latestLeftHandRigMP = JSON.parse(JSON.stringify(handRing))
                } else {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const handRing = kalido.Hand.solve(hand.keypoints, "Right")
                    this.latestRightHandRigMP = JSON.parse(JSON.stringify(handRing))

                }
            }
        }
        this.handProcessingMP = false
        return "predictHandsMP"

    }

    //////////////////////////////////////////
    //// (C-4) pose prediction   
    //////////////////////////////////////////
    predictPoses = async (snap: HTMLCanvasElement): Promise<string> => {
        if (!this.poseDetector) {
            this.poseProcessing = false
            return "predictPoses"
        }
        try {
            this.latestPoses = await this.poseDetector.predict(this.poseParams, snap)
        } catch (error) {
            console.log("predictPoses:", error)
        }

        // console.log("POSE::L:", this.latestPoses?.singlePersonKeypoints3DMovingAverage![15].y, this.latestPoses?.singlePersonKeypoints3DMovingAverage![15].score, this.latestPoses?.singlePersonKeypointsMovingAverage![15].y)
        // console.log("POSE::R:", this.latestPoses?.singlePersonKeypoints3DMovingAverage![16].y, this.latestPoses?.singlePersonKeypoints3DMovingAverage![16].score, this.latestPoses?.singlePersonKeypointsMovingAverage![16].y)


        if (this.latestPoses) {
            this.latestPoses.singlePersonKeypointsMovingAverage!.forEach((x) => {
                (x.x *= snap.width), (x.y *= snap.height);
                (x.z! *= snap.width)
            });
            this.latestPoses.singlePersonKeypoints3DMovingAverage!.forEach((x) => {
                (x.x /= 2), (x.y /= 2);
            });
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const poseRig = kalido.Pose.solve(this.latestPoses.singlePersonKeypoints3DMovingAverage, this.latestPoses.singlePersonKeypointsMovingAverage, {
                // runtime: "mediapipe", // `mediapipe` or `tfjs`
                runtime: "tfjs", // `mediapipe` or `tfjs`
                imageSize: { height: snap.height, width: snap.width },
                smoothLandmarks: true,
            })
            this.latestPoseRig = JSON.parse(JSON.stringify(poseRig))
        }
        this.poseProcessing = false
        return "predictPoses"

    }

    predictPosesMP = async (snap: HTMLCanvasElement): Promise<string> => {
        if (!this.poseDetectorMP) {
            this.poseProcessingMP = false
            return "predictPosesMP"
        }
        try {
            this.latestPosesMP = await this.poseDetectorMP.predict(this.poseParamsMP, snap)
        } catch (error) {
            console.log("predictPosesMP:", error)
        }
        // console.log("POSE MP:::", this.latestPosesMP)

        if (this.latestPosesMP) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const poseRig = kalido.Pose.solve(this.latestPosesMP.singlePersonKeypoints3DMovingAverage, this.latestPosesMP.singlePersonKeypointsMovingAverage, {
                // runtime: "mediapipe", // `mediapipe` or `tfjs`
                runtime: "tfjs", // `mediapipe` or `tfjs`
                imageSize: { height: snap.height, width: snap.width },
                smoothLandmarks: true,
            })
            this.latestPoseRigMP = JSON.parse(JSON.stringify(poseRig))
        }
        this.poseProcessingMP = false
        return "predictPosesMP"

    }
}