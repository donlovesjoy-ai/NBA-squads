'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireCommissioner(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()

  if(!user)redirect('/login')

  const {data:profile}=await supabase
    .from('users')
    .select('role')
    .eq('id',user.id)
    .maybeSingle()

  if(profile?.role!=='commissioner')redirect('/dashboard')

  return supabase
}

export async function saveLiveFeed(formData:FormData){
  const supabase=await requireCommissioner()

  const apiKey=String(formData.get('api_key')||'').trim()
  const enabled=formData.get('enabled')==='on'

  const updateData:{
    provider:string
    enabled:boolean
    updated_at:string
    api_key?:string
  }={
    provider:'big_balls',
    enabled,
    updated_at:new Date().toISOString()
  }

  if(apiKey)updateData.api_key=apiKey

  const {error}=await supabase
    .from('integration_settings')
    .update(updateData)
    .eq('id',1)

  if(error)redirect('/commissioner/live-feed?error=save')

  revalidatePath('/commissioner/live-feed')
  redirect('/commissioner/live-feed?saved=1')
}

export async function runLiveSync(){
  const supabase=await requireCommissioner()

  const {data:settings,error:settingsError}=await supabase
    .from('integration_settings')
    .select('api_key')
    .eq('id',1)
    .single()

  if(settingsError||!settings?.api_key){
    redirect('/commissioner/live-feed?error=no-key')
  }

  try{
    const resp=await fetch('https://api.bigballsdata.com/v1/user/me',{
      method:'GET',
      headers:{
        Authorization:`Bearer ${settings.api_key}`
      },
      cache:'no-store'
    })

    let body:any=null
    try{
      body=await resp.json()
    }catch{
      body=null
    }

    if(!resp.ok){
      const message=String(body?.error?.message||`Big Balls returned HTTP ${resp.status}`).slice(0,240)
      await supabase
        .from('integration_settings')
        .update({
          provider:'big_balls',
          last_sync_at:new Date().toISOString(),
          last_sync_status:'error',
          last_sync_message:message,
          api_requests_last:1,
          updated_at:new Date().toISOString()
        })
        .eq('id',1)

      redirect('/commissioner/live-feed?error=connection')
    }

    const plan=String(body?.data?.plan||'unknown')
    const githubConnected=!!body?.data?.github_connected
    const perMinute=Number(body?.data?.limits?.per_minute||0)||null
    const perDay=Number(body?.data?.limits?.per_day||0)||null
    const remainingHeader=resp.headers.get('x-ratelimit-remaining')
    const remaining=remainingHeader!==null?Number(remainingHeader):null

    const message=[
      `Connected to Big Balls Sports Data — ${plan} plan`,
      perDay?`${perDay}/day`:null,
      perMinute?`${perMinute}/minute`:null,
      githubConnected?'GitHub connected':null
    ].filter(Boolean).join(' · ')

    await supabase
      .from('integration_settings')
      .update({
        provider:'big_balls',
        last_sync_at:new Date().toISOString(),
        last_sync_status:'connected',
        last_sync_message:message,
        api_requests_used:null,
        api_requests_remaining:Number.isFinite(remaining as number)?remaining:null,
        api_requests_last:1,
        api_quota_total:perDay,
        updated_at:new Date().toISOString()
      })
      .eq('id',1)

    revalidatePath('/commissioner/live-feed')
    redirect('/commissioner/live-feed?synced=1')
  }catch(error:any){
    if(error?.digest)throw error

    await supabase
      .from('integration_settings')
      .update({
        provider:'big_balls',
        last_sync_at:new Date().toISOString(),
        last_sync_status:'error',
        last_sync_message:'Could not reach Big Balls Sports Data.',
        updated_at:new Date().toISOString()
      })
      .eq('id',1)

    redirect('/commissioner/live-feed?error=connection')
  }
}
