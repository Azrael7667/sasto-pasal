export default function Placeholder({ title }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="card p-12 text-center">
        <p className="text-gray-400 text-lg">🚧 Coming in next step</p>
        <p className="text-gray-300 text-sm mt-2">This page will be built shortly</p>
      </div>
    </div>
  )
}
