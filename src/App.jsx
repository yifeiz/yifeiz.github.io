import { useState } from "react";

import profile from "./imgs/headshot.jpg";
import background from "./imgs/background.jpg";

import "./styles/App.scss";

const App = () => {
  const [loaded, setLoaded] = useState(false);
  // TODO: Restart css animation (https://css-tricks.com/restart-css-animation/)

  return (
    <div className={`home ${loaded ? `fade-in` : null}`}>
      <img src={background} style={{ display: "none" }} alt="temp-background" />
      <div className="drop" />
      <div
        className="wave"
        onAnimationEnd={() => {
          setLoaded(true);
        }}
      />

      <div className={`main-card ${loaded ? `fade-in` : null}`}>
        <img className="profile-img" src={profile} alt="profile" />
        <div className="card-text">
          Hey there! My name is Yifei Zhang, and I'm a 4th year Software
          Engineering student at the University of Waterloo.
        </div>
        <div className="card-text">
          Checkout some other SE students{" "}
          <a href="https://se-webring.xyz/">here!</a>
        </div>
      </div>
      <div className={`footer ${loaded ? `fade-in` : null}`}>
        <a
          href="https://github.com/yifeiz"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fab fa-github"></i>
        </a>
        <a
          href="https://www.linkedin.com/in/yifei-zhang1/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fab fa-linkedin-in"></i>
        </a>
        <a
          href="mailto:yifei.zhang@uwaterloo.ca"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="far fa-envelope"></i>
        </a>
        <a
          href={`${import.meta.env.BASE_URL}resume.pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Resume
        </a>
      </div>
    </div>
  );
};

export default App;
