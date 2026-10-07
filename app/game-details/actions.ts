'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Choice='away'|'home'|'no_pick'|'over'|'under'

export async function saveMatchupDecision(
  gameId:number,
  choice:Choice
){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()

  if(!user){
    return {ok:false,message:'Please sign in again.'}
  }

  const {error}=await supabase.rpc(
    'submit_matchup_decision',
    {
      p_game_id:gameId,
      p_choice:choice,
      p_season:2026
    }
  )

  if(error){
    const message=String(error.message||'').toLowerCase()

    if(message.includes('period_limit')){
      return {ok:false,message:'You have reached the maximum number of picks for this period.'}
    }

    if(message.includes('locked')){
      return {ok:false,message:'The bet window for this game is closed.'}
    }

    if(message.includes('no_squad')){
      return {ok:false,message:'No squad is assigned to this account.'}
    }

    return {ok:false,message:'The decision could not be saved.'}
  }

  revalidatePath('/schedule')
  revalidatePath('/standings')
  revalidatePath('/game-details')

  return {ok:true,message:choice==='no_pick'?'No pick saved.':'Decision saved.'}
}
