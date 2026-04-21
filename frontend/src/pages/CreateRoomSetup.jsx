import { useState } from "react";
import { useNavigate } from "react-router-dom";
import voisyLogoNoBg from "../assets/voisylogo-noBg.png";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:8080";

function CreateRoomSetup() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [nickname, setNickname] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleContinue = async () => {
    const cleanRoomName = roomName.trim();
    const cleanNickname = nickname.trim();

    if (!cleanRoomName || !cleanNickname) {
      alert("Room name ve nickname girmen gerekiyor.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: cleanRoomName }),
      });

      if (!response.ok) {
        throw new Error("room create failed");
      }

      const payload = await response.json();
      const roomCode = payload.roomId;

      const roomSetup = {
        roomName: cleanRoomName,
        nickname: cleanNickname,
        roomCode,
      };

      localStorage.setItem("voisy-room-setup", JSON.stringify(roomSetup));
      navigate("/create/room", { state: roomSetup });
    } catch {
      alert("Room olusturulamadi. Backend server calisiyor mu kontrol et.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="min-h-screen w-full flex items-center justify-center px-4">
      <img
        src={voisyLogoNoBg}
        width="90"
        alt="Voisy logo"
        className="absolute left-6 top-5 z-10 md:left-8 md:top-6"
      />

      <div className="relative w-full max-w-2xl rounded-3xl bg-[#7ccfff] p-8 shadow-[0_18px_40px_rgba(5,55,92,0.24)]">
        <button
          onClick={() => navigate(-1)}
          className="absolute fredoka-title left-4 top-4 px-4 py-2 text-md text-white"
        >
          ← Back
        </button>

        <h1 className="fredoka-title text-3xl">Create Room</h1>
        <p className="mt-1 text-sm font-semibold text-[#194160]">
          Enter your room name and nickname to continue noisy chatting!
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="h-12 rounded-2xl bg-white px-4 text-base font-semibold text-[#102b43] outline-none ring-2 ring-transparent transition focus:ring-[#d36f02]"
          />

          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="h-12 rounded-2xl bg-white px-4 text-base font-semibold text-[#102b43] outline-none ring-2 ring-transparent transition focus:ring-[#d36f02]"
          />

          <button
            onClick={handleContinue}
            className="voisy-btn mt-2"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Enter"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default CreateRoomSetup;
