import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '../../components'
import { saveLiveFeed, runLiveSync } from './actions'

type LiveFeedSettings={
  provider:string|null
  enabled:boolean|null
  last_sync_at:string|null
  last_sync_status:string|null
  last_sync_message:string|null
  api_requests_remaining:number|null
  api_requests_last:number|null
  api_quota_total:number|null
}

export default async function LiveFeed({
  searchParams
}:{
  searchParams:Promise<{
    saved?:string
    synced?:string
    error?:string
  }>
}){
  const sp=await searchParams
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()

  if(!user)redirect('/login')

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  if(profile?.role!=='commissioner')redirect('/dashboard')

  const {data:settingsData}=await supabase
    .from('integration_settings')
    .select('provider,enabled,last_sync_at,last_sync_status,last_sync_message,api_requests_remaining,api_requests_last,api_quota_total')
    .eq('id',1)
    .single()

  const settings=settingsData as LiveFeedSettings|null

  const errorMessage=
    sp.error==='no-key'
      ? 'No Big Balls API key is saved yet.'
      : sp.error==='connection'
        ? 'Big Balls connection test failed. Check the saved key and try again.'
        : sp.error
          ? 'Could not save the live-feed settings.'
          : ''

  return (
    <main className="wrap">
      <div className="top">
        <div>
          <div className="big">NBA SQUADS</div>
          <div className="muted">Commissioner — Big Balls Sports Data</div>
        </div>
      </div>

      <Nav commissioner/>

      {sp.saved&&<p className="status">Big Balls settings saved.</p>}
      {sp.synced&&<p className="status">Big Balls connection verified.</p>}
      {errorMessage&&<p className="status">Live feed error: {errorMessage}</p>}

      <section className="card">
        <h2>Big Balls API</h2>

        <p>
          NBA Squads is now configured for Big Balls Sports Data instead of The Odds API.
          The API key stays server-side and is never displayed back on this page.
        </p>

        <form action={saveLiveFeed}>
          <label>Big Balls API key</label>
          <input
            name="api_key"
            type="password"
            defaultValue=""
            placeholder="Enter a new key only to replace the saved key"
            autoComplete="new-password"
          />

          <p className="muted" style={{marginTop:4}}>
            Leave this blank to keep the existing saved key.
          </p>

          <label style={{display:'flex',gap:10,alignItems:'center'}}>
            <input
              style={{width:'auto'}}
              type="checkbox"
              name="enabled"
              defaultChecked={!!settings?.enabled}
            />
            Enable Big Balls live-data integration
          </label>

          <button className="submit" type="submit">Save Big Balls Feed</button>
        </form>
      </section>

      <section className="card">
        <h2>Connection & Quota</h2>

        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',
          gap:12,
          marginTop:12
        }}>
          <div style={{border:'1px solid #ddd',borderRadius:10,padding:14}}>
            <div className="muted" style={{fontWeight:800}}>Provider</div>
            <div style={{fontSize:20,fontWeight:900,marginTop:4}}>
              {settings?.provider==='big_balls'?'Big Balls':'Not converted yet'}
            </div>
          </div>

          <div style={{border:'1px solid #ddd',borderRadius:10,padding:14}}>
            <div className="muted" style={{fontWeight:800}}>Daily allowance</div>
            <div style={{fontSize:20,fontWeight:900,marginTop:4}}>
              {settings?.api_quota_total??'—'}
            </div>
            <div className="muted" style={{fontSize:12,marginTop:3}}>
              Requests per day reported by your key
            </div>
          </div>

          <div style={{border:'1px solid #ddd',borderRadius:10,padding:14}}>
            <div className="muted" style={{fontWeight:800}}>Last request cost</div>
            <div style={{fontSize:20,fontWeight:900,marginTop:4}}>
              {settings?.api_requests_last??'—'}
            </div>
            <div className="muted" style={{fontSize:12,marginTop:3}}>
              Big Balls counts each HTTP request as one request
            </div>
          </div>
        </div>

        {settings?.api_requests_remaining!==null&&settings?.api_requests_remaining!==undefined&&(
          <p className="muted" style={{marginTop:12}}>
            Current limiting-bucket remaining from the last response: <b>{settings.api_requests_remaining}</b>.
          </p>
        )}

        <form action={runLiveSync}>
          <button className="submit" type="submit">Test Big Balls Connection</button>
        </form>
      </section>

      <section className="card">
        <h2>Feed Status</h2>

        <p><b>Status:</b> {settings?.last_sync_status||'Not tested yet'}</p>
        <p>
          <b>Last test:</b>{' '}
          {settings?.last_sync_at
            ? new Date(settings.last_sync_at).toLocaleString('en-US',{
                timeZone:'America/New_York',
                timeZoneName:'short'
              })
            : 'Never'}
        </p>

        <p className="muted">{settings?.last_sync_message||''}</p>

        <p className="muted">
          This page now verifies the Big Balls key directly. The next step is connecting the
          specific NBA feeds—injuries, schedules/scores, standings, lineups and player data—to
          Supabase without reusing any NFL sync function.
        </p>
      </section>
    </main>
  )
}
