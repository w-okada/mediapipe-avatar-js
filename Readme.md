# Mediapipe Avatar

Mediapipe Avatar is avatar blendshape library based on [Mediapipe](https://google.github.io/mediapipe/) and [Kalidokit](https://github.com/yeemachine/kalidokit). ~~This module works in the following two modes.~~

-   work with [wasm-simd webworker](https://github.com/w-okada/image-analyze-workers) using mediapipe tflite model.
-   ~~work with pure mediapipe [JavaScript Solutions](https://google.github.io/mediapipe/getting_started/javascript)~~

Note: Mediapipe js solution is omitted because of the size of package.

![image](https://user-images.githubusercontent.com/48346627/167111544-50aae766-cb65-49e9-b453-6ad4b7623094.png)

# Motivation

Using multiple TensorflowJS/Mediapipe models with GPU work slow. Maybe chrome handles them sequentially ([ref](https://github.com/google/mediapipe/issues/2506#issuecomment-940399479)). One the other hand, wasm-simd TFLite is faster than gpu for small model([ref](https://blog.tensorflow.org/2020/09/supercharging-tensorflowjs-webassembly.html)). And, the models used by Kalidokit is relatively small. So my idea is simple. I try to run them on webworker with wasm-simd TFLite parallel to speed up.

# Evalutation

I used my own PC, CPU:Intel(R) Core(TM) i9-9900KF CPU @ 3.60GHz, GPU:NVIDIA GeForce RTX 2080 Ti.

Definition: Frame update time is interval when some parts is updated.

(A)With webworker, average frame update time is about 20msec. (B)With mediapipe JS Solution, average frame update time is about 70msec. Webwoker is faster than mediapipe.

![image](https://user-images.githubusercontent.com/48346627/167121395-c286757e-9c25-4216-8872-5f5b3b182a2f.png)

## On webworker with wasm-simd TFLite

![image](https://user-images.githubusercontent.com/48346627/167111544-50aae766-cb65-49e9-b453-6ad4b7623094.png)

## With mediapipe JS Solutions

![image](https://user-images.githubusercontent.com/48346627/167121158-94714dbf-f8e3-4f40-ac57-9c9a55d989dc.png)

# Demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P03_wokers/mediapipe-avatar-js-demo/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P03_wokers/mediapipe-avatar-js-demo/index.html)

# Module Usage

For more detail usage, please see demo src.

## install

```
npm install @dannadori/mediapipe-avatar-js
```

## use motion detector

(1) initialize

```
detector = new MotionDetector();
detector.initializeManagers(); // initialize
```

(2) configure

```
detector.setEnableFullbodyCapture(true);
detector.setUseTFLiteWebWorker(value);// set use or not webworker with wasm-simd tflite
detector.setUseMediapipe(value);// set use or not mediapipe
detector.setEnableFullbodyCapture(value);// set use or not full body capture


```

(3) predict

```
const { faceRig, leftHandRig, rightHandRig, poseRig, faceRigMP, leftHandRigMP, rightHandRigMP, poseRigMP } = await detector.predict(snap); //
```

Each "~Rig" is output from Kalidokit with the image input(snap). Prefix is the parts of body. The suffix "MP" means mediapipe. If mediapipe is not used, each "~RigMP" is null. If tflite is not used, each "~Rig" is null.

## controle avatar

(1) initialize

```
avatar = new MediapipeAvator(vrm);
```

vrm is the avatar vrm loaded by GLTFLoader.

(2) moving

```
avatar.updatePose(faceRig, poseRig, leftHandRig, rightHandRig);
```

Each "~Rig" is output from motion detector. If you want to use mediapipe data, input "~RigMP".
