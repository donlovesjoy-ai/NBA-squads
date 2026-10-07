import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import GameDetailsReveal from './GameDetailsReveal'

const TZ='America/New_York'

const SAMPLE_GAME={
  label:'Historical sample · WAS @ CLE · Apr 12, 2026',
  venue:'Rocket Arena',
  score:'WAS 117 · CLE 130',
  quarters:[
    ['WAS',21,34,40,22],
    ['CLE',43,22,34,31]
  ],
  attendance:'19,432',
  cleStats:{ppg:117.5,oppg:117.8,fg:'47.7%',three:'35.5%',reb:43.9,ast:27.2,tov:13.7,last5:'L W W W W',rest:'1 day'},
  gameStats:{
    WAS:{fg:'46.7%',three:'43.9%',reb:30,ast:29,stl:10,blk:2,tov:12},
    CLE:{fg:'53.9%',three:'41.9%',reb:53,ast:31,stl:8,blk:4,tov:19}
  },
  lineups:{
    WAS:{
      starters:['Anthony Gill · F','Carlton Carrington · G','Jamir Watkins · G','Justin Champagnie · F','Will Riley · G'],
      bench:['Jaden Hardy · G','Julian Reese · F','Leaky Black · F','Sharife Cooper · G']
    },
    CLE:{
      starters:['Craig Porter · G','Jaylon Tyson · G','Larry Nance Jr. · F','Max Strus · G',"Nae'Qwan Tomlin · F"],
      bench:['Olivier Sarr · F','Riley Minix · F','Tristan Enaruna · F','Tyrese Proctor · G']
    }
  },
  players:[
    {name:'Donovan Mitchell',pos:'SG',pts:27.6,reb:4.6,ast:5.2,min:34.0},
    {name:'James Harden',pos:'PG',pts:22.7,reb:4.9,ast:7.5,min:35.3},
    {name:'Evan Mobley',pos:'C',pts:17.8,reb:8.8,ast:3.7,min:32.6},
    {name:'Jarrett Allen',pos:'C',pts:14.7,reb:8.2,ast:1.6,min:27.6},
    {name:'Sam Merrill',pos:'G',pts:11.6,reb:2.2,ast:2.1,min:24.9}
  ],
  mitchellLog:[
    ['4/17','ORL',14,3,1,28],
    ['4/12','NYK',19,3,2,27],
    ['4/10','DET',22,3,0,31],
    ['4/7','BOS',20,0,2,34],
    ['4/5','MIN',7,6,3,34]
  ],
  leaders:[
    ['Luka Doncic','LAL',33.5],
    ['Shai Gilgeous-Alexander','OKC',30.5],
    ['Jaylen Brown','BOS',28.4],
    ['Anthony Edwards','MIN',28.1],
    ['Donovan Mitchell','CLE',27.6]
  ]
}


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
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gridTemplateRows:'74px auto auto',columnGap:10,rowGap:6,alignItems:'center'}}>
        <div style={{gridColumn:1,gridRow:1,textAlign:'center',minWidth:0}}>
          {away?.logo_url&&<img
            src={away.logo_url}
            alt={`${away.name} logo`}
            data-logo-transition-target={opponent?.id===away?.id?'true':undefined}
            style={{width:74,height:74,objectFit:'contain',margin:'0 auto',display:'block'}}
          />}
        </div>
        <div style={{gridColumn:3,gridRow:1,textAlign:'center',minWidth:0}}>
          {home?.logo_url&&<img
            src={home.logo_url}
            alt={`${home.name} logo`}
            data-logo-transition-target={opponent?.id===home?.id?'true':undefined}
            style={{width:74,height:74,objectFit:'contain',margin:'0 auto',display:'block'}}
          />}
        </div>

        <div style={{gridColumn:1,gridRow:2,textAlign:'center',fontSize:19,fontWeight:900}}>{away?.abbreviation||'AWAY'}</div>
        <div style={{gridColumn:2,gridRow:2,textAlign:'center'}}>
          {scoreAvailable?<div style={{fontSize:28,fontWeight:950,whiteSpace:'nowrap'}}>{game.away_score}–{game.home_score}</div>:<div style={{fontSize:15,fontWeight:900}}>@</div>}
        </div>
        <div style={{gridColumn:3,gridRow:2,textAlign:'center',fontSize:19,fontWeight:900}}>{home?.abbreviation||'HOME'}</div>

        <div style={{gridColumn:1,gridRow:3,textAlign:'center',fontSize:12,opacity:.65,minWidth:0}}>{away?.name}</div>
        <div style={{gridColumn:2,gridRow:3,textAlign:'center',alignSelf:'start'}}>
          <div style={{fontSize:11,fontWeight:900,opacity:.72,lineHeight:1.15,textTransform:'uppercase'}}>{gameMeta.day} {gameMeta.date}</div>
          <div style={{fontSize:11,fontWeight:900,opacity:.72,marginTop:2,lineHeight:1.15}}>{gameMeta.time}</div>
        </div>
        <div style={{gridColumn:3,gridRow:3,textAlign:'center',fontSize:12,opacity:.65,minWidth:0}}>{home?.name}</div>
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

    <div style={{marginTop:14,padding:'8px 10px',borderRadius:10,background:'rgba(128,128,128,.10)',fontSize:11,fontWeight:900,textAlign:'center'}}>
      {SAMPLE_GAME.label} · layout preview using real Big Balls historical data
    </div>

    <section className="card" style={{padding:'14px',marginTop:10}}>
      <div style={{fontSize:17,fontWeight:950}}>Full Game Matchup</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center',marginTop:12,textAlign:'center'}}>
        <div>
          <div style={{fontSize:20,fontWeight:950}}>WAS</div>
          <div style={{fontSize:30,fontWeight:950}}>117</div>
        </div>
        <div style={{fontSize:11,fontWeight:900,opacity:.55}}>FINAL</div>
        <div>
          <div style={{fontSize:20,fontWeight:950}}>CLE</div>
          <div style={{fontSize:30,fontWeight:950}}>130</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'48px repeat(4,1fr)',gap:4,marginTop:12,fontSize:11,textAlign:'center'}}>
        <div></div><b>Q1</b><b>Q2</b><b>Q3</b><b>Q4</b>
        {SAMPLE_GAME.quarters.map((row:any)=>(
          <>
            <b key={row[0]} style={{textAlign:'left'}}>{row[0]}</b>
            {row.slice(1).map((n:number,i:number)=><div key={`${row[0]}-${i}`}>{n}</div>)}
          </>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:14,textAlign:'center'}}>
        <div><div style={{fontSize:9,fontWeight:900,opacity:.55}}>VENUE</div><div style={{fontSize:12,fontWeight:900,marginTop:3}}>{SAMPLE_GAME.venue}</div></div>
        <div><div style={{fontSize:9,fontWeight:900,opacity:.55}}>ATTENDANCE</div><div style={{fontSize:12,fontWeight:900,marginTop:3}}>{SAMPLE_GAME.attendance}</div></div>
        <div><div style={{fontSize:9,fontWeight:900,opacity:.55}}>REST</div><div style={{fontSize:12,fontWeight:900,marginTop:3}}>CLE {SAMPLE_GAME.cleStats.rest}</div></div>
      </div>

      <div style={{marginTop:14,overflowX:'auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'70px repeat(7,minmax(42px,1fr))',gap:4,fontSize:10,textAlign:'center',minWidth:470}}>
          <div></div><b>FG%</b><b>3P%</b><b>REB</b><b>AST</b><b>STL</b><b>BLK</b><b>TOV</b>
          {(['WAS','CLE'] as const).map(team=>(
            <>
              <b key={team} style={{textAlign:'left'}}>{team}</b>
              <div>{SAMPLE_GAME.gameStats[team].fg}</div>
              <div>{SAMPLE_GAME.gameStats[team].three}</div>
              <div>{SAMPLE_GAME.gameStats[team].reb}</div>
              <div>{SAMPLE_GAME.gameStats[team].ast}</div>
              <div>{SAMPLE_GAME.gameStats[team].stl}</div>
              <div>{SAMPLE_GAME.gameStats[team].blk}</div>
              <div>{SAMPLE_GAME.gameStats[team].tov}</div>
            </>
          ))}
        </div>
      </div>
    </section>

    <section className="card" style={{padding:'14px',marginTop:14}}>
      <div style={{fontSize:17,fontWeight:950}}>Injury Report</div>
      <div style={{fontSize:12,opacity:.68,marginTop:8,lineHeight:1.45}}>
        Big Balls does not return a trustworthy injury snapshot for the exact historical tip time on this game. The live version of this card will show each team&apos;s current player, status, injury type, expected return and latest update.
      </div>
    </section>

    <section className="card" style={{padding:'14px',marginTop:14}}>
      <div style={{fontSize:17,fontWeight:950}}>Starting Lineups &amp; Benches</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:10}}>
        {(['WAS','CLE'] as const).map(team=>(
          <div key={team} style={{border:'1px solid rgba(128,128,128,.24)',borderRadius:10,padding:'10px 12px'}}>
            <div style={{fontWeight:950,fontSize:14}}>{team}</div>
            <div style={{fontSize:10,fontWeight:900,opacity:.55,marginTop:8}}>STARTERS</div>
            {SAMPLE_GAME.lineups[team].starters.map((p:string)=><div key={p} style={{fontSize:11,fontWeight:800,marginTop:4}}>{p}</div>)}
            <div style={{fontSize:10,fontWeight:900,opacity:.55,marginTop:10}}>BENCH</div>
            {SAMPLE_GAME.lineups[team].bench.map((p:string)=><div key={p} style={{fontSize:11,marginTop:4}}>{p}</div>)}
          </div>
        ))}
      </div>
    </section>

    <section className="card" style={{padding:'14px',marginTop:14}}>
      <div style={{fontSize:17,fontWeight:950}}>Player Season Stats</div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.7fr) repeat(4,.55fr)',gap:5,padding:'9px 0 6px',fontSize:9,fontWeight:900,opacity:.55,borderBottom:'1px solid rgba(128,128,128,.22)'}}>
        <div>PLAYER</div><div>PTS</div><div>REB</div><div>AST</div><div>MIN</div>
      </div>
      {SAMPLE_GAME.players.map(p=>(
        <div key={p.name} style={{display:'grid',gridTemplateColumns:'minmax(0,1.7fr) repeat(4,.55fr)',gap:5,padding:'8px 0',fontSize:11,borderBottom:'1px solid rgba(128,128,128,.12)'}}>
          <div><b>{p.name}</b> <span style={{opacity:.5}}>{p.pos}</span></div>
          <div>{p.pts}</div><div>{p.reb}</div><div>{p.ast}</div><div>{p.min}</div>
        </div>
      ))}
    </section>

    <section className="card" style={{padding:'14px',marginTop:14}}>
      <div style={{fontSize:17,fontWeight:950}}>Player Game Logs</div>
      <div style={{fontSize:12,fontWeight:900,marginTop:8}}>Donovan Mitchell · sample recent games</div>
      <div style={{display:'grid',gridTemplateColumns:'50px 48px repeat(4,1fr)',gap:5,padding:'8px 0 5px',fontSize:9,fontWeight:900,opacity:.55}}>
        <div>DATE</div><div>OPP</div><div>PTS</div><div>REB</div><div>AST</div><div>MIN</div>
      </div>
      {SAMPLE_GAME.mitchellLog.map((r:any)=>(
        <div key={r[0]+r[1]} style={{display:'grid',gridTemplateColumns:'50px 48px repeat(4,1fr)',gap:5,padding:'7px 0',fontSize:11,borderTop:'1px solid rgba(128,128,128,.12)'}}>
          <div>{r[0]}</div><div><b>{r[1]}</b></div><div>{r[2]}</div><div>{r[3]}</div><div>{r[4]}</div><div>{r[5]}</div>
        </div>
      ))}
    </section>

    <section className="card" style={{padding:'14px',marginTop:14}}>
      <div style={{fontSize:17,fontWeight:950}}>Statistical Leaders</div>
      <div style={{fontSize:10,fontWeight:900,opacity:.55,marginTop:3}}>2025-26 SCORING LEADERS</div>
      {SAMPLE_GAME.leaders.map((r:any,i:number)=>(
        <div key={r[0]} style={{display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 46px 48px',gap:6,alignItems:'center',padding:'8px 0',fontSize:11,borderBottom:'1px solid rgba(128,128,128,.12)'}}>
          <div style={{fontWeight:950}}>{i+1}</div>
          <div style={{fontWeight:900}}>{r[0]}</div>
          <div style={{textAlign:'center',opacity:.65}}>{r[1]}</div>
          <div style={{textAlign:'right',fontWeight:950}}>{r[2]}</div>
        </div>
      ))}
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
