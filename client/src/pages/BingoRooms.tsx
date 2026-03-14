import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import "../styles/bingo-theme.css";

interface Room {
  id: number;
  name: string;
  description: string | null;
  status: "waiting" | "playing" | "finished";
  maxPlayers: number;
  currentPlayers: number;
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function BingoRooms() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(20);

  const { data: rooms, isLoading, refetch } = trpc.bingo.listRooms.useQuery({
    limit: 50,
    offset: 0,
  });

  const createRoomMutation = trpc.bingo.createRoom.useMutation({
    onSuccess: () => {
      setNewRoomName("");
      setNewRoomDesc("");
      setMaxPlayers(20);
      setShowCreateForm(false);
      refetch();
    },
  });

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    await createRoomMutation.mutateAsync({
      name: newRoomName,
      description: newRoomDesc,
      maxPlayers,
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = "bingo-status-badge";
    return `${baseClass} ${status}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* 頁面標題 */}
        <div style={{ marginBottom: "48px" }}>
          <h1 style={{ fontSize: "48px", fontWeight: "700", color: "#d4af37", marginBottom: "8px" }}>
            賓果遊戲大廳
          </h1>
          <p style={{ fontSize: "16px", color: "#b0b0b0" }}>
            選擇一個房間加入，或創建屬於你的遊戲房間
          </p>
        </div>

        {/* 創建房間按鈕 */}
        {user && (
          <div style={{ marginBottom: "32px" }}>
            {!showCreateForm ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: "12px 32px",
                  background: "linear-gradient(135deg, #e8c547 0%, #d4af37 100%)",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "16px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
                  transition: "all 300ms",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(212, 175, 55, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(212, 175, 55, 0.3)";
                }}
              >
                + 創建新房間
              </Button>
            ) : (
              <Card style={{
                background: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                borderRadius: "12px",
                padding: "24px",
                maxWidth: "500px",
              }}>
                <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px", color: "#d4af37" }}>
                  創建新房間
                </h3>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#d4af37", fontWeight: "500" }}>
                    房間名稱
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="輸入房間名稱..."
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#1a1a1a",
                      border: "1px solid #404040",
                      borderRadius: "8px",
                      color: "#f0f0f0",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#d4af37", fontWeight: "500" }}>
                    房間描述（選填）
                  </label>
                  <textarea
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="輸入房間描述..."
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#1a1a1a",
                      border: "1px solid #404040",
                      borderRadius: "8px",
                      color: "#f0f0f0",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      minHeight: "80px",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", color: "#d4af37", fontWeight: "500" }}>
                    最大玩家數
                  </label>
                  <input
                    type="number"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Math.min(100, Math.max(2, parseInt(e.target.value) || 2)))}
                    min="2"
                    max="100"
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#1a1a1a",
                      border: "1px solid #404040",
                      borderRadius: "8px",
                      color: "#f0f0f0",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <Button
                    onClick={handleCreateRoom}
                    disabled={createRoomMutation.isPending || !newRoomName.trim()}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "linear-gradient(135deg, #e8c547 0%, #d4af37 100%)",
                      color: "#1a1a1a",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                      opacity: createRoomMutation.isPending || !newRoomName.trim() ? 0.5 : 1,
                    }}
                  >
                    {createRoomMutation.isPending ? "創建中..." : "創建房間"}
                  </Button>
                  <Button
                    onClick={() => setShowCreateForm(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#404040",
                      color: "#d4af37",
                      border: "1px solid #d4af37",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    取消
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 房間列表 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {isLoading ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 24px", color: "#b0b0b0" }}>
              載入中...
            </div>
          ) : rooms && rooms.length > 0 ? (
            rooms.map((room: Room) => (
              <Card
                key={room.id}
                style={{
                  background: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  borderRadius: "12px",
                  padding: "24px",
                  transition: "all 300ms",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.5)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(212, 175, 55, 0.2)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.2)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#d4af37", marginBottom: "8px" }}>
                    {room.name}
                  </h3>
                  {room.description && (
                    <p style={{ fontSize: "14px", color: "#b0b0b0", marginBottom: "12px" }}>
                      {room.description}
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={getStatusBadgeClass(room.status)}>
                    {room.status === "waiting" && "等待中"}
                    {room.status === "playing" && "進行中"}
                    {room.status === "finished" && "已結束"}
                  </span>
                  <span style={{ fontSize: "14px", color: "#d4af37", fontWeight: "600" }}>
                    {room.currentPlayers}/{room.maxPlayers} 玩家
                  </span>
                </div>

                <Button
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "linear-gradient(135deg, #e8c547 0%, #d4af37 100%)",
                    color: "#1a1a1a",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 300ms",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  進入房間
                </Button>
              </Card>
            ))
          ) : (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 24px", color: "#b0b0b0" }}>
              暫無房間，創建一個新房間開始遊戲吧！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
