import React from "react";

export default function PointsTable({
  show,
  onClose,
  loading,
  error,
  data = [],
}) {
  return !show ? null : (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-4 relative">
        <button
          className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500"
          onClick={onClose}
          title="Kapat"
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-3 text-purple-700 text-center">
          Puanlarım (Başlık Bazında)
        </h3>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Yükleniyor…</div>
        ) : error ? (
          <div className="text-center text-red-600 py-4">{error}</div>
        ) : data.length === 0 ? (
          <div className="text-center text-gray-500 py-6">Henüz veriniz yok.</div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-xl border">
            <table className="min-w-full text-xs">
              <thead className="bg-purple-100 sticky top-0">
                <tr>
                  <th className="p-2 border">Başlık</th>
                  <th className="p-2 border" title="Denenen (bilmem hariç) / Cevaplanan">
                    Den./Cev.
                  </th>
                  <th className="p-2 border">Doğru</th>
                  <th className="p-2 border">Yanlış</th>
                  <th className="p-2 border">Bilmem</th>
                  <th className="p-2 border" title="Doğru puan / Mümkün puan">
                    Puan
                  </th>
                  <th className="p-2 border">% Başarı</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr
                    key={r.survey_id || i}
                    className={
                      i === 0 ? "bg-green-50" : i === data.length - 1 ? "bg-red-50" : ""
                    }
                  >
                    <td className="p-2 border text-left">{r.title}</td>
                    <td className="p-2 border text-center">
                      {r.attempted}/{r.answered}
                    </td>
                    <td className="p-2 border text-center">{r.correct}</td>
                    <td className="p-2 border text-center">{r.wrong}</td>
                    <td className="p-2 border text-center">{r.bilmem}</td>
                    <td className="p-2 border text-center">
                      {r.earned_points}/{r.possible_points}
                    </td>
                    <td className="p-2 border text-center">
                      {r.score_percent ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
