import { useState } from "react";
import { useNavigate } from "react-router-dom";
import voisyLogoNoBg from "../assets/voisylogo-noBg.png";

function EnterRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    const cleanRoomCode = roomCode.trim().toUpperCase();
    const cleanNickname = nickname.trim();

    if (!cleanRoomCode) {
      alert("Room code gir!");
      return;
    }

    if (!cleanNickname) {
      alert("Nickname gir!");
      return;
    }

    const roomSetup = {
      roomCode: cleanRoomCode,
      roomName: `Room ${cleanRoomCode}`,
      nickname: cleanNickname,
    };

    navigate("/create/room", { state: roomSetup });
  };

  return (
    <section className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-[#7ccfff] p-8 ">
        <div className="mb-3 flex flex-col items-center">
          <img src={voisyLogoNoBg} width="130" alt="Voisy logo" />
          <h1 className="fredoka-title text-3xl">Enter Room</h1>
        </div>

        <div className="flex flex-col items-center gap-4">
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="h-14 w-full max-w-2xl rounded-2xl bg-white px-5 text-lg font-semibold text-[#0f2940] outline-none ring-2 ring-transparent transition focus:ring-[#d36f02]"
          />
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="h-14 w-full max-w-2xl rounded-2xl bg-white px-5 text-lg font-semibold text-[#0f2940] outline-none ring-2 ring-transparent transition focus:ring-[#d36f02]"
          />
          <div className="flex flex-row items-center gap-1">
            <button onClick={handleJoin} className="voisy-btn px-8 py-3">
              Enter a room
            </button>
            <button onClick={() => navigate("/")} className="voisy-btn">
              ← Back
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EnterRoom;
