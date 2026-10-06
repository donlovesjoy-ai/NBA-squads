'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export default function GameZoomLink({href,children,style}:{href:string;children:ReactNode;style?:CSSProperties}) {
  const router=useRouter()
  const [leaving,setLeaving]=useState(false)

  function openGame(){
    if(leaving)return
    setLeaving(true)
    window.setTimeout(()=>router.push(href),220)
  }

  return <button
    type="button"
    onClick={openGame}
    aria-label="Open game details"
    style={{
      ...style,
      appearance:'none',
      WebkitAppearance:'none',
      font:'inherit',
      cursor:'pointer',
      transform:leaving?'scale(1.22)':'scale(1)',
      opacity:leaving?.18:1,
      transition:'transform 220ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease',
      transformOrigin:'center center'
    }}
  >{children}</button>
}
