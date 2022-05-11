import * as poses from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workerlite"
import * as faces from "@dannadori/face-landmark-detection-worker-js/dist/face-landmark-detection-workershort_with_attention"
import * as hands from "@dannadori/hand-pose-detection-worker-js/dist/hand-pose-detection-workerlite"

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

    calcMode: number; // debug
}