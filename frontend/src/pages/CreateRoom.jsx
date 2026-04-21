import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import voisyLogoNoBg from "../assets/voisylogo-noBg.png";

const SIGNALING_BASE_URL =
  import.meta.env.VITE_SIGNALING_BASE_URL ||
  "https://voisy-production.up.railway.app";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function CreateRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCopied, setIsCopied] = useState(false);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState("");
  const [selfId, setSelfId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Not connected");
  const [participants, setParticipants] = useState([]);

  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteAudiosRef = useRef(new Map());

  const savedSetup = JSON.parse(
    localStorage.getItem("voisy-room-setup") || "{}",
  );
  const roomName = location.state?.roomName || savedSetup.roomName || "My Room";
  const nickname = location.state?.nickname || savedSetup.nickname || "Guest";
  const roomCode = location.state?.roomCode || savedSetup.roomCode || "UNKNOWN";
  const voiceChannels = ["Enter Voice Chat"];

  const wsUrl = `${SIGNALING_BASE_URL.replace(/^http/, "ws")}/ws`;

  const sendSignalMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const ensureLocalStream = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    localStreamRef.current = stream;
    return stream;
  };

  const addRemoteAudio = (peerId, stream) => {
    let audio = remoteAudiosRef.current.get(peerId);
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      remoteAudiosRef.current.set(peerId, audio);
    }

    audio.srcObject = stream;
    audio.play().catch(() => {
      // Audio playback might require another user gesture on some browsers.
    });
  };

  const createPeerConnection = async (peerId, shouldCreateOffer) => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId);
    }

    const stream = await ensureLocalStream();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      sendSignalMessage({
        type: "signal",
        target: peerId,
        payload: {
          candidate: event.candidate,
        },
      });
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        addRemoteAudio(peerId, remoteStream);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);

    if (shouldCreateOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignalMessage({
        type: "signal",
        target: peerId,
        payload: {
          description: pc.localDescription,
        },
      });
    }

    return pc;
  };

  const handleSignal = async (fromPeerId, payload) => {
    if (!payload) {
      return;
    }

    const shouldCreate = Boolean(payload.description?.type === "offer");
    const pc = await createPeerConnection(fromPeerId, false);

    if (payload.description) {
      await pc.setRemoteDescription(payload.description);

      if (shouldCreate) {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignalMessage({
          type: "signal",
          target: fromPeerId,
          payload: {
            description: pc.localDescription,
          },
        });
      }
    }

    if (payload.candidate) {
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch {
        // Ignore stale candidates during peer disconnect.
      }
    }
  };

  const handlePeerLeft = (peerId) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }

    const audio = remoteAudiosRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      remoteAudiosRef.current.delete(peerId);
    }

    setParticipants((prev) => prev.filter((peer) => peer.id !== peerId));
  };

  const connectVoice = async () => {
    if (!roomCode || roomCode === "UNKNOWN") {
      alert("Room code yok. Lutfen tekrar odaya gir.");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      await ensureLocalStream();
      setConnectionStatus("Connecting...");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        sendSignalMessage({
          type: "join",
          roomId: roomCode,
          nickname,
        });
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.type === "joined") {
          setSelfId(message.selfId);
          setConnectionStatus("Connected");

          const peers = message.peers || [];
          setParticipants([{ id: message.selfId, nickname }, ...peers]);

          for (const peer of peers) {
            await createPeerConnection(peer.id, true);
          }
        }

        if (message.type === "peer-joined" && message.peer) {
          setParticipants((prev) => {
            if (prev.some((peer) => peer.id === message.peer.id)) {
              return prev;
            }
            return [...prev, message.peer];
          });
        }

        if (message.type === "signal") {
          await handleSignal(message.from, message.payload);
        }

        if (message.type === "peer-left") {
          handlePeerLeft(message.peerId);
        }

        if (message.type === "error") {
          setConnectionStatus(`Error: ${message.message}`);
        }
      };

      ws.onclose = () => {
        setConnectionStatus("Disconnected");
      };

      ws.onerror = () => {
        setConnectionStatus("Connection error");
      };
    } catch {
      setConnectionStatus("Microphone permission denied");
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState <= 1) {
        wsRef.current.close();
      }

      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      remoteAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      remoteAudiosRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      setIsCopied(false);
      alert("Kopyalanamadi. Room code: " + roomCode);
    }
  };

  return (
    <section className="relative min-h-screen w-full px-4 py-6 md:px-6 md:py-8">
      <img
        src={voisyLogoNoBg}
        width="90"
        alt="Voisy logo"
        className="absolute left-6 top-5 z-10 md:left-8 md:top-6"
      />

      <div className="mx-auto mt-16 flex h-[calc(100vh-6.5rem)] w-full max-w-7xl gap-4 md:gap-6">
        <aside className="flex w-[280px] shrink-0 flex-col rounded-3xl bg-[#7ccfff] p-4 shadow-[0_18px_40px_rgba(5,55,92,0.24)] md:p-5">
          <h2 className="mb-1 text-lg font-extrabold text-[#08233d] fredoka-title">
            {roomName}
          </h2>

          <button
            onClick={handleCopyCode}
            className="mb-4 rounded-2xl border border-[#4697c8] bg-white px-4 py-3 text-left transition hover:shadow-md"
            title="Click to copy"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#3d6a88]">
              Room Code
            </p>
            <p className="mt-1 text-lg font-black tracking-wide text-[#08233d]">
              {roomCode}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#d26002]">
              {isCopied ? "Copied!" : "Tap to copy"}
            </p>
          </button>

          <div className="space-y-2">
            {voiceChannels.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={async () => {
                  setActiveVoiceChannel(channel);
                  await connectVoice();
                }}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                  activeVoiceChannel === channel
                    ? "bg-[#d36f02] text-white"
                    : "bg-[#99dcff] text-[#09304f] hover:bg-[#8ad4fb]"
                }`}
              >
                <div>{channel}</div>
                {activeVoiceChannel === channel && (
                  <div className="mt-1 text-xs font-semibold text-white/95">
                    Joined: {nickname}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-xl bg-[#99dcff] px-3 py-2 text-left text-xs font-semibold text-[#09304f]">
            Status: {connectionStatus}
          </div>

          <div className="mt-2 rounded-xl bg-[#99dcff] px-3 py-2 text-left text-xs font-semibold text-[#09304f]">
            Participants: {participants.length}
            <div className="mt-1 space-y-1">
              {participants.map((peer) => (
                <div key={peer.id}>
                  {peer.nickname}
                  {peer.id === selfId ? " (You)" : ""}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => navigate("/")} className="voisy-btn mt-auto">
            Exit
          </button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col rounded-3xl bg-[#a8e2ff] p-4 shadow-[0_18px_40px_rgba(5,55,92,0.24)] md:p-6">
          <div className="mb-4 rounded-2xl bg-[#7ccfff] px-4 py-3">
            <p className="mt-1 text-sm font-semibold text-[#245173]">
              Chat as {nickname}
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-[#d7f1ff] p-4">
            <div className="max-w-[75%] rounded-2xl bg-white px-4 py-3 text-[#102b43] shadow-sm">
              Hey everyone, welcome to the room.
            </div>
            <div className="ml-auto max-w-[75%] rounded-2xl bg-[#d36f02] px-4 py-3 text-white shadow-sm">
              Nice! I can hear you clearly.
            </div>
            <div className="max-w-[75%] rounded-2xl bg-white px-4 py-3 text-[#102b43] shadow-sm">
              Great, let&apos;s start the session.
            </div>
          </div>

          <div className="mt-2 flex gap-3">
            <input
              type="text"
              placeholder="Type your message..."
              className="h-12 flex-1 rounded-2xl bg-white px-4 text-base font-semibold text-[#102b43] outline-none ring-2 ring-transparent transition focus:ring-[#d36f02]"
            />
            {/* <button className="voisy-btn h-10">Send</button> */}
          </div>
        </main>
      </div>
    </section>
  );
}

export default CreateRoom;
