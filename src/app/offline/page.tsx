export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-8 bg-background">
      <div className="text-6xl">📡</div>
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-primary-container">
          Sedang Offline
        </h1>
        <p className="text-text-secondary text-sm max-w-xs">
          Tidak ada koneksi internet. Halaman ini belum tersedia secara offline.
          Coba buka halaman yang pernah dikunjungi sebelumnya.
        </p>
      </div>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-3 rounded-xl bg-surface-container text-text-primary text-sm border border-border"
      >
        Kembali
      </button>
    </div>
  )
}
