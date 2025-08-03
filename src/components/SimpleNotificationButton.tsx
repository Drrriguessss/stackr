'use client'

import { Bell } from 'lucide-react'

export default function SimpleNotificationButton() {
  const handleClick = () => {
    console.log('🔔 Simple notification button clicked!')
    alert('Notification button works!')
  }

  return (
    <button
      onClick={handleClick}
      className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Test notification button"
    >
      <Bell size={20} className="text-gray-600" />
    </button>
  )
}