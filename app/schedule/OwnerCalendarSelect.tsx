'use client'

import { useRouter } from 'next/navigation'

export default function OwnerCalendarSelect({
  owners,
  selectedId,
  month
}:{
  owners:{id:number;label:string}[]
  selectedId:number
  month:string
}){
  const router=useRouter()

  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:11,fontWeight:900,opacity:.6,textTransform:'uppercase'}}>Owner</div>
      <select
        value={selectedId}
        onChange={(e)=>{
          const id=Number(e.target.value)
          router.push(`/schedule?squad=${id}&month=${month}`)
        }}
        style={{
          marginTop:4,
          maxWidth:'100%',
          minWidth:118,
          padding:'6px 8px',
          border:'1px solid rgba(128,128,128,.35)',
          borderRadius:8,
          background:'white',
          fontSize:12,
          fontWeight:900,
          textAlign:'center'
        }}
        aria-label="Choose owner"
      >
        {owners.map(owner=>(
          <option key={owner.id} value={owner.id}>{owner.label}</option>
        ))}
      </select>
    </div>
  )
}
