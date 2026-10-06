'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const OVERLAY_ID='nba-game-logo-transition'

export default function GameDetailsReveal({children}:{children:ReactNode}){
  const [visible,setVisible]=useState(false)

  useEffect(()=>{
    const overlay=document.getElementById(OVERLAY_ID)

    const revealTimer=window.setTimeout(
      ()=>setVisible(true),
      overlay ? 90 : 0
    )

    const removeTimer=window.setTimeout(()=>{
      overlay?.remove()
    },260)

    return ()=>{
      window.clearTimeout(revealTimer)
      window.clearTimeout(removeTimer)
    }
  },[])

  return <div style={{
    opacity:visible?1:0,
    transform:visible?'translateY(0)':'translateY(8px)',
    transition:'opacity 180ms ease, transform 180ms ease'
  }}>{children}</div>
}
