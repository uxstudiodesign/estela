import { useState, useRef, useEffect, type KeyboardEvent } from 'react'

interface SelectOption {
  readonly value: string
  readonly label: string
}

interface SelectProps {
  readonly label?: string
  readonly options: readonly SelectOption[]
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  readonly error?: string
  readonly searchable?: boolean
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  searchable = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = searchable && search
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(optionValue: string) {
    onChange(optionValue)
    setIsOpen(false)
    setSearch('')
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    }
  }

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-sm font-medium text-text mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full h-12 px-4 rounded-lg border bg-white text-left
          focus:outline-none focus:ring-2 focus:ring-navy
          flex items-center justify-between
          ${error ? 'border-danger' : 'border-surface-dark'}
        `.trim()}
      >
        <span className={selectedOption ? 'text-text' : 'text-text-light'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg className={`w-4 h-4 text-text-light transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-surface-dark rounded-lg shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-surface-dark">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 px-3 rounded border border-surface-dark text-sm focus:outline-none focus:ring-1 focus:ring-navy"
                placeholder="Search..."
                autoFocus
              />
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-text-light text-center">No results</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-4 py-3 text-left text-sm hover:bg-surface transition-colors
                  ${option.value === value ? 'bg-navy/5 text-navy font-medium' : 'text-text'}
                `.trim()}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  )
}
