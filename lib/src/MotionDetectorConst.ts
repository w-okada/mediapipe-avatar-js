import * as poses from "@dannadori/blaze-pose-worker-js"
import * as faces from "@dannadori/face-landmark-detection-worker-js"
import * as hands from "@dannadori/hand-pose-detection-worker-js"

export type MotionDetectorConfig = {
    useMediapipe: boolean,
    useTFLiteWebWorker: boolean,
    enableFullBodyCapture: boolean,

    blazeFaceDetectorType: faces.DetectorTypes
    blazeFaceLandmarkType: faces.LandmarkTypes
    handsLandmarkType: hands.ModelTypes2
    blazePoseDetectorType: poses.DetectorTypes
    blazePoseLandmarkType: poses.LandmarkTypes

}

export type MotionDetectorParams = {
    TFLiteProcessWidth: number
    TFLiteProcessHeight: number
    TFLiteAffineResizedFactor: number
    TFLitePoseCropExt: number
    MPProcessWidth: number
    MPProcessHeight: number
    faceMovingAverageWindow: number
}