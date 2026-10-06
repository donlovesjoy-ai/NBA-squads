'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export default function GameZoomLink({href,children,style}:{href:string;children:ReactNode;style?:CSSProperties}) {
  const router=useRouter()
  const [leaving,setLeaving]=useState(false)

  useEffect(()=>{
    router.prefetch(href)

    // Clear any scroll lock left behind by an older version of this transition.
    document.body.style.overflow=''

    return ()=>{
      document.body.style.overflow=''
    }
  },[href,router])

  function openGame(event:React.MouseEvent<HTMLButtonElement>){
    if(leaving)return
    setLeaving(true)

    const button=event.currentTarget
    const panel=document.querySelector<HTMLElement>('[data-calendar-panel="true"]')

    if(panel){
      const panelRect=panel.getBoundingClientRect()
      const buttonRect=button.getBoundingClientRect()
      const originX=buttonRect.left + buttonRect.width/2 - panelRect.left
      const originY=buttonRect.top + buttonRect.height/2 - panelRect.top

      panel.style.transformOrigin=`${originX}px ${originY}px`
      panel.style.willChange='transform, opacity'
      panel.style.transition='transform 180ms cubic-bezier(.18,.84,.22,1), opacity 180ms ease'
      panel.style.transform='scale(2.35)'
      panel.style.opacity='.94'
    }else{
      button.style.transition='transform 160ms cubic-bezier(.18,.84,.22,1)'
      button.style.transform='scale(1.8)'
    }

    // Begin navigation before the zoom fully finishes so there is no dead pause.
    window.setTimeout(()=>router.push(href),95)
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
      cursor:'pointer'
    }}
  >{children}</button>
}
