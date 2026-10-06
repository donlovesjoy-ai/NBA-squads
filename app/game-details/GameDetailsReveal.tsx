'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const OVERLAY_ID='nba-game-logo-transition'
const SETTLE_PAUSE_MS=90

export default function GameDetailsReveal({
  logoUrl,
  logoAlt,
  children
}:{
  logoUrl?:string|null
  logoAlt:string
  children:ReactNode
}){
  const [logoReady,setLogoReady]=useState(false)
  const [dataVisible,setDataVisible]=useState(false)

  useEffect(()=>{
    const overlay=document.getElementById(OVERLAY_ID) as HTMLElement | null

    if(!overlay){
      setLogoReady(true)
      setDataVisible(true)
      return
    }

    const startedAt=Number(overlay.dataset.transitionStartedAt||0)
    const duration=Number(overlay.dataset.transitionDuration||756)
    const elapsed=startedAt ? Date.now()-startedAt : duration
    const remaining=Math.max(0,duration-elapsed)

    const logoTimer=window.setTimeout(()=>{
      setLogoReady(true)
      overlay.remove()
    },remaining)

    const dataTimer=window.setTimeout(()=>{
      setDataVisible(true)
    },remaining+SETTLE_PAUSE_MS)

    return ()=>{
      window.clearTimeout(logoTimer)
      window.clearTimeout(dataTimer)
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
          opacity:logoReady?1:0,
          transition:'opacity 80ms ease'
        }}
      />}
    </div>

    <div style={{
      opacity:dataVisible?1:0,
      transform:dataVisible?'translateY(0)':'translateY(5px)',
      transition:'opacity 220ms ease, transform 220ms ease'
    }}>
      {children}
    </div>
  </>
}
