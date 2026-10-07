 'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireCommissioner(){
  const supabase=
    await createClient()

  const {
    data:{
      user
    }
  }=
    await supabase.auth
      .getUser()

  if(!user){
    redirect('/login')
  }

  const {
    data:profile
  }=
    await supabase
      .from('users')
      .select('role')
      .eq('id',user.id)
      .maybeSingle()

  if(
    profile?.role!==
    'commissioner'
  ){
    redirect('/dashboard')
  }

  return supabase
}

export async function saveLiveFeed(
  formData:FormData
){
  const supabase=
    await requireCommissioner()

  const apiKey=
    String(
      formData.get(
        'api_key'
      )||''
    ).trim()

  const bookmaker=
    String(
      formData.get(
        'bookmaker'
      )||
      'draftkings'
    ).trim()

  const enabled=
    formData.get(
      'enabled'
    )==='on'

  const updateData:{
    bookmaker:string
    enabled:boolean
    updated_at:string
    api_key?:string
  }={
    bookmaker,
    enabled,
    updated_at:
      new Date()
        .toISOString()
  }

  /*
   * A blank API-key field means:
   * keep the existing stored key.
   *
   * This prevents the live-feed page
   * from needing to retrieve and expose
   * the saved secret.
   */
  if(apiKey){
    updateData.api_key=
      apiKey
  }

  const {error}=
    await supabase
      .from(
        'integration_settings'
      )
      .update(
        updateData
      )
      .eq(
        'id',
        1
      )

  if(error){
    redirect(
      '/commissioner/live-feed?error=save'
    )
  }

  revalidatePath(
    '/commissioner/live-feed'
  )

  redirect(
    '/commissioner/live-feed?saved=1'
  )
}

