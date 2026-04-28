//create a new session component
import React, { useEffect, useState } from "react";
import axios from "axios";
import QRCode from "qrcode.react";
import "../styles/SessionDetails.css";
import Toast from "../components/Toast";

const SessionDetails = (props) => {
  const [qr, setQR] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const session = props.currentSession && props.currentSession[0] ? props.currentSession[0] : null;

  async function getQR() {
    if (!session) return;
    try {
      const response = await axios.post('/sessions/getQR', {
        session_id: session.session_id,
        token: localStorage.getItem('token'),
      });
      setQR(response.data.url);
    } catch (error) {
      console.log(error);
    }
  }
  const [modalImage, setModalImage] = useState("");

  const showImage = (e) => {
    let image = e.target.src;
    setModalImage(image);
  };

  const closeModal = () => {
    setModalImage("");
  };
  const copyQR = () => {
    navigator.clipboard.writeText(qr);
  };

  function getDistance(distance, radius) {
    return {
      distance,
      color: distance <= parseFloat(radius) ? "green" : "red",
    };
  }

  // fetch QR when session becomes available
  useEffect(() => {
    if (session) getQR();
  }, [session]);

  const deleteSession = async () => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await axios.post('/sessions/delete', {
        session_id: session.session_id,
        email: localStorage.getItem('email'),
      });
      setToastMessage('Session deleted');
      if (props.refreshSessions) props.refreshSessions();
      props.toggleSessionDetails();
    } catch (err) {
      console.error(err);
      setToastMessage(err?.response?.data?.message || 'Failed to delete session');
    }
  };

  const showAttendees = async () => {
    try {
      const res = await axios.post('/sessions/attendees', {
        session_id: session.session_id,
      });
      const attendees = res.data.attendees || [];
      if (attendees.length === 0) {
        setToastMessage('No attendees yet');
        return;
      }
      const names = attendees.map((a) => a.student_name || a.student_email || a.regno).join(', ');
      setToastMessage(`Attendees: ${attendees.length} — ${names}`);
    } catch (err) {
      console.error(err);
      setToastMessage(err?.response?.data?.message || 'Failed to fetch attendees');
    }
  };

  const simulateAttendance = async () => {
    try {
      const res = await axios.post('/sessions/simulate', {
        session_id: session.session_id,
      });
      const a = res.data.attendee;
      setToastMessage('Simulated attendance for: ' + (a.student_name || a.student_email || a.regno));
      if (props.refreshSessions) props.refreshSessions();
    } catch (err) {
      console.error(err);
      setToastMessage(err?.response?.data?.message || 'Failed to simulate attendance');
    }
  };



  if (!session) {
    return (
      <div className="popup">
        <button onClick={props.toggleSessionDetails}>
          <strong>X</strong>
        </button>
        <div className="popup-inner">
          <div className="popup-content">
            <p>No session selected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="popup">
      <button onClick={props.toggleSessionDetails}>
        <strong>X</strong>
      </button>
      <div className="popup-inner">
        <div className="popup-content">
          <div className="session-details">
            <p>
              <strong>Session Name</strong>: {session.name}
            </p>
            <p>
              <strong>Session Date</strong>:{" "}
              {session.date ? session.date.split("T")[0] : ''}
            </p>
            <p>
              <strong>Session Time</strong>: {session.time}
            </p>
            <p>
              <strong>Session Duration</strong>:{" "}
              {session.duration}
            </p>
            <p>
              <strong>Session Location</strong>:{" "}
              {session.location}
            </p>
            <p>
              <strong>Session Radius</strong>: {session.radius}{" "}
              meters
            </p>
          </div>
          <div className="qr-code">
            <QRCode value={qr} onClick={copyQR} size={200} />
            <button onClick={copyQR} className="copybtn">
              Copy
            </button>
            <div style={{ marginTop: 10 }}>
              <button onClick={showAttendees} style={{ marginRight: 8 }}>
                Count Attendees
              </button>
              <button onClick={simulateAttendance} style={{ marginRight: 8 }}>
                Simulate Attendance
              </button>
              <button onClick={deleteSession} style={{ background: '#d9534f', color: 'white' }}>
                Delete Session
              </button>
            </div>
          </div>
        </div>
        <div className="student-list scrollable-content">
          <p>Students Attended:</p>
          <table>
            <thead>
              <tr>
                <th>Reg No</th>
                <th>IP</th>
                <th>Date</th>
                <th>Email</th>
                <th>Distance</th>
                <th>Image</th>
              </tr>
            </thead>
            <tbody>
              {(session.attendance || []).map((student, index) => {
                return (
                  <tr key={index}>
                    <td>{student.regno}</td>
                    <td>{student.IP}</td>
                    <td>{student.date ? student.date.split("T")[0] : ''}</td>
                    <td>{student.student_email}</td>
                    <th
                      key={index + "6"}
                      className="distance"
                      style={{
                        color: getDistance(
                          student.distance,
                          session.radius
                        ).color,
                      }}
                    >
                      {
                        getDistance(
                          student.distance,
                          session.radius
                        ).distance
                      }
                    </th>
                    {student.image !== undefined ? (
                      <td>
                        <img
                          src={student.image}
                          alt="student"
                          className="student-image"
                          width={100}
                          onClick={showImage}
                        />
                      </td>
                    ) : (
                      <td>No Image</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      {modalImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeModal}>
              ×
            </button>
            <img src={modalImage} alt="student" className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDetails;
