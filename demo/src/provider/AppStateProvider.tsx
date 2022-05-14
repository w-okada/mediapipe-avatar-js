import React, { useContext, useEffect, useRef, useState } from "react";
import { ReactNode } from "react";
import { loadURLAsDataURL } from "../utils/urlReader";
import { useThree, UseThreeStateAndMethods } from "./hooks/useThree";
import { MotionDetector, MediapipeAvator } from "@dannadori/mediapipe-avatar-js";
import { VRM } from "@pixiv/three-vrm";
type Props = {
    children: ReactNode;
};

type AppStateValue = {
    inputSourceType: string | null;
    setInputSourceType: (source: string | null) => void;
    inputSource: string | MediaStream | null;
    setInputSource: (source: MediaStream | string | null) => void;

    applyMediapipe: boolean;
    setApplyMediapipe: (val: boolean) => void;
    useCustomArmRig: boolean;
    setUseCustomArmRig: (val: boolean) => void;
    threeState: UseThreeStateAndMethods;
    setAvatarVRM: (vrm: VRM, scene: THREE.Scene) => void;
    avatar: MediapipeAvator | undefined;
    detector: MotionDetector | undefined;
    updateDetector: () => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

const initialInputSourcePath = "mov/Model.mp4";

export const AppStateProvider = ({ children }: Props) => {
    const [inputSourceType, setInputSourceType] = useState<string | null>(null);
    const [inputSource, _setInputSource] = useState<MediaStream | string | null>(null);
    const [applyMediapipe, setApplyMediapipe] = useState(false);
    const [useCustomArmRig, setUseCustomArmRig] = useState(true);

    const avatarRef = useRef<MediapipeAvator>();
    const [avatar, setAvatar] = useState<MediapipeAvator | undefined>(avatarRef.current);
    const detectorRef = useRef<MotionDetector>();
    const [detector, setDetector] = useState<MotionDetector | undefined>(detectorRef.current);
    const [_updateTime, setUpdateTime] = useState<number>(0);

    // (1) 初期化
    //// (1-1) Input初期化
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
        });
        const loadInitialInputSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);
            setInputSource(data);
        };
        loadInitialInputSource(initialInputSourcePath);
    }, []);

    //// (1-2) detector初期化
    useEffect(() => {
        detectorRef.current = new MotionDetector();
        detectorRef.current.setEnableFullbodyCapture(true);
        detectorRef.current.initializeManagers();
        setDetector(detectorRef.current);
    }, []);

    //// (1-3) THREE 初期化
    const threeState = useThree();

    // (2) update
    //// (2-1) register avatar
    const setAvatarVRM = (vrm: VRM, scene: THREE.Scene) => {
        avatarRef.current = new MediapipeAvator(vrm, scene);
        avatarRef.current.enableHands = false;
        setAvatar(avatarRef.current);
    };

    //// (2-x) update input source
    const setInputSource = (source: MediaStream | string | null) => {
        if (inputSource instanceof MediaStream) {
            inputSource.getTracks().forEach((x) => {
                x.stop();
            });
        }
        _setInputSource(source);
    };

    //// (2-x) notify update
    const updateDetector = () => {
        setUpdateTime(new Date().getTime());
    };

    const providerValue = {
        inputSourceType,
        setInputSourceType,
        inputSource,
        setInputSource,
        applyMediapipe,
        setApplyMediapipe,
        useCustomArmRig,
        setUseCustomArmRig,
        threeState,
        setAvatarVRM,
        avatar,
        detector,
        updateDetector,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
