import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
export type NoticeGroup = 'co_review' | 'rca' | 'due' | 'overdue';
type Notice = {key:string; group:NoticeGroup; label:string; href:string; at:string|null; dueAt?:string; dateOnly?:boolean};
const TERMINAL = ['COMPLETED','CLOSED','DONE','REVIEWED','CANCELLED','CANCELED','VOID'];
const LIMIT = 50;
export function deadlineGroup(value:Date|string|null, now:Date, dateOnly=false): 'due'|'overdue'|null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const today = new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
  const due = dateOnly ? Date.parse(date.toISOString().slice(0,10)) : date.getTime();
  const current = dateOnly ? Date.parse(today) : now.getTime();
  if (due < current) return 'overdue';
  return due <= current+7*86400000 ? 'due' : null;
}
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma:PrismaService) {}
  async list(user:any, now=new Date()) {
    const db:any=this.prisma;
    const uid=Number(user?.id)||-1;
    const cid=user?.cid || '__none__';
    const departments=[user?.departmentId,user?.departmentId2].filter(v=>v && String(v)!=='0').map(String);
    const team=Number(user?.teamId)||-1;
    const incidentOpen={status_risk:{notIn:['จำหน่าย','ไม่ใช่ความเสี่ยง']},operational_closed_at:null};
    const department={department_id:{in:departments}};
    const participant={OR:[{user_id:uid},{member_cid:cid},{department_id:{in:departments}},{team_id:team}]};
    const rcaScope={OR:[department,{assigned_member_cid:cid}]};
    const end=new Date(now.getTime()+8*86400000);
    const incidentSelect={id:true,id_risk:true,department_id:true,sendto_department_id:true,sendto_team_id:true,send_date:true,rca_due_at:true,rca_case_id:true};
    const [forwarded,required,mini,standard,risks,capas,slas] = await Promise.all([
      db.riskregister.findMany({where:{AND:[incidentOpen,{OR:[{sendto_member_cid:cid},{sendto_team_id:team},{AND:[{sendto_department_id:{in:departments}},{NOT:{sendto_department_id:{equals:db.riskregister.fields.department_id}}}]}]},{OR:[{review_forwarding_purpose:null},{review_forwarding_purpose:{in:['CO_REVIEW','ADDITIONAL_ACTION','TRANSFER_OWNER']}}]},{OR:[{team_review_status:null},{team_review_status:{notIn:TERMINAL}}]}]},select:incidentSelect,orderBy:{send_date:'desc'}}),
      db.riskregister.findMany({where:{AND:[incidentOpen,{OR:[department,{sendto_member_cid:cid}]},{rca_required:true},{rca_status:{in:['REQUIRED','PENDING','IN_PROGRESS']}},{rca_case_id:null}]},select:incidentSelect,orderBy:{modify_date:'desc'}}),
      db.rca_case.findMany({where:{AND:[rcaScope,{status:{notIn:TERMINAL}},{completed_at:null}]},select:{id:true,status:true,due_at:true,created_at:true,incident_id:true},orderBy:{created_at:'desc'}}),
      db.standard_rca_case.findMany({where:{AND:[{OR:[...rcaScope.OR,{participants:{some:participant}}]},{status:{notIn:TERMINAL}},{completed_at:null},{OR:[{is_not_risk:false},{is_not_risk:null}]}]},select:{id:true,due_at:true,created_at:true,participants:{where:participant,select:{created_at:true}}},orderBy:{created_at:'desc'}}),
      db.riskanalysis.findMany({where:{AND:[{status:{notIn:['closed','CLOSED']}},{OR:[{risk_owner_user_id:uid},{risk_owner_member_cid:cid},{AND:[department,{risk_owner_user_id:null},{risk_owner_member_cid:null},{risk_owner_name:user?.name || '__none__'}]}]},{next_review_date:{lte:end}}]},select:{id:true,next_review_date:true,scope_level:true},orderBy:{next_review_date:'asc'}}),
      db.capa_action.findMany({where:{AND:[{status:{notIn:['CLOSED','CANCELLED']}},{OR:[{responsible_user_id:uid},{responsible_member_cid:cid},{responsible_department_id:{in:departments}},{responsible_team_id:team}]},{OR:[{due_date:{lte:end}},{effectiveness_due_date:{lte:end}}]}]},select:{id:true,status:true,due_date:true,completed_at:true,effectiveness_due_date:true,effectiveness_status:true},orderBy:{due_date:'asc'}}),
      db.sla_instance.findMany({where:{entity_type:'INCIDENT',status:'ACTIVE',due_at:{lte:end},OR:[{owner_user_id:uid},{owner_department_id:{in:departments}}]},select:{id:true,entity_id:true,due_at:true,workflow_stage:true},orderBy:{due_at:'asc'}}),
    ]);
    const items:Notice[]=[];
    const iso=(date:any)=>date ? new Date(date).toISOString() : null;
    const addDeadline=(key:string,label:string,href:string,date:any,dateOnly=false)=>{
      const group=deadlineGroup(date,now,dateOnly);
      if(group) items.push({key:`${key}:${iso(date)}`,group,label,href,at:null,dueAt:iso(date)!,dateOnly});
    };
    for(const row of forwarded) items.push({key:`forward:${row.id}:${iso(row.send_date)||'legacy'}`,group:'co_review',label:`เรื่องส่งร่วมทบทวน RM ${row.id_risk || row.id}`,href:`/incidents/${row.id}`,at:iso(row.send_date)});
    for(const row of required) {
      const href=`/incidents/${row.id}`;
      items.push({key:`rca-required:${row.id}`,group:'rca',label:`รอทำ RCA หน่วยงาน RM ${row.id_risk || row.id}`,href,at:null});
      addDeadline(`rca-incident:${row.id}`,'กำหนดทำ RCA หน่วยงาน',href,row.rca_due_at);
    }
    for(const row of mini) {
      const href=row.incident_id ? `/incidents/${row.incident_id}` : `/rca/list?case=${encodeURIComponent(row.id)}`;
      items.push({key:`rca:${row.id}`,group:'rca',label:`งาน RCA ${row.id}`,href,at:iso(row.created_at)});
      addDeadline(`rca:${row.id}`,`กำหนดทบทวน RCA ${row.id}`,href,row.due_at);
    }
    for(const row of standard) {
      const href=`/rca/standard/${encodeURIComponent(row.id)}`;
      const invitation=row.participants?.map(p=>p.created_at).sort((a,b)=>new Date(b).getTime()-new Date(a).getTime())[0];
      items.push({key:`standard:${row.id}:${iso(invitation)||'owner'}`,group:'rca',label:`งาน Standard RCA ${row.id}`,href,at:iso(invitation || row.created_at)});
      addDeadline(`standard:${row.id}`,`กำหนดทบทวน RCA ${row.id}`,href,row.due_at);
    }
    for(const row of risks) addDeadline(`risk:${row.id}`,'กำหนดทบทวน Risk Register',`/reports?view=register&scope=${row.scope_level === 'hospital' ? 'hospital' : 'department'}&risk=${row.id}`,row.next_review_date,true);
    for(const row of capas) {
      if(!row.completed_at) addDeadline(`capa:${row.id}`,'กำหนดดำเนินมาตรการ',`/capa?action=${row.id}`,row.due_date,true);
      if(['IMPLEMENTED','AWAITING_EFFECTIVENESS'].includes(row.status) && ['PENDING','REVIEW_REQUIRED','NOT_DUE'].includes(row.effectiveness_status)) addDeadline(`effectiveness:${row.id}`,'กำหนดประเมินประสิทธิผลมาตรการ',`/capa?action=${row.id}`,row.effectiveness_due_date,true);
    }
    // Ignore orphaned SLA rows and operationally closed incidents.
    const slaIncidents=slas.length ? await db.riskregister.findMany({where:{AND:[incidentOpen,{id:{in:slas.map(s=>Number(s.entity_id)).filter(Number.isFinite)}},{OR:[department,{sendto_department_id:{in:departments}},{sendto_member_cid:cid},{sendto_team_id:team},{created_by:uid}]}]},select:{id:true}}) : [];
    for(const row of slas) if(slaIncidents.some(i=>String(i.id)===row.entity_id)) addDeadline(`incident-sla:${row.id}`,'กำหนดติดตามเหตุการณ์',`/incidents/${row.entity_id}`,row.due_at);

    const groups=(['co_review','rca','due','overdue'] as NoticeGroup[]).map(group=>{
      const sorted=items.filter(i=>i.group===group).sort((a,b)=>group==='due'||group==='overdue' ? String(a.dueAt).localeCompare(String(b.dueAt)) : String(b.at).localeCompare(String(a.at)));
      return {group,items:sorted.slice(0,LIMIT),total:sorted.length,limited:sorted.length>LIMIT};
    });
    return {generatedAt:now.toISOString(),groups};
  }
}
