import { deadlineGroup, NotificationsService } from './notifications.service';
const now=new Date('2026-10-04T12:00:00Z');
describe('personal task notifications',()=>{
  let db:any;
  let service:NotificationsService;
  const user={id:7,cid:'test-cid',departmentId:1,departmentId2:2,teamId:3,name:'Test user',role:'staff'};
  beforeEach(()=>{
    const model=()=>({findMany:jest.fn().mockResolvedValue([])});
    db={riskregister:{...model(),fields:{department_id:'field-ref'}},rca_case:model(),standard_rca_case:model(),riskanalysis:model(),capa_action:model(),sla_instance:model()};
    service=new NotificationsService(db);
  });
  it('uses Bangkok calendar dates for date-only deadlines and exact time for SLA',()=>{
    expect(deadlineGroup('2026-10-04',now,true)).toBe('due');
    expect(deadlineGroup('2026-10-03',now,true)).toBe('overdue');
    expect(deadlineGroup('2026-10-12',now,true)).toBeNull();
    expect(deadlineGroup('2026-10-04T11:59:00Z',now)).toBe('overdue');
    expect(deadlineGroup('invalid',now)).toBeNull();
    expect(deadlineGroup('2026-10-04',new Date('2026-10-03T18:00:00Z'),true)).toBe('due');
  });
  it('keeps even administrator alerts scoped to personal departments and assignments',async()=>{
    await service.list({...user,role:'admin'},now);
    const forward=db.riskregister.findMany.mock.calls[0][0].where.AND;
    expect(forward[1].OR).toContainEqual({sendto_team_id:3});
    expect(forward[1].OR[2].AND).toContainEqual({sendto_department_id:{in:['1','2']}});
    expect(forward[1].OR[2].AND[1]).toEqual({NOT:{sendto_department_id:{equals:'field-ref'}}});
    expect(forward[0].status_risk.notIn).toContain('จำหน่าย');
    expect(forward[2].OR[1].review_forwarding_purpose.in).not.toContain('INFORM');
    expect(db.standard_rca_case.findMany.mock.calls[0][0].where.AND[0].OR[2].participants.some.OR).toContainEqual({user_id:7});
  });
  it('does not widen scope for an account with no department or team',async()=>{
    await service.list({id:9,role:'admin'},now);
    const scope=db.riskregister.findMany.mock.calls[0][0].where.AND[1].OR;
    expect(scope).toContainEqual({sendto_team_id:-1});
    expect(scope[2].AND[0]).toEqual({sendto_department_id:{in:[]}});
  });
  it('separates deadline groups and suppresses finished implementation and effectiveness',async()=>{
    db.riskanalysis.findMany.mockResolvedValue([{id:1,next_review_date:new Date('2026-10-03'),scope_level:'department'},{id:2,next_review_date:new Date('2026-10-04'),scope_level:'hospital'}]);
    db.capa_action.findMany.mockResolvedValue([{id:8,status:'AWAITING_APPROVAL',completed_at:now,due_date:new Date('2026-10-01'),effectiveness_due_date:new Date('2026-10-02'),effectiveness_status:'EFFECTIVE'}]);
    const result=await service.list(user,now);
    expect(result.groups.find(g=>g.group==='overdue')?.items).toHaveLength(1);
    expect(result.groups.find(g=>g.group==='due')?.items[0].href).toContain('scope=hospital&risk=2');
    expect(result.groups.flatMap(g=>g.items).some(i=>i.href.startsWith('/capa'))).toBe(false);
  });
  it('suppresses orphaned or closed incident SLA without leaking a clinical narrative',async()=>{
    db.sla_instance.findMany.mockResolvedValue([{id:1,entity_id:'55',due_at:new Date('2026-10-01'),workflow_stage:'REVIEW_OWNER'}]);
    const result=await service.list(user,now);
    expect(result.groups.find(g=>g.group==='overdue')?.total).toBe(0);
    expect(db.riskregister.findMany.mock.calls[2][0].select).toEqual({id:true});
  });
  it('counts every matching alert but limits the displayed list',async()=>{
    db.rca_case.findMany.mockResolvedValue(Array.from({length:60},(_,i)=>({id:`TEST-${i}`,created_at:now,due_at:null,incident_id:i+1})));
    const result=await service.list(user,now);
    expect(result.groups.find(g=>g.group==='rca')).toMatchObject({total:60,limited:true});
    expect(result.groups.find(g=>g.group==='rca')?.items).toHaveLength(50);
  });
});
