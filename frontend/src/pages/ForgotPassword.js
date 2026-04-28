import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import image512 from "../assets/logo512.png";
import image192 from "../assets/logo192.png";
import { SHA256 } from "crypto-js";
import Toast from "../components/Toast";

const ForgotPassword = () => {
  // eslint-disable-next-line
  const [showPassword, setShowPassword] = useState(false);
  // eslint-disable-next-line
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [toastMessage, setToastMessage] = useState("");
  const navigate = useNavigate();

  function computeHash(input) {
    return SHA256(input).toString();
  }

  const toggleTwo = async (e) => {
    e.preventDefault();
    const email = document.querySelector("input[name=email]").value;
    if (email === "") {
      setToastMessage("Please enter your email");
      return;
    }
    try {
      // Skip OTP step: go directly to new-password page
      document.querySelector(".page1").style.display = "none";
      document.querySelector(".page3").style.display = "block";
    } catch (error) {
      setToastMessage("Error processing request");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    let password = document.querySelector("input[name=password]").value;
    const cpassword = document.querySelector("input[name=cpassword]").value;
    if (password.length > 0 && cpassword.length > 0) {
      if (password === cpassword) {
        const email = document.querySelector("input[name=email]").value;
        password = computeHash(password);
        password = computeHash(email + password);

        const formData = {
          email,
          password,
        };
        try {
          await axios.post(
            "http://localhost:5050/users/forgotpassword",
            formData
          );
          navigate("/login");
        } catch (err) {
          console.log(err);
        }
      } else {
        setToastMessage("Passwords do not match");
      }
    } else {
      setToastMessage("Please fill all the fields");
    }
  };

  useEffect(() => {
    if (token !== "") {
      navigate("/dashboard");
    }
  });

  return (
    <div className="register-main">
      <div className="register-left">
        <img alt="Full" src={image512} />
      </div>
      <div className="register-right">
        <div className="register-right-container">
          <div className="register-logo">
            <img alt="logo" src={image192} />
          </div>
          <div className="register-center">
            <h2>Forgot your Password?</h2>
            <form onSubmit={handleRegisterSubmit}>
              <div className="page1">
                <p>Please enter your Email Id</p>
                <input type="email" placeholder="Email" required name="email" />
                <button type="button" onClick={toggleTwo}>
                  Next
                </button>
              </div>
              {/* OTP step removed - skipped */}
              <div className="page3" style={{ display: "none" }}>
                <p>Please enter new password</p>
                <input
                  type="password"
                  placeholder="New Password"
                  required
                  name="password"
                />
                <input
                  type="password"
                  placeholder=" Confirm New Password"
                  required
                  name="cpassword"
                />
                <button type="submit">Change Password</button>
              </div>
            </form>
          </div>
          <p className="login-bottom-p">
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#76ABAE" }}>
              Login
            </Link>
          </p>
          <Toast message={toastMessage} onClose={() => setToastMessage("")} />
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
