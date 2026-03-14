import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import "../styles/bingo-theme.css";

interface GameProps {
  gameId: number;
  roomId: number;
}

export default function BingoGame({ gameId, roomId }: GameProps) {
  const { user } = useAuth();
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [myCardNumbers, setMyCardNumbers] = useState<number[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [winners, setWinners] = useState<number[]>([]);

  const { data: game, refetch: refetchGame } = trpc.bingo.getGame.useQuery({ gameId });
  const { data: myCard } = trpc.bingo.getMyCard.useQuery({ gameId });

  const startGameMutation = trpc.bingo.startGame.useMutation({
    onSuccess: () => {
      refetchGame();
    },
  });

  useEffect(() => {
    if (game) {
      const drawn = Array.isArray(game.drawnNumbers) ? game.drawnNumbers : [];
      setDrawnNumbers(drawn);
      const gameWinners = Array.isArray(game.winners) ? game.winners : [];
      if (gameWinners.length > 0) {
        setWinners(gameWinners);
      }
    }
  }, [game]);

  useEffect(() => {
    if (myCard) {
      setMyCardNumbers(Array.isArray(myCard.numbers) ? myCard.numbers : []);
      setMarkedNumbers(Array.isArray(myCard.markedNumbers) ? myCard.markedNumbers : []);
    }
  }, [myCard]);

  const handleStartGame = async () => {
    await startGameMutation.mutateAsync({ roomId });
  };

  const handleMarkCell = (number: number) => {
    if (!markedNumbers.includes(number) && drawnNumbers.includes(number)) {
      setMarkedNumbers([...markedNumbers, number]);
    }
  };

  const currentDrawn = drawnNumbers[drawnNumbers.length - 1];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)", padding: "24px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* 頁面標題 */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "40px", fontWeight: "700", color: "#d4af37", marginBottom: "8px" }}>
            賓果遊戲進行中
          </h1>
          <p style={{ fontSize: "14px", color: "#b0b0b0" }}>
            狀態：{game?.status === "playing" ? "進行中" : game?.status === "finished" ? "已結束" : "等待中"}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
          {/* 左側：號碼抽取區 */}
          <Card style={{
            background: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            borderRadius: "16px",
            padding: "32px",
          }}>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#d4af37", marginBottom: "24px" }}>
              號碼抽取
            </h2>

            {/* 當前號碼顯示 */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              {currentDrawn ? (
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #e8c547 0%, #d4af37 100%)",
                    color: "#1a1a1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: "48px",
                    fontWeight: "700",
                    boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
                  }}
                >
                  {currentDrawn}
                </div>
              ) : (
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "var(--bingo-gray-800)",
                  border: "2px solid var(--bingo-gray-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "var(--bingo-gray-500)",
                  fontSize: "18px",
                }}>
                  未開始
                </div>
              )}
              <p style={{ fontSize: "14px", color: "#b0b0b0", marginBottom: "8px" }}>
                已抽出 {drawnNumbers.length} 個號碼
              </p>
            </div>

            {/* 抽號按鈕 */}
            {game?.status === "playing" && (
              <Button
                onClick={handleStartGame}
                disabled={startGameMutation.isPending}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: "linear-gradient(135deg, #e8c547 0%, #d4af37 100%)",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "18px",
                  cursor: "pointer",
                  marginBottom: "24px",
                  opacity: startGameMutation.isPending ? 0.5 : 1,
                }}
              >
                {startGameMutation.isPending ? "抽取中..." : "抽取下一個號碼"}
              </Button>
            )}

            {/* 已抽出的號碼列表 */}
            <div style={{ marginTop: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#d4af37", marginBottom: "12px", textTransform: "uppercase" }}>
                抽出號碼歷史
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
                gap: "8px",
                maxHeight: "200px",
                overflowY: "auto",
              }}>
                {drawnNumbers.map((num) => (
                  <div
                    key={num}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px",
                      background: "linear-gradient(135deg, #e8c547 0%, #d4af37 100%)",
                      color: "#1a1a1a",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "12px",
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 右側：我的賓果卡 */}
          <Card style={{
            background: "linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            borderRadius: "16px",
            padding: "32px",
          }}>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#d4af37", marginBottom: "24px" }}>
              我的賓果卡
            </h2>

            {myCardNumbers.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "12px",
              }}>
                {myCardNumbers.map((num) => (
                  <div
                    key={num}
                    onClick={() => handleMarkCell(num)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      aspectRatio: "1",
                      background: markedNumbers.includes(num) 
                        ? "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)" 
                        : drawnNumbers.includes(num)
                        ? "linear-gradient(135deg, #e8c547 0%, #d4af37 100%)"
                        : "linear-gradient(135deg, #404040 0%, #2d2d2d 100%)",
                      color: markedNumbers.includes(num) ? "#1a1a1a" : drawnNumbers.includes(num) ? "#1a1a1a" : "#d4af37",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "14px",
                      cursor: drawnNumbers.includes(num) ? "pointer" : "not-allowed",
                      opacity: drawnNumbers.includes(num) ? 1 : 0.5,
                      border: markedNumbers.includes(num) ? "2px solid #22c55e" : "1px solid rgba(212, 175, 55, 0.2)",
                      transition: "all 200ms",
                    }}
                    onMouseOver={(e) => {
                      if (drawnNumbers.includes(num)) {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#b0b0b0" }}>
                載入賓果卡中...
              </div>
            )}

            {/* 賓果狀態 */}
            {myCard?.isBingo === 1 && (
              <div style={{
                marginTop: "24px",
                padding: "16px",
                background: "rgba(74, 222, 128, 0.1)",
                border: "2px solid #4ade80",
                borderRadius: "12px",
                textAlign: "center",
                color: "#4ade80",
                fontWeight: "600",
                fontSize: "18px",
              }}>
                🎉 恭喜！您已賓果！
              </div>
            )}
          </Card>
        </div>

        {/* 獲勝者公告 */}
        {winners.length > 0 && (
          <Card style={{
            background: "linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(74, 222, 128, 0.05) 100%)",
            border: "2px solid #4ade80",
            borderRadius: "16px",
            padding: "24px",
            textAlign: "center",
          }}>
            <h3 style={{ fontSize: "24px", fontWeight: "700", color: "#4ade80", marginBottom: "12px" }}>
              🏆 遊戲結束！
            </h3>
            <p style={{ fontSize: "16px", color: "#b0b0b0" }}>
              恭喜 {winners.length} 位玩家賓果！
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
