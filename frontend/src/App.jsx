import voisyLogo from "./assets/voisylogo.png";
import "./App.css";
import "./index.css";

function App() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img
            src={voisyLogo}
            className="base"
            width="300"
            height="300"
            alt=""
          />
        </div>
        <div className="space-x-2">
          <button
            className="voisy-btn"
            // onClick={}
          >
            Create Room
          </button>
          <button
            className="voisy-btn"
            // onClick={}
          >
            Enter a Room Code
          </button>
        </div>
      </section>
    </>
  );
}

export default App;
