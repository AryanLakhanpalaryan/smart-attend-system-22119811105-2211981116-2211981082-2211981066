import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Dashboard.css";
import { useNavigate } from "react-router-dom";
import NewSession from "./NewSession";
import SessionDetails from "./SessionDetails";
import Toast from "../components/Toast";

axios.defaults.withCredentials = true;

const TeacherDashboard = () => {
  //eslint-disable-next-line
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [sessionList, setSessionList] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSessionDisplay, setSessionDisplay] = useState(false);
  const [currentSession, setCurrentSession] = useState("");
  const navigate = useNavigate();

  //update list of sessions
  const updateList = async () => {
    try {
      const response = await axios.post("/sessions/getSessions", {
        token: token,
        email: localStorage.getItem("email"),
      });
      setSessionList(response.data.sessions);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSessionDetails = (e) => {
    //get the session details that has session_id = e
    setCurrentSession(
      sessionList.filter((session) => {
        return session.session_id === e;
      })
    );
    setSessionDisplay(!isSessionDisplay);
  };

  const togglePopup = () => {
    setIsOpen(!isOpen);
  };
  useEffect(() => {
    if (token === "" || token === undefined) {
      navigate("/login");
    } else {
      updateList();
      document.querySelector(".logout").style.display = "block";
    }
  }, [token]);

  const FlashCard = ({ session }) => {
    const attendance = session.attendance || [];
    const attendeeCount = attendance.length;
    const avgDistance = attendeeCount > 0 ? (attendance.reduce((sum, a) => sum + parseFloat(a.distance || 0), 0) / attendeeCount).toFixed(2) : 0;

    return (
      <div
        className="flashcard"
        onClick={() => toggleSessionDetails(session.session_id)}
      >
        <div className="front">
          <h4>{session.name}</h4>
          <p>Attendees: {attendeeCount}</p>
          <p>Avg Distance: {avgDistance} m</p>
          <div style={{ marginTop: 8 }}>
            <input type="number" defaultValue={10} id={`bulk-${session.session_id}`} style={{ width: 80, marginRight: 8 }} />
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const val = document.getElementById(`bulk-${session.session_id}`).value || '10';
                try {
                  const res = await axios.post('/sessions/simulate-bulk', { session_id: session.session_id, count: Number(val) });
                  setToastMessage(`${res.data.added.length} simulated attendees added.`);
                  updateList();
                } catch (err) {
                  console.error(err);
                  setToastMessage(err?.response?.data?.message || 'Failed to bulk simulate');
                }
              }}
            >
              Bulk Simulate
            </button>
          </div>
        </div>
      </div>
    );
  };

  const [toastMessage, setToastMessage] = useState("");

  return (
    <div className="dashboard-main">
      <div className="row1">
        <div className="heading">
          <h2>Your Sessions</h2>
        </div>
        <div className="createbtncol">
          <button onClick={togglePopup} className="createbtn">
            Create Session
          </button>
        </div>
      </div>
      <div className="session-list">
        {sessionList.length > 0 ? (
          sessionList.map((session, index) => {
            return (
              <div
                key={index + session.session_id}
                className="flashcard"
                onClick={() => {
                  toggleSessionDetails(session.session_id);
                }}
              >
                <FlashCard session={session} />
              </div>
            );
          })
        ) : (
          <p>No sessions found</p>
        )}
      </div>
      {isSessionDisplay && (
        <div className="popup-overlay">
              <SessionDetails
                currentSession={currentSession}
                toggleSessionDetails={toggleSessionDetails}
                refreshSessions={updateList}
              />
        </div>
      )}
      {isOpen && (
        <div className="popup-overlay">
          <NewSession togglePopup={togglePopup} />
        </div>
      )}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
};

export default TeacherDashboard;
