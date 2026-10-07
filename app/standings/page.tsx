import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { Nav } from '../components'

function record(rows:any[]){
  let wins=0
  let losses=0
  let pushes=0

  for(const row of rows){
    const result=String(row?.result||'').toUpperCase()
    if(result==='W')wins++
    else if(result==='L')losses++
    else if(result==='P')pushes++
  }

  return {wins,losses,pushes,label:`${wins}-${losses}-${pushes}`}
}

export default async function StandingsPage(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  const {data:squads}=await supabase
    .from('squads')
    .select('id,squad_name,owner_name,nba_teams(name,abbreviation)')
    .eq('season_year',2026)
    .order('owner_name')

  const squadList=(squads||[]) as any[]
  const squadIds=squadList.map(s=>s.id)

  const {data:picks}=squadIds.length
    ? await supabase
        .from('picks')
        .select('squad_id,pick_type,result')
        .in('squad_id',squadIds)
        .not('result','is',null)
    : {data:[] as any[]}

  const bySquad=new Map<number,any[]>()

  for(const pick of picks||[]){
    const list=bySquad.get(pick.squad_id)||[]
    list.push(pick)
    bySquad.set(pick.squad_id,list)
  }

  const standings=squadList.map((squad:any)=>{
    const team=Array.isArray(squad.nba_teams)?squad.nba_teams[0]:squad.nba_teams
    const all=bySquad.get(squad.id)||[]
    const spread=all.filter((p:any)=>p.pick_type!=='total')
    const totals=all.filter((p:any)=>p.pick_type==='total')

    const overallRecord=record(all)
    const spreadRecord=record(spread)
    const totalRecord=record(totals)
    const decisions=overallRecord.wins+overallRecord.losses
    const winPct=decisions?overallRecord.wins/decisions:0

    return {
      squad,
      team,
      overallRecord,
      spreadRecord,
      totalRecord,
      winPct
    }
  }).sort((a:any,b:any)=>
    b.winPct-a.winPct ||
    b.overallRecord.wins-a.overallRecord.wins
  )

  return (
    <main style={{maxWidth:950,margin:'0 auto',padding:'28px 12px 60px'}}>
      <h1 style={{textAlign:'center'}}>NBA Squads Standings</h1>
      <Nav commissioner={profile?.role==='commissioner'}/>

      <div style={{marginTop:28,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}>
          <thead>
            <tr>
              {['#','Owner','Overall','Spread','Over / Under','Win %'].map(h=>(
                <th
                  key={h}
                  style={{
                    padding:'12px 8px',
                    borderBottom:'1px solid #555',
                    textAlign:'center'
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {standings.map((row:any,i:number)=>(
              <tr key={row.squad.id}>
                <td style={{padding:12,textAlign:'center'}}>{i+1}</td>
                <td style={{padding:12,textAlign:'center',fontWeight:800}}>
                  {row.squad.owner_name||row.squad.squad_name||'—'}
                </td>
                <td style={{padding:12,textAlign:'center',fontWeight:900}}>
                  {row.overallRecord.label}
                </td>
                <td style={{padding:12,textAlign:'center'}}>
                  {row.spreadRecord.label}
                </td>
                <td style={{padding:12,textAlign:'center'}}>
                  {row.totalRecord.label}
                </td>
                <td style={{padding:12,textAlign:'center'}}>
                  {(row.winPct*100).toFixed(1)}%
                </td>
              </tr>
            ))}

            {!standings.length&&(
              <tr>
                <td colSpan={6} style={{padding:30,textAlign:'center',opacity:.7}}>
                  Standings will populate after owners begin making selections.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
