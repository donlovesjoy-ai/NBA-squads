'use client'

import { ReactNode, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SwipeCalendar({
  previousHref,
  nextHref,
  children
}:{
  previousHref:string
  nextHref:string
  children:ReactNode
}){
  const router=useRouter()
  const startX=useRef<number|null>(null)
  const startY=useRef<number|null>(null)

  function onTouchStart(e:React.TouchEvent<HTMLDivElement>){
    const touch=e.touches[0]
    startX.current=touch.clientX
    startY.current=touch.clientY
  }

  function onTouchEnd(e:React.TouchEvent<HTMLDivElement>){
    if(startX.current===null||startY.current===null)return

    const touch=e.changedTouches[0]
    const dx=touch.clientX-startX.current
    const dy=touch.clientY-startY.current

    startX.current=null
    startY.current=null

    if(Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy))return

    if(dx<0)router.push(nextHref)
    else router.push(previousHref)
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{touchAction:'pan-y'}}
    >
      {children}
    </div>
  )
}
