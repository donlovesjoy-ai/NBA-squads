'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const OVERLAY_ID='nba-game-logo-transition'
const SETTLE_PAUSE_MS=110

export default function GameDetailsReveal({
  logoUrl,
  logoAlt,
  children
}:{
  logoUrl?:string|null
  logoAlt:string
  children:ReactNode
}){
  const [visible,setVisible]=useState(false)

  useEffect(()=>{
    const overlay=document.getElementById(OVERLAY_ID) as HTMLElement | null

    if(!overlay){
      setVisible(true)
      return
    }

    const startedAt=Number(overlay.dataset.transitionStartedAt||0)
    const duration=Number(overlay.dataset.transitionDuration||630)
    const elapsed=startedAt ? Date.now()-startedAt : duration
    const remaining=Math.max(0,duration-elapsed)
    const revealDelay=remaining+SETTLE_PAUSE_MS

    const timer=window.setTimeout(()=>{
      setVisible(true)
      overlay.remove()
    },revealDelay)

    return ()=>{
      window.clearTimeout(timer)
    }
  },[])

  return <>
    <div style={{
      height:'25vw',
      minHeight:86,
      maxHeight:180,
      display:'flex',
      alignItems:'flex-start',
      justifyContent:'center'
    }}>
      {logoUrl&&<img
        src={logoUrl}
        alt={logoAlt}
        style={{
          width:'25vw',
          height:'25vw',
          minWidth:86,
          minHeight:86,
          maxWidth:180,
          maxHeight:180,
          objectFit:'contain',
          display:'block',
          opacity:visible?1:0,
          transition:'opacity 90ms ease'
        }}
      />}
    </div>

    <div style={{
      opacity:visible?1:0,
      transform:visible?'translateY(0)':'translateY(6px)',
      transition:'opacity 170ms ease, transform 170ms ease'
    }}>
      {children}
    </div>
  </>
}
