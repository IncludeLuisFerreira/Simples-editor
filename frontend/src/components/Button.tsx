export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="px-4 py-2 bg-[#7aa2f7] hover:bg-[#89b4fa] text-[#1a1b26] rounded transition-colors disabled:bg-[#565f89] disabled:cursor-not-allowed"
      {...props}
    >
      {children}
    </button>
  )
}
