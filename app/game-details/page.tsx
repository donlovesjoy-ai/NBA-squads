import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import GameDetailsReveal from './GameDetailsReveal'

const TZ='America/New_York'

function formatGameMeta(value:string){
  const d=new Date(value)
  const day=new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short'}).format(d)
  const dateParts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,month:'numeric',day:'numeric'}).formatToParts(d)
  const get=(type:string)=>dateParts.find(p=>p.type===type)?.value||''
  const time=new Intl.DateTimeFormat('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit',hour12:true}).format(d).replace(/\s?[AP]M$/,'')
  return {day,date:`${get('month')}-${get('day')}`,time}
}
function resultLabel(result?:string|null,missed=false){
  if(missed)return 'L'
  if(!result)return '—'
  return String(result).toUpperCase()
}
function resultColor(result?:string|null,missed=false){
  if(missed||result==='L'||result==='loss')return '#ef4444'
  if(result==='W'||result==='win')return '#22c55e'
  if(result==='P'||result==='push')return '#f59e0b'
  return 'inherit'
}
function teamSpread(game:any,teamId:number){
  const raw=game.closing_spread??game.home_spread
  if(raw==null)return '—'
  const n=Number(raw)
  const v=game.home_team_id===teamId?n:-n
  return `${v>0?'+':''}${v}`
}

export default async function GamePage({searchParams}:{searchParams:Promise<{game?:string;squad?:string}>}){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')

  const sp=await searchParams
  const id=Number(sp.game)
  if(!Number.isFinite(id))redirect('/schedule')

  const {data:game}=await supabase.from('games')
    .select('id,season_year,home_team_id,away_team_id,scheduled_tipoff_time,status,home_score,away_score,home_spread,closing_spread,total,closing_total,odds_bookmaker,closing_bookmaker')
    .eq('id',id).maybeSingle()
  if(!game)redirect('/schedule')

  const {data:teams}=await supabase.from('nba_teams').select('id,name,abbreviation,logo_url').in('id',[game.home_team_id,game.away_team_id])
  const teamMap=new Map((teams||[]).map((t:any)=>[t.id,t]))
  const home:any=teamMap.get(game.home_team_id)
  const away:any=teamMap.get(game.away_team_id)

  const {data:squads}=await supabase.from('squads')
    .select('id,user_id,squad_name,owner_name,owner_email,nba_team_id')
    .eq('season_year',game.season_year)
    .order('owner_name')
  const squadList=(squads||[]) as any[]
  const requested=Number(sp.squad)
  const own=squadList.find(s=>s.user_id===user.id)
  const selected=squadList.find(s=>s.id===requested)||own||squadList[0]
  const squadIds=squadList.map(s=>s.id)

  const {data:picks}=squadIds.length?await supabase.from('picks')
    .select('squad_id,selection_team_id,result,ats_margin,is_missed,created_at')
    .eq('game_id',id)
    .in('squad_id',squadIds):{data:[] as any[]}
  const {data:forced}=squadIds.length?await supabase.from('forced_losses')
    .select('squad_id,reason')
    .eq('game_id',id)
    .in('squad_id',squadIds):{data:[] as any[]}

  const pickMap=new Map((picks||[]).map((p:any)=>[p.squad_id,p]))
  const forcedSet=new Set((forced||[]).map((f:any)=>f.squad_id))
  const scoreAvailable=game.home_score!=null&&game.away_score!=null
  const selectedTeamId=selected?.nba_team_id
  const opponent:any=selectedTeamId===game.home_team_id?away:selectedTeamId===game.away_team_id?home:away
  const gameMeta=formatGameMeta(game.scheduled_tipoff_time)

  return <main style={{maxWidth:760,margin:'0 auto',padding:'10px 12px 64px'}}>
    <div style={{margin:'2px 0 12px',textAlign:'center'}}>
      <Link href={selected?`/schedule?squad=${selected.id}`:'/schedule'} style={{fontWeight:900,textDecoration:'none'}}>← Back to calendar</Link>
    </div>

    <GameDetailsReveal>

    <section className="card" style={{padding:'18px 14px'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:10}}>
        <div style={{textAlign:'center',minWidth:0}}>
          {away?.logo_url&&<img
            src={away.logo_url}
            alt={`${away.name} logo`}
            data-logo-transition-target={opponent?.id===away?.id?'true':undefined}
            style={{width:74,height:74,objectFit:'contain',margin:'0 auto 6px',display:'block'}}
          />}
          <div style={{fontSize:19,fontWeight:900}}>{away?.abbreviation||'AWAY'}</div>
          <div style={{fontSize:12,opacity:.65}}>{away?.name}</div>
        </div>
        <div style={{textAlign:'center'}}>
          {scoreAvailable?<div style={{fontSize:28,fontWeight:950,whiteSpace:'nowrap',marginTop:4}}>{game.away_score}–{game.home_score}</div>:<div style={{fontSize:15,fontWeight:900,marginTop:4}}>@</div>}
          <div style={{fontSize:11,fontWeight:900,opacity:.72,marginTop:5,lineHeight:1.15,textTransform:'uppercase'}}>{gameMeta.day} {gameMeta.date}</div>
          <div style={{fontSize:11,fontWeight:900,opacity:.72,marginTop:2,lineHeight:1.15}}>{gameMeta.time}</div>
        </div>
        <div style={{textAlign:'center',minWidth:0}}>
          {home?.logo_url&&<img
            src={home.logo_url}
            alt={`${home.name} logo`}
            data-logo-transition-target={opponent?.id===home?.id?'true':undefined}
            style={{width:74,height:74,objectFit:'contain',margin:'0 auto 6px',display:'block'}}
          />}
          <div style={{fontSize:19,fontWeight:900}}>{home?.abbreviation||'HOME'}</div>
          <div style={{fontSize:12,opacity:.65}}>{home?.name}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:18,textAlign:'center'}}>
        <div style={{padding:'10px 6px',borderTop:'1px solid rgba(128,128,128,.3)'}}>
          <div style={{fontSize:10,fontWeight:900,opacity:.55}}>CAVS LINE</div>
          <div style={{fontSize:18,fontWeight:900,marginTop:3}}>{selected?teamSpread(game,selected.nba_team_id):'—'}</div>
        </div>
        <div style={{padding:'10px 6px',borderTop:'1px solid rgba(128,128,128,.3)'}}>
          <div style={{fontSize:10,fontWeight:900,opacity:.55}}>TOTAL</div>
          <div style={{fontSize:18,fontWeight:900,marginTop:3}}>{game.closing_total??game.total??'—'}</div>
        </div>
        <div style={{padding:'10px 6px',borderTop:'1px solid rgba(128,128,128,.3)'}}>
          <div style={{fontSize:10,fontWeight:900,opacity:.55}}>BOOK</div>
          <div style={{fontSize:13,fontWeight:900,marginTop:5}}>{game.closing_bookmaker||game.odds_bookmaker||'—'}</div>
        </div>
      </div>
    </section>

    <section className="card" style={{padding:0,overflow:'hidden',marginTop:14}}>
      <div style={{padding:'13px 14px',fontSize:17,fontWeight:950}}>Player Results</div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) .8fr .55fr .75fr',gap:6,padding:'8px 12px',fontSize:9,fontWeight:900,opacity:.6,borderTop:'1px solid rgba(128,128,128,.25)',borderBottom:'1px solid rgba(128,128,128,.25)'}}>
        <div>PLAYER</div><div style={{textAlign:'center'}}>PICK</div><div style={{textAlign:'center'}}>RESULT</div><div style={{textAlign:'right'}}>ATS MARGIN</div>
      </div>
      {squadList.map((s:any)=>{
        const p:any=pickMap.get(s.id)
        const missed=forcedSet.has(s.id)||p?.is_missed
        const selection:any=p?teamMap.get(p.selection_team_id):null
        const label=resultLabel(p?.result,missed)
        return <div key={s.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) .8fr .55fr .75fr',gap:6,alignItems:'center',padding:'11px 12px',borderBottom:'1px solid rgba(128,128,128,.16)',fontSize:12}}>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:900,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.owner_name||s.squad_name||s.owner_email||'Owner'}</div>
          </div>
          <div style={{textAlign:'center',fontWeight:900}}>{missed?'MISS':selection?.abbreviation||'—'}</div>
          <div style={{textAlign:'center',fontWeight:950,color:resultColor(p?.result,missed)}}>{label}</div>
          <div style={{textAlign:'right',fontWeight:900}}>{p?.ats_margin!=null?`${Number(p.ats_margin)>0?'+':''}${p.ats_margin}`:'—'}</div>
        </div>
      })}
      {squadList.length===0&&<div style={{padding:18,textAlign:'center',opacity:.65}}>No players are assigned for this season yet.</div>}
    </section>
    </GameDetailsReveal>
  </main>
}
