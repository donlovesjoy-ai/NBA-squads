'use client'

import { useEffect, useState } from 'react'

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
  away,
  home,
  total,
  lockTime
}:{
  away:TeamOption
  home:TeamOption
  total:number|string|null
  lockTime:string
}){
  const [choice,setChoice]=useState<Choice>('no_pick')
  const [now,setNow]=useState(()=>Date.now())

  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),250)
    return ()=>window.clearInterval(timer)
  },[])

  const lock=new Date(lockTime).getTime()
  const closed=!Number.isFinite(lock)||now>=lock
  const totalText=total==null?'—':String(total)

  const box=(selected:boolean)=>({
    width:'100%',
    minHeight:66,
    border:selected?'2px solid #111':'1px solid rgba(128,128,128,.32)',
    borderRadius:10,
    background:selected?'rgba(17,17,17,.08)':'transparent',
    color:'inherit',
    padding:'8px 6px',
    display:'flex',
    alignItems:'center',
    justifyContent:'center',
    gap:7,
    cursor:closed?'default':'pointer',
    opacity:closed&&!selected?.68:1,
    font:'inherit' as const
  })

  return (
    <div style={{marginTop:18,borderTop:'1px solid rgba(128,128,128,.24)',paddingTop:14}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr .78fr 1fr',gap:8,alignItems:'stretch'}}>
        <div style={{display:'grid',gap:8}}>
          <button
            type="button"
            onClick={()=>!closed&&setChoice('away')}
            aria-pressed={choice==='away'}
            style={box(choice==='away')}
          >
            {away.logoUrl&&<img src={away.logoUrl} alt="" style={{width:30,height:30,objectFit:'contain'}}/>}
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:10,fontWeight:900,opacity:.55}}>AWAY</div>
              <div style={{fontSize:15,fontWeight:950}}>{away.abbreviation} {lineText(away.line)}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={()=>!closed&&setChoice('home')}
            aria-pressed={choice==='home'}
            style={box(choice==='home')}
          >
            {home.logoUrl&&<img src={home.logoUrl} alt="" style={{width:30,height:30,objectFit:'contain'}}/>}
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:10,fontWeight:900,opacity:.55}}>HOME</div>
              <div style={{fontSize:15,fontWeight:950}}>{home.abbreviation} {lineText(home.line)}</div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={()=>!closed&&setChoice('no_pick')}
          aria-pressed={choice==='no_pick'}
          style={{
            ...box(choice==='no_pick'),
            minHeight:140,
            flexDirection:'column'
          }}
        >
          <div style={{fontSize:11,fontWeight:900,opacity:.55}}>DEFAULT</div>
          <div style={{fontSize:18,fontWeight:950,textAlign:'center'}}>NO PICK</div>
        </button>

        <div style={{display:'grid',gap:8}}>
          <button
            type="button"
            onClick={()=>!closed&&setChoice('over')}
            aria-pressed={choice==='over'}
            style={box(choice==='over')}
          >
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:900,opacity:.55}}>OVER</div>
              <div style={{fontSize:16,fontWeight:950}}>O {totalText}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={()=>!closed&&setChoice('under')}
            aria-pressed={choice==='under'}
            style={box(choice==='under')}
          >
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:900,opacity:.55}}>UNDER</div>
              <div style={{fontSize:16,fontWeight:950}}>U {totalText}</div>
            </div>
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop:10,
          width:'100%',
          borderRadius:10,
          background:'#111',
          color:'#fff',
          padding:'12px 14px',
          textAlign:'center',
          fontSize:14,
          fontWeight:950,
          letterSpacing:.2
        }}
      >
        MAKE A DECISION
      </div>

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
          : <>Bet window closes in <span style={{fontSize:14}}>{formatCountdown(lock-now)}</span></>}
      </div>
    </div>
  )
}
