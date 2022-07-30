cd ../../image-analyze-workers/019_mediapipe-mix2-worker-js/ && npm run build && cd -
rm -r node_modules/@dannadori/mediapipe-mix2-worker-js/dist/*
cp -r ../../image-analyze-workers/019_mediapipe-mix2-worker-js/dist/* node_modules/@dannadori/mediapipe-mix2-worker-js/dist/