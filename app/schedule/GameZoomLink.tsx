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
    return ()=>{
      document.body.style.overflow=''
    }
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
    const targetSize=window.innerWidth*.25
    const targetLeft=(window.innerWidth-targetSize)/2
    const targetTop=14

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
      transition:'left 630ms cubic-bezier(.16,.84,.2,1), top 630ms cubic-bezier(.16,.84,.2,1), width 630ms cubic-bezier(.16,.84,.2,1), height 630ms cubic-bezier(.16,.84,.2,1)'
    })

    document.body.appendChild(clone)

    const panel=document.querySelector<HTMLElement>('[data-calendar-panel="true"]')
    if(panel){
      panel.style.transition='opacity 220ms ease'
      panel.style.opacity='.72'
    }

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        clone.style.left=`${targetLeft}px`
        clone.style.top=`${targetTop}px`
        clone.style.width=`${targetSize}px`
        clone.style.height=`${targetSize}px`
      })
    })

    // Start loading the destination while the logo is still moving.
    window.setTimeout(()=>router.push(href),270)

    // Safety cleanup in case navigation is interrupted.
    window.setTimeout(()=>{
      if(window.location.pathname.includes('/schedule')){
        clone.remove()
        if(panel)panel.style.opacity=''
        setLeaving(false)
      }
    },1800)
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
