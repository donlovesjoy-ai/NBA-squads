'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export default function GameZoomLink({href,children,style}:{href:string;children:ReactNode;style?:CSSProperties}) {
  const router=useRouter()
  const [leaving,setLeaving]=useState(false)

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
      panel.style.transition='transform 340ms cubic-bezier(.2,.8,.2,1), filter 340ms ease'
      panel.style.transform='scale(1.42)'
      panel.style.filter='brightness(.98)'
      panel.style.willChange='transform'
      document.body.style.overflow='hidden'
    }else{
      button.style.transition='transform 300ms cubic-bezier(.2,.8,.2,1)'
      button.style.transform='scale(1.35)'
    }

    window.setTimeout(()=>router.push(href),300)
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
