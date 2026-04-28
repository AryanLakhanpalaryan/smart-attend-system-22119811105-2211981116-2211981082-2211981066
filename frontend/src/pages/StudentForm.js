//create a new session component
import React, { useState, useRef } from "react";
import axios from "axios";
import "../styles/StudentForm.css";
import Toast from "../components/Toast";

const StudentForm = ({ togglePopup }) => {
  //eslint-disable-next-line
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [image, setImage] = useState({ contentType: "", data: "" });
  const [photoData, setPhotoData] = useState(""); // To store the captured photo data
  const [qrInput, setQrInput] = useState("");
  const [message, setMessage] = useState("");
  const [cameraSupported, setCameraSupported] = useState(true);
  const videoRef = useRef(null);

  const constraints = {
    video: true,
  };
  const startCamera = async () => {
    // getUserMedia is only available in secure contexts (https or localhost)
    const getUserMedia =
      (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    if (!getUserMedia) {
      console.error("getUserMedia not supported on this browser/environment");
      setMessage(
        "Camera access is not supported in this browser or in this connection. Please use https://localhost or use the 'Use Camera' button below."
      );
      setCameraSupported(false);
      return;
    }

    try {
      const stream = await getUserMedia.call(navigator.mediaDevices || navigator, constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraSupported(true);
      setMessage("");
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraSupported(false);
      setMessage(
        "Unable to access camera. Make sure you allowed camera permission and are using HTTPS/localhost."
      );
    }
  };
  const stopCamera = () => {
    const stream = videoRef.current.srcObject;
    const tracks = stream.getTracks();

    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
  };
  const capturePhoto = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas
      .getContext("2d")
      .drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8);

    // Use the base64 data URL as the image value (compatible with mock backend)
    setImage(photoDataUrl);
    setPhotoData(photoDataUrl);
    stopCamera();
  };
  const ResetCamera = () => {
    setPhotoData("");
    startCamera();
  };

  const AttendSession = async (e) => {
    e.preventDefault();
    let regno = e.target.regno.value;
    let enteredEmail = e.target.studentEmail.value;

    if (!regno || regno.trim().length === 0) {
      setMessage("Please fill all the fields");
      return;
    }

    if (!enteredEmail || enteredEmail.trim().length === 0) {
      setMessage("Please enter your email");
      return;
    }

    const loggedInEmail = localStorage.getItem("email");
    if (enteredEmail.trim().toLowerCase() !== loggedInEmail.toLowerCase()) {
      setMessage("The email entered does not match your logged-in email. Please use the correct email.");
      return;
    }

    const session_id = localStorage.getItem("session_id");
    const teacher_email = localStorage.getItem("teacher_email");

    if (!session_id || !teacher_email) {
      setMessage("Session not selected. Please scan the QR code or paste the session URL.");
      return;
    }

    // get user IP address (best effort)
    let IP = "";
    try {
      axios.defaults.withCredentials = false;
      const res = await axios.get("https://api64.ipify.org?format=json");
      axios.defaults.withCredentials = true;
      IP = res?.data?.ip || "";
    } catch (err) {
      console.warn("Could not determine IP address", err);
      axios.defaults.withCredentials = true;
    }

    // get geolocation (best effort, with timeout fallback)
    const getLocation = () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          return resolve("");
        }

        const timeoutId = setTimeout(() => {
          resolve("");
        }, 5000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            const { latitude, longitude } = position.coords;
            resolve(`${latitude},${longitude}`);
          },
          () => {
            clearTimeout(timeoutId);
            resolve("");
          },
          { timeout: 5000 }
        );
      });

    const locationString = await getLocation();

    const formData = {
      token: token,
      regno: regno,
      session_id: localStorage.getItem("session_id"),
      teacher_email: localStorage.getItem("teacher_email"),
      IP: IP,
      date: new Date().toISOString().split("T")[0],
      Location: locationString,
      student_email: localStorage.getItem("email"),
      image: photoData || image,
    };

    try {
      console.log("sending data to server", formData);
      const response = await axios.post("/sessions/attend_session", formData, { timeout: 30000 });
      const msg = response.data.message || "Attendance recorded";
      setMessage(msg);
      document.querySelector(".form-popup-inner").innerHTML = `<h5>${msg}</h5>`;
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Error recording attendance";
      setMessage(msg);
      if (err?.response?.status === 409) {
        setMessage(msg);
      }
    }
  };

  return (
    <div className="form-popup">
      <button onClick={togglePopup}>
        <strong>X</strong>
      </button>
      <div className="form-popup-inner">
        <h5>Enter Your Details</h5>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12 }}>Paste QR / Session URL (fallback):</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              style={{ flex: 1 }}
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="https://.../student-dashboard?session_id=...&email=..."
            />
            <button
              onClick={() => {
                try {
                  const val = qrInput.trim();
                  if (!val) return setMessage('Paste the QR URL or session query');
                  const url = new URL(val, window.location.origin);
                  const sid = url.searchParams.get('session_id') || url.searchParams.get('session');
                  const em = url.searchParams.get('email') || url.searchParams.get('teacher_email');
                  if (sid) localStorage.setItem('session_id', sid);
                  if (em) {
                    localStorage.setItem('teacher_email', em);
                    localStorage.setItem('email', em);
                  }
                  setMessage('Session set from pasted QR. You can now enter RegNo and press Done.');
                } catch (err) {
                  setMessage('Invalid URL');
                }
              }}
            >
              Use
            </button>
          </div>
        </div>
        {!photoData && cameraSupported && (
          <video ref={videoRef} width={300} autoPlay={true} />
        )}
        {photoData && <img src={photoData} width={300} alt="Captured" />}

        {!cameraSupported && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Capture a photo using your device camera:
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => {
                  const dataUrl = reader.result;
                  setPhotoData(dataUrl);
                  setImage(dataUrl);
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
        )}

        <div className="cam-btn">
          <button onClick={startCamera}>Start Camera</button>
          <button onClick={capturePhoto}>Capture</button>
          <button onClick={ResetCamera}>Reset</button>
        </div>

        <form onSubmit={AttendSession}>
          <input
            type="text"
            name="regno"
            placeholder="RegNo"
            autoComplete="off"
          />
          <input
            type="email"
            name="studentEmail"
            placeholder="Your Email"
            defaultValue={localStorage.getItem("email") || ""}
            autoComplete="off"
            readOnly
          />
          <button type="submit">Done</button>
        </form>
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
        <Toast message={message} onClose={() => setMessage('')} />
      </div>
    </div>
  );
};

export default StudentForm;
