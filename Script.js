// ============================================================
// VIBESENSE AI
// COMPLETE JAVASCRIPT
//
// Features:
// Face detection
// Age estimation
// Visible expression estimation
// Multiple hand detection
// Hand movement
// Air drawing
// Camera switch
// Start / Stop camera
// ============================================================


// ============================================================
// MEDIAPIPE
// ============================================================

import {
    HandLandmarker,
    FilesetResolver
} from "https://esm.sh/@mediapipe/tasks-vision@1.0.1";
const SIGNALING_SERVER =
  "https://vibesenseai-server.onrender.com";

// ============================================================
// DOM
// ============================================================

const video =
    document.getElementById("video");

const overlayCanvas =
    document.getElementById("overlayCanvas");

const drawingCanvas =
    document.getElementById("drawingCanvas");

const overlayCtx =
    overlayCanvas.getContext("2d");

const drawingCtx =
    drawingCanvas.getContext("2d");

const loading =
    document.getElementById("loading");

const loadingText =
    document.getElementById("loadingText");

const startScreen =
    document.getElementById("startScreen");

const cameraControls =
    document.getElementById("cameraControls");

const startCameraBtn =
    document.getElementById("startCameraBtn");

const stopCameraBtn =
    document.getElementById("stopCameraBtn");

const switchCameraBtn =
    document.getElementById("switchCameraBtn");

const drawingToggleBtn =
    document.getElementById("drawingToggle");

const clearDrawingBtn =
    document.getElementById("clearDrawing");

const systemStatus =
    document.getElementById("systemStatus");

const peopleCount =
    document.getElementById("peopleCount");

const peopleBadge =
    document.getElementById("peopleBadge");

const handsCount =
    document.getElementById("handsCount");

const movementStatus =
    document.getElementById("movementStatus");

const drawingStatus =
    document.getElementById("drawingStatus");

const peopleList =
    document.getElementById("peopleList");

const brushSizeEl =
    document.getElementById("brushSize");

const brushPlus =
    document.getElementById("brushPlus");

const brushMinus =
    document.getElementById("brushMinus");

const eraserBtn =
    document.getElementById("eraserBtn");


// ============================================================
// CONFIGURATION
// ============================================================

const FACE_MODELS =
    "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";

const HAND_MODEL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const WASM_PATH =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";


// ============================================================
// VARIABLES
// ============================================================

let stream = null;

let handLandmarker = null;

let cameraRunning = false;

let facingMode = "user";

let drawingEnabled = false;

let selectedColor = "#ff3b30";

let brushSize = 6;

let previousHands = [];

let lastFaceTime = 0;

let lastHandTime = 0;

let animationFrameId = null;

let faceResults = [];

let handResults = [];


// ============================================================
// DETECTION SPEED
// ============================================================

const FACE_INTERVAL = 250;

const HAND_INTERVAL = 70;


// ============================================================
// LOADING UI
// ============================================================

function setLoading(message) {

    if (loadingText) {
        loadingText.textContent =
            message;
    }
}


// ============================================================
// SYSTEM STATUS
// ============================================================

function setSystemStatus(message) {

    if (systemStatus) {

        systemStatus.textContent =
            message;
    }
}


// ============================================================
// LOAD FACE AI
// ============================================================

async function loadFaceAI() {

    setLoading(
        "Loading face detection AI..."
    );

    await faceapi.nets.tinyFaceDetector.loadFromUri(
        FACE_MODELS
    );


    setLoading(
        "Loading face landmark AI..."
    );

    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(
        FACE_MODELS
    );


    setLoading(
        "Loading age estimation AI..."
    );

    await faceapi.nets.ageGenderNet.loadFromUri(
        FACE_MODELS
    );


    setLoading(
        "Loading expression AI..."
    );

    await faceapi.nets.faceExpressionNet.loadFromUri(
        FACE_MODELS
    );

    console.log(
        "Face AI loaded."
    );
}


// ============================================================
// LOAD HAND AI
// ============================================================

async function loadHandAI() {

    setLoading(
        "Loading hand movement AI..."
    );

    const vision =
        await FilesetResolver.forVisionTasks(
            WASM_PATH
        );


    try {

        handLandmarker =
            await HandLandmarker.createFromOptions(
                vision,
                {

                    baseOptions: {
                        modelAssetPath:
                            HAND_MODEL,

                        delegate: "GPU"
                    },

                    runningMode: "VIDEO",

                    numHands: 4,

                    minHandDetectionConfidence:
                        0.35,

                    minHandPresenceConfidence:
                        0.35,

                    minTrackingConfidence:
                        0.35
                }
            );

    } catch (gpuError) {

        console.warn(
            "GPU hand model failed. Trying CPU...",
            gpuError
        );


        handLandmarker =
            await HandLandmarker.createFromOptions(
                vision,
                {

                    baseOptions: {
                        modelAssetPath:
                            HAND_MODEL,

                        delegate: "CPU"
                    },

                    runningMode: "VIDEO",

                    numHands: 4,

                    minHandDetectionConfidence:
                        0.30,

                    minHandPresenceConfidence:
                        0.30,

                    minTrackingConfidence:
                        0.30
                }
            );
    }

    console.log(
        "Hand AI loaded."
    );
}


// ============================================================
// LOAD EVERYTHING
// ============================================================

async function loadAI() {

    try {

        setSystemStatus(
            "Loading AI..."
        );

        setLoading(
            "Starting VibeSense AI..."
        );


        await loadFaceAI();

        await loadHandAI();


        console.log(
            "All AI models loaded successfully."
        );


        setLoading(
            "AI ready."
        );

        setSystemStatus(
            "AI Ready"
        );


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    700
                )
        );


        if (loading) {
            loading.style.display =
                "none";
        }


    } catch (error) {

        console.error(
            "AI loading error:",
            error
        );


        setLoading(
            "AI loading failed. Check Console."
        );

        setSystemStatus(
            "AI Error"
        );


        alert(
            "VibeSense AI could not load.\n\n" +
            "Open F12 → Console."
        );
    }
}


// ============================================================
// CAMERA START
// ============================================================

async function startCamera() {

    try {

        console.log(
            "Starting camera..."
        );


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API not available."
            );
        }


        // Stop old camera first
        if (stream) {

            stream
                .getTracks()
                .forEach(track =>
                    track.stop()
                );

            stream = null;
        }


        const constraints = {

            audio: false,

            video: {

                facingMode: {
                    ideal: facingMode
                },

                width: {
                    ideal: 1280
                },

                height: {
                    ideal: 720
                },

                frameRate: {
                    ideal: 30,
                    max: 30
                }
            }
        };


        stream =
            await navigator.mediaDevices.getUserMedia(
                constraints
            );


        video.srcObject =
            stream;


        await video.play();


        cameraRunning = true;


        resizeCanvases();


        // UI
        if (startScreen) {

            startScreen.style.display =
                "none";
        }


        if (cameraControls) {

            cameraControls.classList.remove(
                "hidden"
            );
        }


        setSystemStatus(
            "Camera Active"
        );


        console.log(
            "Camera started successfully."
        );


        startDetectionLoop();


    } catch (error) {

        console.error(
            "Camera start error:",
            error
        );


        setSystemStatus(
            "Camera Error"
        );


        let message =
            "Camera could not start.\n\n";


        if (
            error.name ===
            "NotAllowedError"
        ) {

            message +=
                "Please allow camera permission in your browser.";

        } else if (
            error.name ===
            "NotFoundError"
        ) {

            message +=
                "No camera was found.";

        } else {

            message +=
                error.message;
        }


        alert(message);
    }
}


// ============================================================
// STOP CAMERA
// ============================================================

function stopCamera() {

    console.log(
        "Stopping camera..."
    );


    cameraRunning = false;


    if (animationFrameId) {

        cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId = null;
    }


    if (stream) {

        stream
            .getTracks()
            .forEach(track => {

                track.stop();
            });

        stream = null;
    }


    video.srcObject = null;


    faceResults = [];

    handResults = [];

    previousHands = [];


    clearOverlay();


    if (drawingCtx) {

        drawingCtx.clearRect(
            0,
            0,
            drawingCanvas.width,
            drawingCanvas.height
        );
    }


    if (cameraControls) {

        cameraControls.classList.add(
            "hidden"
        );
    }


    if (startScreen) {

        startScreen.style.display =
            "flex";
    }


    setSystemStatus(
        "Camera Stopped"
    );


    updatePeopleUI([]);

    updateHandsUI(0);

    updateMovementUI(
        "Low"
    );


    console.log(
        "Camera stopped."
    );
}


// ============================================================
// SWITCH CAMERA
// ============================================================

async function switchCamera() {

    if (!cameraRunning) {
        return;
    }


    facingMode =
        facingMode === "user"
            ? "environment"
            : "user";


    await startCamera();
}


// ============================================================
// CANVAS SIZE
// ============================================================

function resizeCanvases() {

    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {
        return;
    }


    const width =
        video.videoWidth;

    const height =
        video.videoHeight;


    overlayCanvas.width =
        width;

    overlayCanvas.height =
        height;


    drawingCanvas.width =
        width;

    drawingCanvas.height =
        height;


    clearOverlay();
}


// ============================================================
// CLEAR OVERLAY
// ============================================================

function clearOverlay() {

    overlayCtx.clearRect(
        0,
        0,
        overlayCanvas.width,
        overlayCanvas.height
    );
}


// ============================================================
// MIRROR X COORDINATE
// ============================================================

function mirrorX(
    x,
    width
) {

    if (facingMode === "user") {

        return width - x;
    }

    return x;
}


// ============================================================
// FACE DETECTION
// ============================================================

async function detectFaces() {

    if (
        !cameraRunning ||
        video.readyState < 2
    ) {
        return;
    }


    try {

        const detections =
            await faceapi
                .detectAllFaces(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 224,
                        scoreThreshold: 0.35
                    })
                )
                .withFaceLandmarks(true)
                .withAgeAndGender()
                .withFaceExpressions();


        faceResults =
            detections || [];


        drawFaceResults(
            faceResults
        );


        updatePeopleUI(
            faceResults
        );


    } catch (error) {

        console.error(
            "Face detection error:",
            error
        );
    }
}


// ============================================================
// DRAW FACE RESULTS
// ============================================================

function drawFaceResults(
    faces
) {

    clearOverlay();


    faces.forEach(
        (face, index) => {

            const box =
                face.detection.box;


            const x =
                mirrorX(
                    box.x,
                    overlayCanvas.width
                );


            const y =
                box.y;


            const width =
                box.width;


            const height =
                box.height;


            const age =
                Math.round(
                    face.age
                );


            const ageRange =
                getAgeRange(age);


            const expression =
                getExpression(
                    face.expressions
                );


            // ----------------------------------------
            // FACE BOX
            // ----------------------------------------

            overlayCtx.strokeStyle =
                "#00f5a0";

            overlayCtx.lineWidth = 3;


            overlayCtx.strokeRect(
                x,
                y,
                width,
                height
            );


            // ----------------------------------------
            // LABEL
            // ----------------------------------------

            const label =
                `Person ${index + 1} • ${ageRange} • ${expression}`;


            overlayCtx.font =
                "bold 15px Arial";


            const textWidth =
                overlayCtx.measureText(
                    label
                ).width;


            const labelY =
                Math.max(
                    28,
                    y
                );


            overlayCtx.fillStyle =
                "rgba(0, 0, 0, 0.78)";


            overlayCtx.fillRect(
                x,
                labelY - 27,
                textWidth + 16,
                25
            );


            overlayCtx.fillStyle =
                "#ffffff";


            overlayCtx.fillText(
                label,
                x + 8,
                labelY - 9
            );
        }
    );
}


// ============================================================
// AGE RANGE
// ============================================================

function getAgeRange(age) {

    if (age < 4)
        return "0–3";

    if (age < 8)
        return "4–7";

    if (age < 13)
        return "8–12";

    if (age < 18)
        return "13–17";

    if (age < 25)
        return "18–24";

    if (age < 35)
        return "25–34";

    if (age < 45)
        return "35–44";

    if (age < 55)
        return "45–54";

    if (age < 65)
        return "55–64";

    return "65+";
}


// ============================================================
// EXPRESSION
// ============================================================

function getExpression(
    expressions
) {

    if (!expressions) {

        return "Neutral-like";
    }


    let best =
        "neutral";

    let bestScore =
        0;


    for (
        const [name, score]
        of Object.entries(expressions)
    ) {

        if (
            score >
            bestScore
        ) {

            bestScore =
                score;

            best =
                name;
        }
    }


    switch (best) {

        case "happy":
            return "Happy-like";

        case "sad":
            return "Sad-like";

        case "angry":
            return "Angry-like";

        case "surprised":
            return "Surprised-like";

        case "fearful":
            return "Fearful-like";

        case "disgusted":
            return "Disgusted-like";

        default:
            return "Neutral-like";
    }
}


// ============================================================
// PEOPLE UI
// ============================================================

function updatePeopleUI(
    faces
) {

    peopleCount.textContent =
        faces.length;

    peopleBadge.textContent =
        faces.length;


    peopleList.innerHTML =
        "";


    if (
        faces.length === 0
    ) {

        peopleList.innerHTML = `
            <div class="empty-state">
                No person detected
            </div>
        `;

        return;
    }


    faces.forEach(
        (face, index) => {

            const age =
                Math.round(
                    face.age
                );


            const ageRange =
                getAgeRange(age);


            const expression =
                getExpression(
                    face.expressions
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "person-card";


            card.innerHTML = `

                <div class="person-number">
                    ${index + 1}
                </div>

                <div class="person-info">

                    <strong>
                        Person ${index + 1}
                    </strong>

                    <span>
                        Age: ${ageRange}
                    </span>

                    <span>
                        Expression: ${expression}
                    </span>

                </div>
            `;


            peopleList.appendChild(
                card
            );
        }
    );
}


// ============================================================
// HAND DETECTION
// ============================================================

function detectHands() {

    if (
        !cameraRunning ||
        !handLandmarker ||
        video.readyState < 2
    ) {
        return;
    }


    try {

        const now =
            performance.now();


        const result =
            handLandmarker.detectForVideo(
                video,
                now
            );


        handResults =
            result.landmarks || [];


        updateHandsUI(
            handResults.length
        );


        processHands(
            handResults
        );


    } catch (error) {

        console.error(
            "Hand detection error:",
            error
        );
    }
}


// ============================================================
// HAND PROCESSING
// ============================================================

function processHands(
    hands
) {

    if (
        !hands ||
        hands.length === 0
    ) {

        previousHands = [];

        updateMovementUI(
            "Low"
        );

        return;
    }


    let totalMovement = 0;

    let movementSamples = 0;


    const currentHands = [];


    hands.forEach(
        (landmarks, handIndex) => {

            if (
                !landmarks ||
                !landmarks[8]
            ) {
                return;
            }


            const tip =
                landmarks[8];


            let x =
                tip.x;

            const y =
                tip.y;


            // ----------------------------------------
            // MIRROR FOR FRONT CAMERA
            // ----------------------------------------

            if (
                facingMode === "user"
            ) {

                x =
                    1 - x;
            }


            currentHands.push({
                x,
                y
            });


            // ----------------------------------------
            // MOVEMENT
            // ----------------------------------------

            if (
                previousHands[handIndex]
            ) {

                const previous =
                    previousHands[
                        handIndex
                    ];


                const movement =
                    Math.sqrt(
                        Math.pow(
                            x -
                            previous.x,
                            2
                        ) +
                        Math.pow(
                            y -
                            previous.y,
                            2
                        )
                    );


                totalMovement +=
                    movement;


                movementSamples++;
            }


            // ----------------------------------------
            // DRAW
            // ----------------------------------------

            if (
                drawingEnabled
            ) {

                drawFinger(
                    x,
                    y
                );
            }
        }
    );


    previousHands =
        currentHands;


    const averageMovement =
        movementSamples > 0
            ? totalMovement /
              movementSamples
            : 0;


    let movement =
        "Low";


    if (
        averageMovement >
        0.018
    ) {

        movement =
            "Normal";
    }


    if (
        averageMovement >
        0.045
    ) {

        movement =
            "High";
    }


    updateMovementUI(
        movement
    );
}


// ============================================================
// DRAW FINGER
// ============================================================

let lastDrawPoint = null;


function drawFinger(
    normalizedX,
    normalizedY
) {

    if (
        !drawingEnabled
    ) {
        lastDrawPoint =
            null;

        return;
    }


    const x =
        normalizedX *
        drawingCanvas.width;


    const y =
        normalizedY *
        drawingCanvas.height;


    if (!lastDrawPoint) {

        lastDrawPoint = {
            x,
            y
        };

        return;
    }


    drawingCtx.lineWidth =
        brushSize;


    drawingCtx.lineCap =
        "round";


    drawingCtx.lineJoin =
        "round";


    drawingCtx.strokeStyle =
        selectedColor;


    drawingCtx.beginPath();


    drawingCtx.moveTo(
        lastDrawPoint.x,
        lastDrawPoint.y
    );


    drawingCtx.lineTo(
        x,
        y
    );


    drawingCtx.stroke();


    lastDrawPoint = {
        x,
        y
    };
}


// ============================================================
// HAND UI
// ============================================================

function updateHandsUI(
    count
) {

    handsCount.textContent =
        count;
}


// ============================================================
// MOVEMENT UI
// ============================================================

function updateMovementUI(
    movement
) {

    movementStatus.textContent =
        movement;
}


// ============================================================
// DRAWING TOGGLE
// ============================================================

function toggleDrawing() {

    drawingEnabled =
        !drawingEnabled;


    if (!drawingEnabled) {

        lastDrawPoint =
            null;
    }


    drawingStatus.textContent =
        drawingEnabled
            ? "ON"
            : "OFF";


    drawingToggleBtn.textContent =
        drawingEnabled
            ? "✏️ Drawing ON"
            : "✏️ Drawing OFF";
}


// ============================================================
// CLEAR DRAWING
// ============================================================

function clearDrawing() {

    drawingCtx.clearRect(
        0,
        0,
        drawingCanvas.width,
        drawingCanvas.height
    );


    lastDrawPoint =
        null;
}


// ============================================================
// SELECT COLOR
// ============================================================

function selectColor(
    color
) {

    selectedColor =
        color;


    drawingCtx.globalCompositeOperation =
        "source-over";


    document
        .querySelectorAll(
            ".color-btn"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );


                if (
                    button.dataset.color ===
                    color
                ) {

                    button.classList.add(
                        "active"
                    );
                }
            }
        );
}


// ============================================================
// ERASER
// ============================================================

function useEraser() {

    drawingCtx.globalCompositeOperation =
        "destination-out";


    document
        .querySelectorAll(
            ".color-btn"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );
            }
        );
}


// ============================================================
// BRUSH
// ============================================================

function changeBrush(
    amount
) {

    brushSize =
        Math.max(
            2,
            Math.min(
                30,
                brushSize +
                amount
            )
        );


    brushSizeEl.textContent =
        `${brushSize}px`;
}


// ============================================================
// DETECTION LOOP
// ============================================================

function startDetectionLoop() {

    if (animationFrameId) {

        cancelAnimationFrame(
            animationFrameId
        );
    }


    lastFaceTime = 0;

    lastHandTime = 0;


    function loop(
        timestamp
    ) {

        if (
            !cameraRunning
        ) {

            return;
        }


        // FACE
        if (
            timestamp -
            lastFaceTime >=
            FACE_INTERVAL
        ) {

            lastFaceTime =
                timestamp;


            detectFaces();
        }


        // HAND
        if (
            timestamp -
            lastHandTime >=
            HAND_INTERVAL
        ) {

            lastHandTime =
                timestamp;


            detectHands();
        }


        animationFrameId =
            requestAnimationFrame(
                loop
            );
    }


    animationFrameId =
        requestAnimationFrame(
            loop
        );
}


// ============================================================
// EVENTS
// ============================================================


// START CAMERA

startCameraBtn.addEventListener(
    "click",
    async () => {

        await startCamera();
    }
);


// STOP CAMERA

stopCameraBtn.addEventListener(
    "click",
    () => {

        stopCamera();
    }
);


// SWITCH CAMERA

switchCameraBtn.addEventListener(
    "click",
    async () => {

        await switchCamera();
    }
);


// DRAWING

drawingToggleBtn.addEventListener(
    "click",
    () => {

        toggleDrawing();
    }
);


// CLEAR

clearDrawingBtn.addEventListener(
    "click",
    () => {

        clearDrawing();
    }
);


// COLORS

document
    .querySelectorAll(
        ".color-btn"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    selectColor(
                        button.dataset.color
                    );
                }
            );
        }
    );


// ERASER

eraserBtn.addEventListener(
    "click",
    () => {

        useEraser();
    }
);


// BRUSH PLUS

brushPlus.addEventListener(
    "click",
    () => {

        changeBrush(2);
    }
);


// BRUSH MINUS

brushMinus.addEventListener(
    "click",
    () => {

        changeBrush(-2);
    }
);


// VIDEO READY

video.addEventListener(
    "loadedmetadata",
    () => {

        resizeCanvases();
    }
);


// WINDOW RESIZE

window.addEventListener(
    "resize",
    () => {

        resizeCanvases();
    }
);


// ============================================================
// INITIAL STATE
// ============================================================

peopleCount.textContent =
    "0";

peopleBadge.textContent =
    "0";

handsCount.textContent =
    "0";

movementStatus.textContent =
    "Low";

drawingStatus.textContent =
    "OFF";

brushSizeEl.textContent =
    "6px";


// ============================================================
// START AI
// ============================================================

loadAI();
