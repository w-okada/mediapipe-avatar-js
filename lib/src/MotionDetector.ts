import * as kalido from "./kalido"
import { MediapipeMix2Config, MediapipeMix2OperationParams, MediapipeMix2WorkerManager, HandPredictionEx, FacePredictionEx, PosePredictionEx, OperationType } from "@dannadori/mediapipe-mix2-worker-js"
export type { HandPredictionEx, FacePredictionEx, PosePredictionEx }
// const initialConfig: MediapipeMixConfig = generateMediapipeMixDefaultConfig()
// const initialParams: MediapipeMixOperationParams = generateDefaultMediapipeMixParams()


export type MotionDetectorResult = {
    hands: HandPredictionEx | null
    faces: FacePredictionEx | null
    poses: PosePredictionEx | null

    leftHandRig: kalido.THand<kalido.Side> | null
    rightHandRig: kalido.THand<kalido.Side> | null
    faceRig: kalido.TFace | null
    poseRig: kalido.TPose | null
}



export class MotionDetector {
    enableFullBodyCapture: boolean = true

    handDetector = new MediapipeMix2WorkerManager()
    handConfig?: MediapipeMix2Config
    handParams?: MediapipeMix2OperationParams
    faceDetector = new MediapipeMix2WorkerManager()
    faceConfig?: MediapipeMix2Config
    faceParams?: MediapipeMix2OperationParams
    poseDetector = new MediapipeMix2WorkerManager()
    poseConfig?: MediapipeMix2Config
    poseParams?: MediapipeMix2OperationParams

    //////////////////////////////////////////////
    // *** (A) Constructor and Configuration *** 
    //// (A-1) constructor   
    //////////////////////////////////////////////
    initialize = async (_config?: MediapipeMix2Config, _params?: MediapipeMix2OperationParams) => {
        const config = _config ? _config : await this.handDetector.generateDefaultConfig()
        const params = _params ? _params : this.handDetector.generateDefaultMediapipeMixParams()

        params.faceProcessWidth = 300
        params.faceProcessHeight = 300
        params.handProcessWidth = 300
        params.handProcessHeight = 300
        params.poseProcessWidth = 300
        params.poseProcessHeight = 300

        config.processOnLocal = false

        this.handConfig = config
        this.handParams = JSON.parse(JSON.stringify(params))
        this.handParams!.operationType = OperationType.hand

        this.faceConfig = config
        this.faceParams = JSON.parse(JSON.stringify(params))
        this.faceParams!.operationType = OperationType.face

        this.poseConfig = config
        this.poseParams = JSON.parse(JSON.stringify(params))
        this.poseParams!.operationType = OperationType.pose
        console.log("Constructor", this.faceParams)


        // this.handConfig = JSON.parse(JSON.stringify(config))
        // this.handConfig!.processOnLocal = false
        // this.handParams = JSON.parse(JSON.stringify(params))
        // this.handParams!.operationType = OperationType.hand
        // this.faceConfig = JSON.parse(JSON.stringify(config))
        // this.faceConfig!.processOnLocal = false
        // this.faceParams = JSON.parse(JSON.stringify(params))
        // this.faceParams!.operationType = OperationType.face
        // this.poseConfig = JSON.parse(JSON.stringify(config))
        // this.poseConfig!.processOnLocal = false
        // this.poseParams = JSON.parse(JSON.stringify(params))
        // this.poseParams!.operationType = OperationType.pose
        // console.log("Constructor", this.faceParams)

    }
    //////////////////////////////////////////
    //// (A-2) common configuration   
    //////////////////////////////////////////
    configure = () => { }

    //////////////////////////////////////////
    //// (A-3) reconfiguration   
    //////////////////////////////////////////
    setTFLiteProcessSize = (width: number, height: number) => {
        this.handParams!.handProcessWidth = width
        this.handParams!.handProcessHeight = height
        this.faceParams!.faceProcessWidth = width
        this.faceParams!.faceProcessHeight = height
        this.poseParams!.poseProcessWidth = width
        this.poseParams!.poseProcessHeight = height
    }
    setTFLiteAffineResizedFactor = (size: number) => {
        this.handParams!.handAffineResizedFactor = size
        this.poseParams!.poseAffineResizedFactor = size
    }
    setMovingAverageWindow = (size: number) => {
        this.faceParams!.faceMovingAverageWindow = size
        this.poseParams!.poseMovingAverageWindow = size
    }
    setCalcMode = (mode: number) => {
        this.poseParams!.poseCalculateMode = mode
    }
    setEnableFullbodyCapture = async (enable: boolean) => {
        this.enableFullBodyCapture = enable
        await this.initializeManagers()
    }


    //////////////////////////////////////////////
    // *** (B) initializeManagers *** 
    //////////////////////////////////////////////
    initializeManagers = async () => {
        const p1 = this.handDetector.init(this.handConfig!)
        const p2 = this.faceDetector.init(this.faceConfig!)
        const p3 = this.poseDetector.init(this.poseConfig!)
        // await Promise.all([p2])
        await Promise.all([p1, p2, p3])
    }


    //////////////////////////////////////////////
    // *** (C) prediction *** 
    //////////////////////////////////////////////
    handProcessing = false
    faceProcessing = false
    poseProcessing = false

    handPromise: Promise<string> | null = null
    facePromise: Promise<string> | null = null
    posePromise: Promise<string> | null = null

    latestHands: HandPredictionEx | null = null
    latestFaces: FacePredictionEx | null = null
    latestPoses: PosePredictionEx | null = null

    latestLeftHandRig: kalido.THand<kalido.Side> | null = null
    latestRightHandRig: kalido.THand<kalido.Side> | null = null
    latestFaceRig: kalido.TFace | null = null
    latestPoseRig: kalido.TPose | null = null


    //////////////////////////////////////////
    //// (C-1) main prediction   
    //////////////////////////////////////////
    predict = async (snap: HTMLCanvasElement): Promise<MotionDetectorResult> => {
        if (this.handDetector && !this.handProcessing && this.enableFullBodyCapture) {
            this.handProcessing = true
            this.handPromise = this.predictHands(snap)
        }
        if (this.faceDetector && !this.faceProcessing) {
            this.faceProcessing = true
            this.facePromise = this.predictFaces(snap)
        }
        if (this.poseDetector && !this.poseProcessing && this.enableFullBodyCapture) {
            this.poseProcessing = true
            this.posePromise = this.predictPoses(snap)
        }

        try {
            const promiss = [this.handPromise, this.facePromise, this.posePromise].filter(x => { return x !== null })
            if (promiss.length > 0) {
                await Promise.race(promiss)
            }
        } catch (err) {
            console.log("catch error:::", err)
        }
        return {
            hands: this.latestHands,
            faces: this.latestFaces,
            poses: this.latestPoses,

            leftHandRig: this.latestLeftHandRig,
            rightHandRig: this.latestRightHandRig,
            faceRig: this.latestFaceRig,
            poseRig: this.latestPoseRig,
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
            this.latestFaces = await this.faceDetector.predict(this.faceParams!, snap) as FacePredictionEx
        } catch (error) {
            console.log("predictFaces:", error)
        }
        // console.log("FACE:::", this.latestFaces)
        if (this.latestFaces && this.latestFaces.rowPrediction && this.latestFaces.rowPrediction.length > 0 && this.latestFaces.rowPrediction[0].keypoints) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const faceRig = kalido.Face.solve(this.latestFaces.singlePersonKeypointsMovingAverage, {
                runtime: "mediapipe", // `mediapipe` or `tfjs`
                imageSize: { height: snap.height, width: snap.width },
                smoothBlink: true, // smooth left and right eye blink delays
                // blinkSettings: [0.25, 0.75], // adjust upper and lower bound blink sensitivity
            });

            this.latestFaceRig = JSON.parse(JSON.stringify(faceRig))
        }
        this.faceProcessing = false
        return "predictFaces"
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
            this.latestHands = await this.handDetector.predict(this.handParams!, snap) as HandPredictionEx
        } catch (error) {
            console.log("predictHands:", error)
        }

        if (this.latestHands && this.latestHands.rowPrediction && this.latestHands.rowPrediction!.length > 0) {
            for (let i = 0; i < this.latestHands.rowPrediction!.length; i++) {
                const hand = this.latestHands.rowPrediction![i]
                if (hand.score < 0.5) {
                    continue
                }
                hand.keypoints.forEach((x) => {
                    (x.x *= snap.width), (x.y *= snap.height);
                    (x.z = undefined)
                });
                // console.log("HANDs:::", hand)

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

    //////////////////////////////////////////
    //// (C-4) pose prediction   
    //////////////////////////////////////////
    predictPoses = async (snap: HTMLCanvasElement): Promise<string> => {
        if (!this.poseDetector) {
            this.poseProcessing = false
            return "predictPoses"
        }
        try {
            this.latestPoses = await this.poseDetector.predict(this.poseParams!, snap)
        } catch (error) {
            console.log("predictPoses:", error)
        }

        if (this.latestPoses && this.latestPoses.singlePersonKeypoints3DMovingAverage && this.latestPoses.singlePersonKeypoints3DMovingAverage.length > 0) {
            // console.log("Poses:", this.latestPoses)
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
}