'use client'

import { useEffect, useState, useTransition } from 'react'
import { saveMatchupDecision } from './actions'

type TeamOption={
  abbreviation:string
  name:string
  logoUrl:string|null
  line:string
}

type Choice='away'|'home'|'no_pick'|'over'|'under'

function formatCountdown(ms:number){
  const total=Math.max(0,Math.ceil(ms/1000))
  const days=Math.floor(total/86400)
  const hours=Math.floor((total%86400)/3600)
  const minutes=Math.floor((total%3600)/60)
  const seconds=total%60

  if(days>0){
    return `${days}d ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
  }

  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
}

function lineText(line:string){
  return line==='—'?'—':line
}

export default function MatchupDecision({
  gameId,
  away,
  home,
  total,
  lockTime,
  initialChoice='no_pick',
  canEdit=true
}:{
  gameId:number
  away:TeamOption
  home:TeamOption
  total:number|string|null
  lockTime:string
  initialChoice?:Choice
  canEdit?:boolean
}){
  const [draftChoice,setDraftChoice]=useState<Choice>(initialChoice)
  const [committedChoice,setCommittedChoice]=useState<Choice>(initialChoice)
  const [message,setMessage]=useState('')
  const [now,setNow]=useState(()=>Date.now())
  const [pending,startTransition]=useTransition()

  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),250)
    return ()=>window.clearInterval(timer)
  },[])

  const lock=new Date(lockTime).getTime()
  const closed=!Number.isFinite(lock)||now>=lock
  const disabled=closed||!canEdit||pending
  const totalText=total==null?'—':String(total)

  const choose=(next:Choice)=>{
    if(!disabled){
      setDraftChoice(next)
      setMessage('')
    }
  }

  const decide=()=>{
    if(disabled)return

    startTransition(async()=>{
      const result=await saveMatchupDecision(gameId,draftChoice)

      if(result.ok){
        setCommittedChoice(draftChoice)
      }

      setMessage(result.message)
    })
  }

  const box=(choice:Choice,extra?:Record<string,unknown>)=>{
    const committed=committedChoice===choice
    const pendingChoice=draftChoice===choice&&!committed

    return {
      width:'100%',
      minHeight:66,
      border:committed
        ? '2px solid #16a34a'
        : pendingChoice
          ? '2px solid #111'
          : '1px solid rgba(128,128,128,.32)',
      borderRadius:10,
      background:pendingChoice
        ? 'rgba(17,17,17,.08)'
        : committed
          ? 'rgba(34,197,94,.06)'
          : 'transparent',
      color:'inherit',
      padding:'8px 6px',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      gap:7,
      cursor:disabled?'default':'pointer',
      opacity:disabled&&!committed?.68:1,
      font:'inherit' as const,
      ...extra
    }
  }

  return (
    <div style={{marginTop:18,borderTop:'1px solid rgba(128,128,128,.24)',paddingTop:14}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr .78fr 1fr',gap:8,alignItems:'stretch'}}>
        <div style={{display:'grid',gap:8}}>
          <button
            type="button"
            onClick={()=>choose('away')}
            aria-pressed={draftChoice==='away'}
            style={box('away')}
          >
            {away.logoUrl&&<img src={away.logoUrl} alt="" style={{width:34,height:34,objectFit:'contain'}}/>}
            <div style={{fontSize:17,fontWeight:950}}>{lineText(away.line)}</div>
          </button>

          <button
            type="button"
            onClick={()=>choose('home')}
            aria-pressed={draftChoice==='home'}
            style={box('home')}
          >
            {home.logoUrl&&<img src={home.logoUrl} alt="" style={{width:34,height:34,objectFit:'contain'}}/>}
            <div style={{fontSize:17,fontWeight:950}}>{lineText(home.line)}</div>
          </button>
        </div>

        <button
          type="button"
          onClick={()=>choose('no_pick')}
          aria-pressed={draftChoice==='no_pick'}
          style={box('no_pick',{
            minHeight:140,
            flexDirection:'column'
          })}
        >
          <div style={{fontSize:18,fontWeight:950,textAlign:'center'}}>NO PICK</div>
        </button>

        <div style={{display:'grid',gap:8}}>
          <button
            type="button"
            onClick={()=>choose('over')}
            aria-pressed={draftChoice==='over'}
            style={box('over')}
          >
            <div style={{textAlign:'center',fontSize:16,fontWeight:950}}>
              OVER {totalText}
            </div>
          </button>

          <button
            type="button"
            onClick={()=>choose('under')}
            aria-pressed={draftChoice==='under'}
            style={box('under')}
          >
            <div style={{textAlign:'center',fontSize:16,fontWeight:950}}>
              UNDER {totalText}
            </div>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={decide}
        disabled={disabled}
        style={{
          marginTop:10,
          width:'100%',
          border:'none',
          borderRadius:10,
          background:'#111',
          color:'#fff',
          padding:'12px 14px',
          textAlign:'center',
          fontSize:14,
          fontWeight:950,
          letterSpacing:.2,
          cursor:disabled?'default':'pointer',
          opacity:disabled?.55:1
        }}
      >
        {pending?'SAVING...':'MAKE A DECISION'}
      </button>

      {message&&(
        <div style={{marginTop:7,textAlign:'center',fontSize:11,fontWeight:800}}>
          {message}
        </div>
      )}

      <div
        aria-live="polite"
        style={{
          marginTop:8,
          textAlign:'center',
          fontSize:12,
          fontWeight:900,
          fontVariantNumeric:'tabular-nums'
        }}
      >
        {closed
          ? 'Bet window closed'
          : !canEdit
            ? 'Viewing another owner’s decision'
            : <>Bet window closes in <span style={{fontSize:14}}>{formatCountdown(lock-now)}</span></>}
      </div>
    </div>
  )
}
