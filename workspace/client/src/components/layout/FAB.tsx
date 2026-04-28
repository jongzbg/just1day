'use client'

export default function FAB() {
  return (
    <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50">
      <span
        className="material-symbols-outlined"
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        mail
      </span>
    </button>
  )
}