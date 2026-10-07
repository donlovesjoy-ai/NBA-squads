import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'
import GameZoomLink from './GameZoomLink'
import OwnerCalendarSelect from './OwnerCalendarSelect'

const TZ='America/New_York'
const DAYS=['SUN','MON','TUE','WED','THU','FRI','SAT']

function etParts(value:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(value))
  const get=(type:string)=>parts.find(p=>p.type===type)?.value || ''
  return {year:Number(get('year')),month:Number(get('month')),day:Number(get('day')),time:`${get('hour')}:${get('minute')}`}
}

function monthKey(year:number,month:number){return `${year}-${String(month).padStart(2,'0')}`}
const SEASON_MONTHS=[
  {year:2026,month:10},{year:2026,month:11},{year:2026,month:12},
  {year:2027,month:1},{year:2027,month:2},{year:2027,month:3},{year:2027,month:4}
]
const MONTH_QUOTA=new Map<string,number>([['2026-10',5],['2026-11',10],['2026-12',10],['2027-01',10],['2027-02',10],['2027-03',5],['2027-04',5]])
function monthTitle(year:number,month:number){return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)))}
function resultCode(value?:string|null){const v=String(value||'').toUpperCase();if(v==='W'||v==='WIN')return 'W';if(v==='L'||v==='LOSS')return 'L';if(v==='P'||v==='PUSH')return 'P';return ''}
function recordLabel(w:number,l:number,p:number){return `${w}-${l}${p?`-${p}`:''}`}
function spreadForTeam(game:any,teamId:number){if(game.home_spread==null)return '—';const n=Number(game.home_spread);const v=game.home_team_id===teamId?n:-n;return `${v>0?'+':''}${v}`}
function gameStarted(status?:string){const s=String(status||'').toLowerCase();return !['','scheduled','created','pre','pregame'].includes(s)}
function calendarResultStyle(status:string|undefined,pick:any,forced=false){
  if(!gameStarted(status))return {border:'0 solid transparent',background:'#fff',filter:'none'}
  if(!pick)return {border:'2px solid #9ca3af',background:'#f3f4f6',filter:'grayscale(1)'}
  const code=forced?'L':resultCode(pick?.result)
  if(code==='W')return {border:'2px solid #16a34a',background:'rgba(34,197,94,.10)',filter:'none'}
  if(code==='L')return {border:'2px solid #dc2626',background:'rgba(239,68,68,.10)',filter:'none'}
  if(code==='P')return {border:'2px solid #2563eb',background:'rgba(37,99,235,.10)',filter:'none'}
  return {border:'2px solid #2563eb',background:'rgba(37,99,235,.06)',filter:'none'}
}

export default async function SchedulePage({searchParams}:{searchParams:Promise<{squad?:string;month?:string}>}){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')
  const p=await searchParams
  const {data:profile}=await supabase.from('users').select('role').eq('id',user.id).maybeSingle()
  const {data:squads}=await supabase.from('squads').select('id,user_id,squad_name,owner_name,nba_team_id,nba_teams(name,abbreviation,logo_url)').eq('season_year',2026).order('squad_name')
  const list=(squads||[]) as any[]
  const own=list.find(s=>s.user_id===user.id)
  const requested=Number(p.squad)
  const selected=list.find(s=>s.id===requested)||own||list[0]

  const nowEt=etParts(new Date().toISOString())
  const parsed=p.month?.match(/^(\d{4})-(\d{2})$/)
  const requestedMonth=parsed?{year:Number(parsed[1]),month:Number(parsed[2])}:null
  let monthIndex=SEASON_MONTHS.findIndex(m=>m.year===requestedMonth?.year&&m.month===requestedMonth?.month)
  if(monthIndex<0){
    monthIndex=SEASON_MONTHS.findIndex(m=>m.year===nowEt.year&&m.month===nowEt.month)
    if(monthIndex<0)monthIndex=0
  }
  const {year,month}=SEASON_MONTHS[monthIndex]
  const prev=SEASON_MONTHS[(monthIndex-1+SEASON_MONTHS.length)%SEASON_MONTHS.length]
  const next=SEASON_MONTHS[(monthIndex+1)%SEASON_MONTHS.length]

  if(!selected){
    return <main className="wrap"><h1 style={{textAlign:'center'}}>Calendar</h1><Nav commissioner={profile?.role==='commissioner'}/><div className="card" style={{textAlign:'center'}}>No NBA Squads teams have been assigned yet.</div></main>
  }

  const {data:teams}=await supabase.from('nba_teams').select('id,name,abbreviation,logo_url')
  const teamMap=new Map((teams||[]).map((t:any)=>[t.id,t]))
  const {data:games}=await supabase.from('games').select('id,home_team_id,away_team_id,scheduled_tipoff_time,status,home_score,away_score,home_spread,closing_spread').eq('season_year',2026).or(`home_team_id.eq.${selected.nba_team_id},away_team_id.eq.${selected.nba_team_id}`).order('scheduled_tipoff_time')
  const allGames=(games||[]) as any[]
  const gameIds=allGames.map(g=>g.id)
  const {data:picks}=gameIds.length?await supabase.from('picks').select('game_id,selection_team_id,pick_type,total_side,result,ats_margin').eq('squad_id',selected.id).in('game_id',gameIds):{data:[] as any[]}
  const {data:forced}=gameIds.length?await supabase.from('forced_losses').select('game_id,reason').eq('squad_id',selected.id).in('game_id',gameIds):{data:[] as any[]}
  const pickMap=new Map((picks||[]).map((x:any)=>[x.game_id,x]))
  const forcedMap=new Map((forced||[]).map((x:any)=>[x.game_id,x]))
  const monthGames=allGames.filter(g=>{const d=etParts(g.scheduled_tipoff_time);return d.year===year&&d.month===month})
  let overallWins=0,overallLosses=0,overallPushes=0
  let monthWins=0,monthLosses=0,monthPushes=0,monthPlayed=0
  allGames.forEach((g:any)=>{
    const pick:any=pickMap.get(g.id)
    const forcedLoss=forcedMap.has(g.id)
    const code=forcedLoss?'L':resultCode(pick?.result)
    if(!code)return
    if(code==='W')overallWins++
    else if(code==='L')overallLosses++
    else if(code==='P')overallPushes++
    const d=etParts(g.scheduled_tipoff_time)
    if(d.year===year&&d.month===month){
      monthPlayed++
      if(code==='W')monthWins++
      else if(code==='L')monthLosses++
      else if(code==='P')monthPushes++
    }
  })
  const monthQuota=MONTH_QUOTA.get(monthKey(year,month))??0
  const byDay=new Map<number,any[]>()
  monthGames.forEach(g=>{const day=etParts(g.scheduled_tipoff_time).day;byDay.set(day,[...(byDay.get(day)||[]),g])})
  const firstDow=new Date(Date.UTC(year,month-1,1)).getUTCDay()
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate()
  const cells=[...Array(firstDow).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)]
  while(cells.length%7)cells.push(null)
  const nbaTeam:any=Array.isArray(selected.nba_teams)?selected.nba_teams[0]:selected.nba_teams
  const mk=(y:number,m:number)=>`/schedule?squad=${selected.id}&month=${monthKey(y,m)}`

  return <main style={{maxWidth:1120,margin:'0 auto',padding:'28px 6px 60px'}}>
    <h1 style={{textAlign:'center',marginBottom:8}}>Calendar</h1>
    <Nav commissioner={profile?.role==='commissioner'}/>
    <section data-calendar-panel="true" className="card" style={{padding:8,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'42px 1fr 42px',alignItems:'center',gap:6}}>
        <Link href={mk(prev.year,prev.month)} style={{fontSize:28,textAlign:'center'}}>‹</Link>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:25,fontWeight:900}}>{monthTitle(year,month)}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:5,fontWeight:900}}>
            {nbaTeam?.logo_url&&<img src={nbaTeam.logo_url} alt={`${nbaTeam.name} logo`} style={{width:30,height:30,objectFit:'contain'}}/>}
            <span>{nbaTeam?.name||selected.squad_name}</span>
          </div>
        </div>
        <Link href={mk(next.year,next.month)} style={{fontSize:28,textAlign:'center'}}>›</Link>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',marginTop:14,alignItems:'end'}}>
        <div style={{gridColumn:'1 / span 2',padding:'2px 4px 9px',textAlign:'center'}}>
          <div style={{fontSize:12,fontWeight:900,opacity:.6,textTransform:'uppercase'}}>Overall Record</div>
          <div style={{fontSize:26,fontWeight:950,lineHeight:1.05,marginTop:4}}>{recordLabel(overallWins,overallLosses,overallPushes)}</div>
        </div>

        <div style={{gridColumn:'3 / span 3',padding:'2px 4px 9px',textAlign:'center'}}>
          <OwnerCalendarSelect
            owners={list.map((s:any)=>({
              id:s.id,
              label:s.owner_name||s.squad_name||`Owner ${s.id}`
            }))}
            selectedId={selected.id}
            month={monthKey(year,month)}
          />
        </div>

        <div style={{gridColumn:'6 / span 2',padding:'2px 4px 9px',textAlign:'center'}}>
          <div style={{fontSize:11,fontWeight:900,opacity:.6,textTransform:'uppercase'}}>Games Played</div>
          <div style={{fontSize:17,fontWeight:950,marginTop:2}}>{monthPlayed} / {monthQuota}</div>
          <div style={{fontSize:11,fontWeight:900,opacity:.6,textTransform:'uppercase',marginTop:7}}>Monthly Record</div>
          <div style={{fontSize:17,fontWeight:950,marginTop:2}}>{recordLabel(monthWins,monthLosses,monthPushes)}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',borderTop:'1px solid #c8c8c8',borderLeft:'1px solid #c8c8c8'}}>
        {DAYS.map(d=><div key={d} style={{padding:'7px 0',textAlign:'center',fontWeight:900,fontSize:10,borderRight:'1px solid #c8c8c8',borderBottom:'1px solid #c8c8c8',background:'#f3f4f6'}}>{d}</div>)}
        {cells.map((day,index)=>{
          const gamesForDay=day?byDay.get(day)||[]:[]
          return <div key={index} style={{minHeight:82,padding:'2px 1px',borderRight:'1px solid #c8c8c8',borderBottom:'1px solid #c8c8c8',background:'#fff',minWidth:0}}>
            {gamesForDay.length===0&&day&&<div style={{fontSize:10,fontWeight:800,opacity:.55,paddingLeft:2,lineHeight:1.05}}>{day}</div>}
            {gamesForDay.map((g:any)=>{
              const d=etParts(g.scheduled_tipoff_time),opponentId=g.home_team_id===selected.nba_team_id?g.away_team_id:g.home_team_id,opp:any=teamMap.get(opponentId),home=g.home_team_id===selected.nba_team_id
              const pick:any=pickMap.get(g.id),miss=forcedMap.has(g.id),started=gameStarted(g.status),bs=calendarResultStyle(g.status,pick,miss)
              const selection:any=pick?.selection_team_id?teamMap.get(pick.selection_team_id):null
              const score=started&&g.home_score!=null&&g.away_score!=null?`${g.away_score}-${g.home_score}`:''
              const savedSelection=pick
                ? pick.pick_type==='total'
                  ? String(pick.total_side||'').toUpperCase()
                  : selection?.abbreviation||'PICK'
                : 'NO PICK'
              const selectionLabel=started?savedSelection:d.time
              return <GameZoomLink
                key={g.id}
                href={`/game-details?game=${g.id}&squad=${selected.id}`}
                style={{...bs,borderRadius:6,padding:'1px 2px 2px',margin:'0',fontSize:9,width:'100%',minWidth:0,boxSizing:'border-box',textDecoration:'none',color:'inherit'}}
              >
                <div style={{textAlign:'center',display:'grid',gridTemplateRows:'auto auto auto auto auto',gap:1,justifyItems:'center',alignItems:'center'}}>
                  <div style={{width:'100%',display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'end',minHeight:12,lineHeight:1}}>
                    <div style={{justifySelf:'start',fontSize:10,fontWeight:800,opacity:.55,paddingLeft:1}}>{day}</div>
                    <div style={{justifySelf:'center',fontWeight:900,fontSize:5.5,lineHeight:1,paddingBottom:1}}>{home?'VS':'@'}</div>
                    <div/>
                  </div>
                  {opp?.logo_url?<img src={opp.logo_url} alt={`${opp.name} logo`} style={{width:31,height:31,objectFit:'contain',display:'block',marginTop:-1}}/>:<div style={{height:31}}/>}
                  <div style={{fontWeight:900,fontSize:11,lineHeight:1,whiteSpace:'nowrap',letterSpacing:'-.2px'}}>{opp?.abbreviation||'TBD'}</div>
                  <div style={{fontWeight:900,fontSize:started?7:5.5,lineHeight:1,whiteSpace:'nowrap'}}>{selectionLabel}</div>
                  {score&&<div style={{fontWeight:900,fontSize:9,lineHeight:1,whiteSpace:'nowrap',marginTop:1}}>{score}</div>}
                  {pick?.result&&<div style={{fontWeight:900,textTransform:'uppercase',fontSize:7,marginTop:1}}>{pick.result}</div>}
                  {miss&&<div style={{fontWeight:900,fontSize:7,marginTop:1}}>AUTO L</div>}
                </div>
              </GameZoomLink>
            })}
          </div>
        })}
      </div>
    </section>

    <div style={{textAlign:'center',marginTop:14}}>
      <Link href={`/team-schedule/${selected.id}`} style={{textDecoration:'underline',fontWeight:800}}>
        View Season Schedule
      </Link>
    </div>
  </main>
}
