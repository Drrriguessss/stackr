'use client'
import ContentCard from './ContentCard'

interface ContentSectionProps {
  title: string
  items: any[]
  category: string
  onAddToLibrary: (item: any, status: string) => void
  library: any[]
  onOpenGameDetail?: (gameId: string) => void // ✅ Optionnel
}

export default function ContentSection({ 
  title, 
  items, 
  category, 
  onAddToLibrary, 
  library, 
  onOpenGameDetail 
}: ContentSectionProps) {
  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors">
          See all
        </button>
      </div>

      {/* Cards Grid - Mobile optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            category={category}
            onAddToLibrary={onAddToLibrary}
            library={library}
            onOpenGameDetail={onOpenGameDetail}
          />
        ))}
      </div>
    </section>
  )
}