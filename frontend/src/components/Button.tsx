export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </button>
  )
}
