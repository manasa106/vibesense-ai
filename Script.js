import {
  HandLandmarker,
  FilesetResolver
} from "https://esm.sh/@mediapipe/tasks-vision@1.0.1";


// ======================================================
// VIBESENSE AI CONFIGURATION
// ======================================================

// AFTER DEPLOYING server.js ON RENDER,
// CHANGE THIS URL.
//
// Example:
// https://vibesense-ai-server.onrender.com
//
const SIGNALING_SERVER =
  "https://vibesenseai-server.onrender.com";


// ======================================================
// DOM
// ======================================================

const remoteVideo =
  document.getElementById("remoteVideo");

const overlayCanvas =
  document.getElementById("overlayCanvas");

const drawingCanvas =
  document.getElementById("drawingCanvas");

const overlayCtx =
  overlayCanvas.getContext("2d");

const drawingCtx =
  drawingCanvas.getContext("2d");


const roomInput =
  document.getElementById("roomInput");

const roleSelect =
  document.getElementById("roleSelect");

const connectBtn =
  document.getElementById("connectBtn");

const disconnectBtn =
  document.getElementById("disconnectBtn");

const startCameraBtn =
  document.getElementById("startCameraBtn");

const stopCameraBtn =
  document.getElementById("stopCameraBtn");

const switchCameraBtn =
  document.getElementById("switchCameraBtn");


const senderControls =
  document.getElementById("senderControls");

const waitingMessage =
  document.getElementById("waitingMessage");

const statusDot =
  document.getElementById("statusDot");

const statusText =
  document.getElementById("statusText");

const videoStatus =
  document.getElementById("videoStatus");

const analysisStatus =
  document.getElementById("analysisStatus");

const peopleCount =
  document.getElementById("peopleCount");

const handsCount =
  document.getElementById("handsCount");

const movementValue =
  document.getElementById("movementValue");

const peopleList =
  document.getElementById("peopleList");

const drawingStatus =
  document.getElementById("drawingStatus");

const drawingToggleBtn =
  document.getElementById("drawingToggleBtn");

const clearDrawingBtn =
  document.getElementById("clearDrawingBtn");

const eraserBtn =
  document.getElementById("eraserBtn");

const brushMinus =
  document.getElementById("brushMinus");

const brushPlus =
  document.getElementById("brushPlus");

const brushValue =
  document.getElementById("brushValue");


// ======================================================
// VARIABLES
// ======================================================

let socket = null;

let peerConnection = null;

let localStream = null;

let roomId = "";

let currentRole = "";

let cameraFacingMode = "user";

let handLandmarker = null;

let modelsLoaded = false;

let analysisRunning = false;

let lastAnalysisTime = 0;

let lastHandPositions = [];

let currentMovement = "Low";

let drawingEnabled = false;

let drawingColor = "#ff3b30";

let brushSize = 5;

let lastDrawingPoint = null;

let previousPeopleCount = 0;


// ======================================================
// WEBRTC ICE SERVERS
// ======================================================

const rtcConfiguration = {

  iceServers: [

    {
      urls: "stun:stun.l.google.com:19302"
    },

    {
      urls: "stun:stun1.l.google.com:19302"
    }

  ]

};


// ======================================================
// INITIALIZATION
// ======================================================

window.addEventListener("DOMContentLoaded", async () => {

  setupCanvasEvents();

  setupUIEvents();

  resizeCanvases();

  window.addEventListener(
    "resize",
    resizeCanvases
  );

  setStatus(
    "Offline",
    false
  );

  updateRoleUI();

  await loadAIModels();

});


// ======================================================
// AI MODELS
// ======================================================

async function loadAIModels() {

  try {

    setStatus(
      "Loading AI...",
      false
    );

    analysisStatus.textContent =
      "Loading AI";


    // -------------------------------
    // FACE API
    // -------------------------------

    const MODEL_URL =
      "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

    await faceapi.nets.tinyFaceDetector.loadFromUri(
      MODEL_URL
    );

    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(
      MODEL_URL
    );

    await faceapi.nets.ageGenderNet.loadFromUri(
      MODEL_URL
    );

    await faceapi.nets.faceExpressionNet.loadFromUri(
      MODEL_URL
    );


    // -------------------------------
    // MEDIAPIPE HAND
    // -------------------------------

    const vision =
      await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
      );


    handLandmarker =
      await HandLandmarker.createFromOptions(
        vision,
        {

          baseOptions: {

            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

            delegate: "GPU"

          },

          runningMode: "VIDEO",

          numHands: 4

        }
      );


    modelsLoaded = true;

    setStatus(
      "AI Ready",
      true
    );

    analysisStatus.textContent =
      "Ready";

    console.log(
      "VibeSense AI models loaded successfully."
    );

  }

  catch (error) {

    console.error(
      "AI loading error:",
      error
    );

    setStatus(
      "AI Error",
      false
    );

    analysisStatus.textContent =
      "AI Error";

    alert(
      "AI models could not be loaded. Open the browser console for details."
    );

  }

}


// ======================================================
// UI EVENTS
// ======================================================

function setupUIEvents() {

  connectBtn.addEventListener(
    "click",
    connectToRoom
  );


  disconnectBtn.addEventListener(
    "click",
    disconnectRoom
  );


  roleSelect.addEventListener(
    "change",
    updateRoleUI
  );


  startCameraBtn.addEventListener(
    "click",
    startLocalCamera
  );


  stopCameraBtn.addEventListener(
    "click",
    stopLocalCamera
  );


  switchCameraBtn.addEventListener(
    "click",
    switchCamera
  );


  drawingToggleBtn.addEventListener(
    "click",
    toggleDrawing
  );


  clearDrawingBtn.addEventListener(
    "click",
    clearDrawing
  );


  eraserBtn.addEventListener(
    "click",
    () => {

      drawingColor =
        "#00000000";

      document
        .querySelectorAll(".color-btn")
        .forEach(btn => {
          btn.classList.remove(
            "selected"
          );
        });

      eraserBtn.classList.add(
        "selected"
      );

    }
  );


  document
    .querySelectorAll(".color-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          drawingColor =
            button.dataset.color;

          document
            .querySelectorAll(
              ".color-btn"
            )
            .forEach(btn => {
              btn.classList.remove(
                "selected"
              );
            });

          eraserBtn.classList.remove(
            "selected"
          );

          button.classList.add(
            "selected"
          );

        }
      );

    });


  brushMinus.addEventListener(
    "click",
    () => {

      brushSize =
        Math.max(
          1,
          brushSize - 1
        );

      updateBrushDisplay();

    }
  );


  brushPlus.addEventListener(
    "click",
    () => {

      brushSize =
        Math.min(
          30,
          brushSize + 1
        );

      updateBrushDisplay();

    }
  );

}


// ======================================================
// ROLE UI
// ======================================================

function updateRoleUI() {

  const role =
    roleSelect.value;

  if (role === "sender") {

    senderControls.classList.remove(
      "hidden"
    );

    videoStatus.textContent =
      "Your camera";

  } else {

    senderControls.classList.add(
      "hidden"
    );

    videoStatus.textContent =
      "Waiting for friend camera";

  }

}


// ======================================================
// SOCKET CONNECTION
// ======================================================

function connectToRoom() {

  roomId =
    roomInput.value.trim();

  currentRole =
    roleSelect.value;


  if (!roomId) {

    alert(
      "Enter a Room ID."
    );

    return;

  }


  if (
    !SIGNALING_SERVER ||
    SIGNALING_SERVER.includes(
      "YOUR-RENDER-SERVER"
    )
  ) {

    alert(
      "First deploy server.js and put your Render server URL inside Script.js."
    );

    return;

  }


  socket =
    io(
      SIGNALING_SERVER,
      {
        transports: [
          "websocket",
          "polling"
        ]
      }
    );


  socket.on(
    "connect",
    () => {

      setStatus(
        "Connected",
        true
      );

      socket.emit(
        "join-room",
        {
          roomId,
          role: currentRole
        }
      );

    }
  );


  socket.on(
    "joined-room",
    () => {

      connectBtn.disabled =
        true;

      disconnectBtn.disabled =
        false;

      roomInput.disabled =
        true;

      roleSelect.disabled =
        true;

      videoStatus.textContent =
        currentRole === "sender"
          ? "Waiting for viewer..."
          : "Waiting for friend camera...";

    }
  );


  socket.on(
    "peer-ready",
    async () => {

      if (currentRole === "sender") {

        await createOffer();

      }

    }
  );


  socket.on(
    "offer",
    async ({ offer }) => {

      if (currentRole !== "viewer") {
        return;
      }

      await handleOffer(
        offer
      );

    }
  );


  socket.on(
    "answer",
    async ({ answer }) => {

      if (!peerConnection) {
        return;
      }

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(
          answer
        )
      );

    }
  );


  socket.on(
    "ice-candidate",
    async ({ candidate }) => {

      if (!peerConnection) {
        return;
      }

      try {

        await peerConnection.addIceCandidate(
          new RTCIceCandidate(
            candidate
          )
        );

      }

      catch (error) {

        console.warn(
          "ICE candidate error:",
          error
        );

      }

    }
  );


  socket.on(
    "peer-disconnected",
    () => {

      videoStatus.textContent =
        "Friend disconnected";

      waitingMessage.classList.remove(
        "hidden"
      );

      if (remoteVideo.srcObject) {

        remoteVideo.srcObject =
          null;

      }

      stopAnalysis();

    }
  );


  socket.on(
    "room-error",
    (message) => {

      alert(message);

      disconnectRoom();

    }
  );


  socket.on(
    "connect_error",
    (error) => {

      console.error(
        "Socket error:",
        error
      );

      setStatus(
        "Server Error",
        false
      );

    }
  );

}


// ======================================================
// CREATE PEER CONNECTION
// ======================================================

function createPeerConnection() {

  if (peerConnection) {

    peerConnection.close();

  }


  peerConnection =
    new RTCPeerConnection(
      rtcConfiguration
    );


  peerConnection.onicecandidate =
    event => {

      if (
        event.candidate &&
        socket
      ) {

        socket.emit(
          "ice-candidate",
          {
            roomId,
            candidate:
              event.candidate
          }
        );

      }

    };


  peerConnection.onconnectionstatechange =
    () => {

      const state =
        peerConnection.connectionState;

      console.log(
        "WebRTC:",
        state
      );


      if (
        state === "connected"
      ) {

        setStatus(
          "Live",
          true
        );

        videoStatus.textContent =
          "Live camera connected";

      }


      if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {

        setStatus(
          "Disconnected",
          false
        );

      }

    };


  peerConnection.ontrack =
    event => {

      if (
        event.streams &&
        event.streams[0]
      ) {

        remoteVideo.srcObject =
          event.streams[0];

        waitingMessage.classList.add(
          "hidden"
        );

        videoStatus.textContent =
          "Live camera connected";

        startAnalysis();

      }

    };

}


// ======================================================
// SENDER
// ======================================================

async function startLocalCamera() {

  try {

    if (!modelsLoaded) {

      alert(
        "AI models are still loading. Please wait."
      );

      return;

    }


    await stopLocalCamera();


    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          video: {
            facingMode:
              cameraFacingMode,

            width: {
              ideal: 1280
            },

            height: {
              ideal: 720
            }
          },

          audio: false
        }
      );


    if (
      !peerConnection
    ) {

      createPeerConnection();

    }


    localStream
      .getTracks()
      .forEach(track => {

        peerConnection.addTrack(
          track,
          localStream
        );

      });


    remoteVideo.srcObject =
      localStream;

    remoteVideo.muted =
      true;

    await remoteVideo.play();


    startCameraBtn.disabled =
      true;

    stopCameraBtn.disabled =
      false;

    videoStatus.textContent =
      "Camera running";

    waitingMessage.classList.add(
      "hidden"
    );


    startAnalysis();


  }

  catch (error) {

    console.error(
      "Camera error:",
      error
    );

    alert(
      "Camera could not start: " +
      error.message
    );

  }

}


// ======================================================
// STOP CAMERA
// ======================================================

async function stopLocalCamera() {

  if (localStream) {

    localStream
      .getTracks()
      .forEach(track => {
        track.stop();
      });

    localStream =
      null;

  }


  startCameraBtn.disabled =
    false;

  stopCameraBtn.disabled =
    true;

}


// ======================================================
// SWITCH CAMERA
// ======================================================

async function switchCamera() {

  if (
    currentRole !== "sender"
  ) {

    return;

  }


  cameraFacingMode =
    cameraFacingMode === "user"
      ? "environment"
      : "user";


  if (localStream) {

    const wasRunning =
      localStream
        .getVideoTracks()
        .some(
          track =>
            track.readyState ===
            "live"
        );


    if (wasRunning) {

      await stopLocalCamera();

      await startLocalCamera();

    }

  }

}


// ======================================================
// OFFER
// ======================================================

async function createOffer() {

  if (
    currentRole !== "sender"
  ) {

    return;

  }


  try {

    if (!peerConnection) {

      createPeerConnection();

    }


    if (!localStream) {

      await startLocalCamera();

    }


    const offer =
      await peerConnection.createOffer();


    await peerConnection.setLocalDescription(
      offer
    );


    socket.emit(
      "offer",
      {
        roomId,
        offer:
          peerConnection.localDescription
      }
    );


    console.log(
      "Offer sent."
    );

  }

  catch (error) {

    console.error(
      "Offer error:",
      error
    );

  }

}


// ======================================================
// HANDLE OFFER
// ======================================================

async function handleOffer(
  offer
) {

  try {

    createPeerConnection();


    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(
        offer
      )
    );


    const answer =
      await peerConnection.createAnswer();


    await peerConnection.setLocalDescription(
      answer
    );


    socket.emit(
      "answer",
      {
        roomId,
        answer:
          peerConnection.localDescription
      }
    );


    videoStatus.textContent =
      "Connecting to friend's camera...";

  }

  catch (error) {

    console.error(
      "Offer handling error:",
      error
    );

  }

}


// ======================================================
// DISCONNECT
// ======================================================

async function disconnectRoom() {

  stopAnalysis();

  await stopLocalCamera();


  if (peerConnection) {

    peerConnection.close();

    peerConnection =
      null;

  }


  if (socket) {

    socket.disconnect();

    socket =
      null;

  }


  remoteVideo.srcObject =
    null;


  connectBtn.disabled =
    false;

  disconnectBtn.disabled =
    true;

  roomInput.disabled =
    false;

  roleSelect.disabled =
    false;


  waitingMessage.classList.remove(
    "hidden"
  );


  videoStatus.textContent =
    "Waiting for connection...";


  setStatus(
    "Offline",
    false
  );

}


// ======================================================
// AI ANALYSIS
// ======================================================

function startAnalysis() {

  if (analysisRunning) {
    return;
  }

  analysisRunning =
    true;

  analysisLoop();

}


function stopAnalysis() {

  analysisRunning =
    false;

  peopleCount.textContent =
    "0";

  handsCount.textContent =
    "0";

  movementValue.textContent =
    "Low";

  peopleList.innerHTML =
    `
      <div class="empty-state">
        No person detected
      </div>
    `;

  clearOverlay();

}


// ======================================================
// ANALYSIS LOOP
// ======================================================

async function analysisLoop() {

  if (!analysisRunning) {
    return;
  }


  if (
    remoteVideo.readyState <
    HTMLMediaElement.HAVE_CURRENT_DATA
  ) {

    requestAnimationFrame(
      analysisLoop
    );

    return;

  }


  const now =
    performance.now();


  if (
    now - lastAnalysisTime <
    180
  ) {

    requestAnimationFrame(
      analysisLoop
    );

    return;

  }


  lastAnalysisTime =
    now;


  try {

    await analyzeFaces();

    await analyzeHands();

  }

  catch (error) {

    console.warn(
      "Analysis error:",
      error
    );

  }


  requestAnimationFrame(
    analysisLoop
  );

}


// ======================================================
// FACE / AGE / EXPRESSION
// ======================================================

async function analyzeFaces() {

  if (
    !remoteVideo.videoWidth ||
    !remoteVideo.videoHeight
  ) {

    return;

  }


  const detections =
    await faceapi
      .detectAllFaces(
        remoteVideo,
        new faceapi.TinyFaceDetectorOptions(
          {
            inputSize: 320,
            scoreThreshold: 0.45
          }
        )
      )
      .withFaceLandmarks(
        true
      )
      .withAgeAndGender()
      .withFaceExpressions();


  peopleCount.textContent =
    detections.length;


  updatePeopleList(
    detections
  );


  drawFaceBoxes(
    detections
  );

}


// ======================================================
// PEOPLE LIST
// ======================================================

function updatePeopleList(
  detections
) {

  if (
    detections.length === 0
  ) {

    peopleList.innerHTML =
      `
        <div class="empty-state">
          No person detected
        </div>
      `;

    return;

  }


  peopleList.innerHTML =
    "";


  detections.forEach(
    (detection, index) => {

      const age =
        Math.round(
          detection.age
        );


      const ageRange =
        getAgeRange(
          age
        );


      const expression =
        getExpression(
          detection.expressions
        );


      const card =
        document.createElement(
          "div"
        );

      card.className =
        "person-card";


      card.innerHTML =
        `
          <div class="person-number">
            ${index + 1}
          </div>

          <div class="person-details">

            <strong>
              Person ${index + 1}
            </strong>

            <span>
              Approx. Age: ${ageRange}
            </span>

            <span>
              Visible Expression:
              ${expression}
            </span>

          </div>
        `;


      peopleList.appendChild(
        card
      );

    }
  );

}


// ======================================================
// AGE RANGE
// ======================================================

function getAgeRange(
  age
) {

  if (age < 5) {
    return "0–4";
  }

  if (age < 8) {
    return "5–7";
  }

  if (age < 13) {
    return "8–12";
  }

  if (age < 18) {
    return "13–17";
  }

  if (age < 25) {
    return "18–24";
  }

  if (age < 35) {
    return "25–34";
  }

  if (age < 45) {
    return "35–44";
  }

  if (age < 55) {
    return "45–54";
  }

  if (age < 65) {
    return "55–64";
  }

  return "65+";

}


// ======================================================
// EXPRESSION
// ======================================================

function getExpression(
  expressions
) {

  let bestName =
    "neutral";

  let bestScore =
    0;


  for (
    const [name, score]
    of Object.entries(
      expressions
    )
  ) {

    if (
      score >
      bestScore
    ) {

      bestScore =
        score;

      bestName =
        name;

    }

  }


  const labels = {

    happy:
      "Happy-like",

    sad:
      "Sad-like",

    angry:
      "Angry-like",

    fearful:
      "Concerned-like",

    disgusted:
      "Tense-like",

    surprised:
      "Surprised-like",

    neutral:
      "Neutral-like"

  };


  return (
    labels[bestName] ||
    "Neutral-like"
  );

}


// ======================================================
// FACE DRAWING
// ======================================================

function drawFaceBoxes(
  detections
) {

  clearOverlay();


  const scaleX =
    overlayCanvas.width /
    remoteVideo.videoWidth;


  const scaleY =
    overlayCanvas.height /
    remoteVideo.videoHeight;


  detections.forEach(
    (detection, index) => {

      const box =
        detection.detection.box;


      const x =
        box.x *
        scaleX;


      const y =
        box.y *
        scaleY;


      const width =
        box.width *
        scaleX;


      const height =
        box.height *
        scaleY;


      overlayCtx.strokeStyle =
        "#36d66b";

      overlayCtx.lineWidth =
        3;

      overlayCtx.strokeRect(
        x,
        y,
        width,
        height
      );


      overlayCtx.fillStyle =
        "#36d66b";

      overlayCtx.font =
        "bold 16px Arial";


      overlayCtx.fillText(
        `Person ${index + 1}`,
        x,
        Math.max(
          18,
          y - 8
        )
      );

    }
  );

}


// ======================================================
// HAND ANALYSIS
// ======================================================

async function analyzeHands() {

  if (
    !handLandmarker ||
    !remoteVideo.videoWidth
  ) {

    return;

  }


  const result =
    handLandmarker.detectForVideo(
      remoteVideo,
      performance.now()
    );


  const landmarks =
    result.landmarks || [];


  handsCount.textContent =
    landmarks.length;


  drawHands(
    landmarks
  );


  calculateMovement(
    landmarks
  );


  handleAirDrawing(
    landmarks
  );

}


// ======================================================
// HAND DRAWING
// ======================================================

function drawHands(
  hands
) {

  hands.forEach(
    hand => {

      overlayCtx.strokeStyle =
        "#00e5ff";

      overlayCtx.fillStyle =
        "#00e5ff";

      overlayCtx.lineWidth =
        2;


      const connections =
        HandLandmarker.HAND_CONNECTIONS;


      connections.forEach(
        connection => {

          const start =
            hand[
              connection.start
            ];

          const end =
            hand[
              connection.end
            ];


          if (
            !start ||
            !end
          ) {

            return;

          }


          const sx =
            start.x *
            overlayCanvas.width;


          const sy =
            start.y *
            overlayCanvas.height;


          const ex =
            end.x *
            overlayCanvas.width;


          const ey =
            end.y *
            overlayCanvas.height;


          overlayCtx.beginPath();

          overlayCtx.moveTo(
            sx,
            sy
          );

          overlayCtx.lineTo(
            ex,
            ey
          );

          overlayCtx.stroke();

        }
      );


      hand.forEach(
        point => {

          overlayCtx.beginPath();

          overlayCtx.arc(
            point.x *
              overlayCanvas.width,
            point.y *
              overlayCanvas.height,
            4,
            0,
            Math.PI * 2
          );

          overlayCtx.fill();

        }
      );

    }
  );

}


// ======================================================
// MOVEMENT
// ======================================================

function calculateMovement(
  hands
) {

  if (
    hands.length === 0
  ) {

    currentMovement =
      "Low";

    movementValue.textContent =
      "Low";

    lastHandPositions =
      [];

    return;

  }


  let totalMovement =
    0;

  let count =
    0;


  hands.forEach(
    (hand, index) => {

      const wrist =
        hand[0];

      if (!wrist) {
        return;
      }


      const current = {
        x: wrist.x,
        y: wrist.y
      };


      const previous =
        lastHandPositions[index];


      if (previous) {

        const dx =
          current.x -
          previous.x;

        const dy =
          current.y -
          previous.y;


        const distance =
          Math.sqrt(
            dx * dx +
            dy * dy
          );


        totalMovement +=
          distance;

        count++;

      }


      lastHandPositions[index] =
        current;

    }
  );


  const average =
    count > 0
      ? totalMovement / count
      : 0;


  if (
    average > 0.035
  ) {

    currentMovement =
      "High";

  }

  else if (
    average > 0.012
  ) {

    currentMovement =
      "Normal";

  }

  else {

    currentMovement =
      "Low";

  }


  movementValue.textContent =
    currentMovement;

}


// ======================================================
// AIR DRAWING
// ======================================================

function handleAirDrawing(
  hands
) {

  if (
    !drawingEnabled ||
    hands.length === 0
  ) {

    lastDrawingPoint =
      null;

    return;

  }


  const hand =
    hands[0];


  const indexTip =
    hand[8];


  if (!indexTip) {
    return;
  }


  const x =
    indexTip.x *
    drawingCanvas.width;


  const y =
    indexTip.y *
    drawingCanvas.height;


  if (
    lastDrawingPoint
  ) {

    drawingCtx.strokeStyle =
      drawingColor;

    drawingCtx.lineWidth =
      brushSize;

    drawingCtx.lineCap =
      "round";

    drawingCtx.lineJoin =
      "round";


    drawingCtx.beginPath();

    drawingCtx.moveTo(
      lastDrawingPoint.x,
      lastDrawingPoint.y
    );

    drawingCtx.lineTo(
      x,
      y
    );

    drawingCtx.stroke();

  }


  lastDrawingPoint = {
    x,
    y
  };

}


// ======================================================
// DRAWING TOGGLE
// ======================================================

function toggleDrawing() {

  drawingEnabled =
    !drawingEnabled;


  if (
    drawingEnabled
  ) {

    drawingStatus.textContent =
      "ON";

    drawingStatus.classList.add(
      "active"
    );

    drawingToggleBtn.textContent =
      "✏️ Turn Drawing OFF";

  }

  else {

    drawingStatus.textContent =
      "OFF";

    drawingStatus.classList.remove(
      "active"
    );

    drawingToggleBtn.textContent =
      "✏️ Turn Drawing ON";

    lastDrawingPoint =
      null;

  }

}


// ======================================================
// CLEAR DRAWING
// ======================================================

function clearDrawing() {

  drawingCtx.clearRect(
    0,
    0,
    drawingCanvas.width,
    drawingCanvas.height
  );

  lastDrawingPoint =
    null;

}


// ======================================================
// BRUSH
// ======================================================

function updateBrushDisplay() {

  brushValue.textContent =
    brushSize;

}


// ======================================================
// CANVAS
// ======================================================

function resizeCanvases() {

  if (
    !remoteVideo.videoWidth ||
    !remoteVideo.videoHeight
  ) {

    return;

  }


  overlayCanvas.width =
    remoteVideo.videoWidth;

  overlayCanvas.height =
    remoteVideo.videoHeight;


  drawingCanvas.width =
    remoteVideo.videoWidth;

  drawingCanvas.height =
    remoteVideo.videoHeight;

}


// ======================================================
// VIDEO METADATA
// ======================================================

remoteVideo.addEventListener(
  "loadedmetadata",
  () => {

    resizeCanvases();

  }
);


// ======================================================
// CANVAS EVENTS
// ======================================================

function setupCanvasEvents() {

  window.addEventListener(
    "resize",
    resizeCanvases
  );

}


// ======================================================
// CLEAR OVERLAY
// ======================================================

function clearOverlay() {

  overlayCtx.clearRect(
    0,
    0,
    overlayCanvas.width,
    overlayCanvas.height
  );

}


// ======================================================
// STATUS
// ======================================================

function setStatus(
  text,
  online
) {

  statusText.textContent =
    text;


  statusDot.classList.toggle(
    "online",
    online
  );

}