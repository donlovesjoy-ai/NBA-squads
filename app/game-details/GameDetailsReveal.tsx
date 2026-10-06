'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const OVERLAY_ID='nba-game-logo-transition'
const TRAVEL_MS=756
const SETTLE_PAUSE_MS=100
const FADE_MS=320

export default function GameDetailsReveal({children}:{children:ReactNode}){
  const wrapRef=useRef<HTMLDivElement>(null)
  const [visible,setVisible]=useState(false)

  useEffect(()=>{
    const overlay=document.getElementById(OVERLAY_ID) as HTMLImageElement | null
    const target=wrapRef.current?.querySelector<HTMLElement>('[data-logo-transition-target="true"]')

    if(!overlay||!target){
      setVisible(true)
      overlay?.remove()
      return
    }

    const rect=target.getBoundingClientRect()

    overlay.style.transition=[
      `left ${TRAVEL_MS}ms cubic-bezier(.16,.84,.2,1)`,
      `top ${TRAVEL_MS}ms cubic-bezier(.16,.84,.2,1)`,
      `width ${TRAVEL_MS}ms cubic-bezier(.16,.84,.2,1)`,
      `height ${TRAVEL_MS}ms cubic-bezier(.16,.84,.2,1)`
    ].join(', ')
    overlay.style.willChange='left, top, width, height'

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        overlay.style.left=`${rect.left}px`
        overlay.style.top=`${rect.top}px`
        overlay.style.width=`${rect.width}px`
        overlay.style.height=`${rect.height}px`
      })
    })

    const fadeTimer=window.setTimeout(()=>{
      setVisible(true)
    },TRAVEL_MS+SETTLE_PAUSE_MS)

    // Keep the moving logo on top for the first part of the fade, then remove it
    // after the identical fixed logo underneath is already visible.
    const removeTimer=window.setTimeout(()=>{
      overlay.remove()
    },TRAVEL_MS+SETTLE_PAUSE_MS+90)

    return ()=>{
      window.clearTimeout(fadeTimer)
      window.clearTimeout(removeTimer)
    }
  },[])

  return <div
    ref={wrapRef}
    style={{
      opacity:visible?1:0,
      transform:visible?'translateY(0)':'translateY(4px)',
      transition:`opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`
    }}
  >
    {children}
  </div>
}
