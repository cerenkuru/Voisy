import voisyLogo from "./assets/voisylogo.png";
import "./App.css";
import "./index.css";
import { useNavigate } from "react-router-dom";
import CreateRoom from "./pages/CreateRoom";
import EnterRoom from "./pages/EnterRoom";
import CreateRoomSetup from "./pages/CreateRoomSetup";
import { Routes, Route } from "react-router-dom";
function Home() {
  const navigate = useNavigate();
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
          <button className="voisy-btn" onClick={() => navigate("/create")}>
            Create Room
          </button>
          <button className="voisy-btn" onClick={() => navigate("/enter")}>
            Enter a Room Code
          </button>
        </div>
      </section>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateRoomSetup />} />
      <Route path="/create/room" element={<CreateRoom />} />
      <Route path="/enter" element={<EnterRoom />} />
    </Routes>
  );
}

export default App;
