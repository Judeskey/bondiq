import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { getCoupleForUser } from "@/lib/getCoupleForUser";

function startOfWeek(d: Date){
  const x=new Date(d);
  const day=x.getDay();
  const diff=(day===0?-6:1)-day;
  x.setDate(x.getDate()+diff);
  x.setHours(0,0,0,0);
  return x;
}

export async function GET(){
  try{
    const {email}=await requireUser();
    const user=await prisma.user.findUnique({where:{email}});
    if(!user) return NextResponse.json({error:"User not found"},{status:404});

    const coupleId=await getCoupleForUser(user.id);
    if(!coupleId) return NextResponse.json({entries:[]});

    const weekStart=startOfWeek(new Date());

    const entries=await prisma.checkIn.findMany({
      where:{coupleId,weekStart},
      orderBy:{createdAt:"desc"}
    });

    return NextResponse.json({entries});
  } catch (e: any) {
       const message = e?.message || "Unauthorized";
       const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
 }

}
