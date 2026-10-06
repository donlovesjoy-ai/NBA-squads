'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

const OVERLAY_ID='nba-game-logo-transition'

export default function GameZoomLink({href,children,style}:{href:string;children:ReactNode;style?:CSSProperties}) {
  const router=useRouter()
  const [leaving,setLeaving]=useState(false)

  useEffect(()=>{
    router.prefetch(href)
  },[href,router])

  function openGame(event:React.MouseEvent<HTMLButtonElement>){
    if(leaving)return
    setLeaving(true)

    const button=event.currentTarget
    const logo=button.querySelector('img')

    if(!logo){
      router.push(href)
      return
    }

    document.getElementById(OVERLAY_ID)?.remove()

    const rect=logo.getBoundingClientRect()
    const clone=logo.cloneNode(true) as HTMLImageElement
    clone.id=OVERLAY_ID
    clone.setAttribute('aria-hidden','true')

    Object.assign(clone.style,{
      position:'fixed',
      left:`${rect.left}px`,
      top:`${rect.top}px`,
      width:`${rect.width}px`,
      height:`${rect.height}px`,
      objectFit:'contain',
      margin:'0',
      zIndex:'99999',
      pointerEvents:'none',
      transform:'translateZ(0)',
      willChange:'left, top, width, height',
      transition:'none'
    })

    document.body.appendChild(clone)

    const panel=document.querySelector<HTMLElement>('[data-calendar-panel="true"]')
    if(panel){
      panel.style.transition='opacity 140ms ease'
      panel.style.opacity='.72'
    }

    // Move to the destination almost immediately. The destination page controls
    // the actual logo flight so it can land exactly in the correct matchup slot.
    window.setTimeout(()=>router.push(href),40)

    window.setTimeout(()=>{
      if(window.location.pathname.includes('/schedule')){
        clone.remove()
        if(panel)panel.style.opacity=''
        setLeaving(false)
      }
    },2200)
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
