'use client'
import ContentCard from './ContentCard'

interface ContentSectionProps {
  title: string
  items: any[]
  category: string
  onAddToLibrary: (item: any, status: string) => void
  library: any[]
  onOpenGameDetail?: (gameId: string) => void
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

      {/* ✅ Carrousel horizontal au lieu de grid */}
      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-32">
            <ContentCard
              item={item}
              category={category}
              onAddToLibrary={onAddToLibrary}
              library={library}
              onOpenGameDetail={onOpenGameDetail}
            />
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}