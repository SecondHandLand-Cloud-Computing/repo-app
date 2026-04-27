import React, { useState } from "react";

export default function Monitoring() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const grafanaBase = import.meta.env.VITE_GRAFANA_URL;
  const iframeSrc = `${grafanaBase}/d/backend-monitoring/backend-monitoring?orgId=1&refresh=5s`;

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className="space-y-4">
      {/* TITLE */}
      <h2 className="text-2xl font-bold text-gray-800">System Monitoring</h2>

      {/* CARD */}
      <div className="bg-white rounded-xl shadow-sm border p-6 relative">
        {/* Loading skeleton overlay */}
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <div className="w-full max-w-4xl p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4 w-1/3" />
                <div className="h-64 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        )}

        {/* CARD CONTENT */}
        {error ? (
          <div className="w-full h-[70vh] border rounded-lg flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 font-semibold mb-2">Không tải được Grafana dashboard.</p>
              <p className="text-sm text-gray-600">
                Vui lòng kiểm tra `VITE_GRAFANA_URL` và kết nối mạng.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
            <iframe
              src={iframeSrc}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Grafana Monitoring Dashboard"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
