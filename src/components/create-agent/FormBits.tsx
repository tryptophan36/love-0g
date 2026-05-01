type FieldProps = {
  q: string
  children: React.ReactNode
}

type TextInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  maxLength?: number
}

export function Field({ q, children }: FieldProps) {
  return (
    <div className="space-y-2.5">
      <p className="text-white/80 font-medium">{q}</p>
      {children}
    </div>
  )
}

export function TextInput({ value, onChange, placeholder, maxLength }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full bg-og-surface border border-og-border rounded-xl px-4 py-3 text-white
                 placeholder-og-label/50 text-base focus:outline-none focus:border-og-accent/60
                 transition-colors"
    />
  )
}
