import { useState } from "react";

export default function DonateGolemPage() {
  const [flowers, setFlowers] = useState(12);
  const [message, setMessage] = useState("");

  const handleDonate = (amount: number) => {
    setFlowers((prev) => prev + amount);
    alert(`🌸 ${amount}개의 꽃이 골렘에게 전달됐어요!`);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6">
      {/* 골렘 애니메이션 */}
      <img
        src="/golem.png"
        alt="Golem"
        className="w-64 h-64 mb-4"
      />

      {/* 꽃 게이지 */}
      <div className="text-center mb-6">
        <p className="text-xl font-bold text-slate-800">
          총 받은 꽃 🌸 {flowers}개
        </p>
        <div className="w-64 h-3 bg-slate-200 rounded-full mt-2">
          <div
            className="h-full bg-pink-400 rounded-full"
            style={{ width: `${Math.min(flowers, 100)}%` }}
          />
        </div>
      </div>

      {/* 후원 입력 */}
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md space-y-4">
        <label className="block text-slate-600 font-medium">
          💬 응원 멘트
        </label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300"
          placeholder="예: 골렘아 힘내!"
        />
        <div className="flex gap-2 justify-between">
          {[1, 3, 5].map((amount) => (
            <button
              key={amount}
              onClick={() => handleDonate(amount)}
              className="flex-1 bg-pink-400 hover:bg-pink-500 text-white rounded-lg py-2 font-semibold"
            >
              🌸 꽃 {amount}개 주기
            </button>
          ))}
        </div>
      </div>

      {/* 후원자 리스트 */}
      <div className="mt-8 text-center text-sm text-slate-400">
        👑 Top Supporters 랭킹은 곧 추가됩니다...
      </div>
    </div>
  );
}
