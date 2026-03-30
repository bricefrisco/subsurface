export default function Placeholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
      <span className="text-[#569cd6] text-base font-semibold">{title}</span>
      <p className="text-[#858585] text-xs max-w-sm leading-relaxed">{description}</p>
    </div>
  )
}
