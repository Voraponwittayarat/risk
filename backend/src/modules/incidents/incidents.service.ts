import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetIncidentsQueryDto } from './dto/get-incidents-query.dto';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async buildScopingFilter(user: any, status_risk?: string, scope_type?: string) {
    if (!user) return {};
    const isAdmin = user.accessrules === '1' || user.role === 'admin' || user.accessrules === 'admin';
    if (isAdmin) return {};

    // If team scope is requested and user has a team, return team-scoped filter immediately for any role
    if (scope_type === 'team' && user.teamId) {
      return { sendto_team_id: user.teamId };
    }

    const isRmCommittee = user.rmStatus === '1' || user.role === 'rm_committee' || user.accessrules === 'rm_committee';
    const isHeadOfGroup = user.priority === '1' || user.role === 'head' || user.accessrules === 'head';

    if (isRmCommittee) {
      const scope = scope_type || 'primary';
      if (status_risk === 'รายงาน') {
        const deptId = (scope === 'secondary' && user.departmentId2 && user.departmentId2 !== 0)
          ? user.departmentId2.toString()
          : (user.departmentId || '').toString();
        return { department_id: deptId };
      } else {
        if (scope === 'team' && user.teamId) {
          return { sendto_team_id: user.teamId };
        } else {
          const deptId = (scope === 'secondary' && user.departmentId2 && user.departmentId2 !== 0)
            ? user.departmentId2.toString()
            : (user.departmentId || '').toString();
          return {
            OR: [
              { department_id: deptId },
              { sendto_department_id: deptId }
            ]
          };
        }
      }
    } else if (isHeadOfGroup && user.departmentGroup) {
      if (status_risk === 'รายงาน') {
        return { department_id: (user.departmentId || '').toString() };
      } else {
        const depts = await this.prisma.department.findMany({
          where: { depart_group_id: user.departmentGroup },
          select: { id: true },
        });
        const deptIds = depts.map(d => d.id.toString());
        return {
          OR: [
            { department_id: { in: deptIds } },
            { sendto_department_id: { in: deptIds } }
          ]
        };
      }
    } else if (user.departmentId) {
      const scope = scope_type || 'primary';
      const deptId = (scope === 'secondary' && user.departmentId2 && user.departmentId2 !== 0)
        ? user.departmentId2.toString()
        : user.departmentId.toString();

      if (status_risk === 'รายงาน') {
        return { department_id: deptId };
      } else {
        return {
          OR: [
            { department_id: deptId },
            { sendto_department_id: deptId }
          ]
        };
      }
    }
    return {};
  }

  async findAll(query: GetIncidentsQueryDto, user?: any) {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      department_id, 
      level_id, 
      status_risk,
      search,
      program_id,
      sendto_team_id,
      is_forwarded
    } = query as any;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Forwarded to Lead Team Filter
    if (sendto_team_id) {
      where.sendto_team_id = Number(sendto_team_id);
    } else if (is_forwarded === 'true' || is_forwarded === true) {
      where.OR = [
        { sendto_team_id: { not: null } },
        { sendto_department_id: { not: null } },
      ];
    }

    // Date filtering
    if (startDate || endDate) {
      where.date_report = {};
      if (startDate) where.date_report.gte = new Date(startDate);
      if (endDate) where.date_report.lte = new Date(endDate);
    }

    // Severity level filter or Sentinel filter
    if (level_id) {
      if (level_id === 'sentinel_clinical') {
        where.OR = [
          { level_id: { in: ['G', 'H', 'I'] } },
          {
            AND: [
              { level_id: { in: ['E', 'F'] } },
              { riskstore_id: { in: [297, 298, 300, 302] } }
            ]
          },
          { riskstore_id: 2000071 }
        ];
      } else if (level_id === 'sentinel_general') {
        where.level_id = { in: ['4', '5'] };
      } else if (level_id === 'sentinel_all') {
        where.OR = [
          { level_id: { in: ['G', 'H', 'I', '4', '5'] } },
          {
            AND: [
              { level_id: { in: ['E', 'F'] } },
              { riskstore_id: { in: [297, 298, 300, 302] } }
            ]
          },
          { riskstore_id: 2000071 }
        ];
      } else {
        where.level_id = level_id;
      }
    }

    // Status filter
    if (status_risk && status_risk !== 'all') {
      where.status_risk = status_risk;
    }

    // Program filter
    if (program_id) {
      where.program_id = program_id;
    }

    // Keyword Search
    if (search && search.trim() !== '') {
      const s = search.trim();
      const numId = Number(s);
      where.OR = [
        { detail: { contains: s } },
        { problem_basic: { contains: s } },
        { detail_hosxp: { contains: s } },
      ];
      if (!isNaN(numId)) {
        where.OR.push({ id: numId });
        where.OR.push({ id_risk: numId });
      }
    }

    // RBAC Data Scoping
    const scoping = await this.buildScopingFilter(user, status_risk, query.scope_type);
    if (Object.keys(scoping).length > 0) {
      if (department_id) {
        where.AND = [
          scoping,
          { department_id: department_id }
        ];
      } else {
        where.AND = [scoping];
      }
    } else if (department_id) {
      where.department_id = department_id;
    }

    const sortField = query.sortBy || 'id';
    const sortDirection = query.sortOrder || 'desc';
    const orderBy: any = {};
    const validSortFields = [
      'id',
      'level_id',
      'status_risk',
      'date_report',
      'register_date',
      'department_id',
      'sendto_department_id'
    ];

    if (validSortFields.includes(sortField)) {
      orderBy[sortField] = sortDirection;
    } else {
      orderBy['id'] = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.riskregister.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.riskregister.count({ where }),
    ]);

    // Fetch department mapping for both department_id and sendto_department_id
    const deptIds = Array.from(new Set([
      ...data.map(d => Number(d.department_id)).filter(Boolean),
      ...data.map(d => Number(d.sendto_department_id)).filter(Boolean)
    ]));
    const departments = await this.prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, depart_name: true },
    });
    const deptMap = new Map(departments.map(d => [d.id.toString(), d.depart_name]));

    // Fetch risk topic mapping from risks table (RID = id_risk or id = riskstore_id)
    const riskIds = Array.from(new Set(data.map(d => d.id_risk).filter(Boolean)));
    const riskstoreIds = Array.from(new Set(data.map(d => d.riskstore_id).filter(Boolean)));
    const riskMapByRid = new Map<number, string>();
    const riskMapById = new Map<number, string>();

    // 1. Fetch by RID (legacy)
    if (riskIds.length > 0) {
      try {
        const riskRows = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT RID, riskstore FROM risks WHERE RID IN (${riskIds.join(',')})`
        );
        riskRows.forEach(row => {
          if (row.RID && row.riskstore) {
            riskMapByRid.set(Number(row.RID), row.riskstore);
          }
        });
      } catch (e) {
        console.error('Error fetching risks by RID for findAll:', e);
      }
    }

    // 2. Fetch by ID from riskstore table (primary)
    if (riskstoreIds.length > 0) {
      try {
        const riskstoreRows = await this.prisma.riskstore.findMany({
          where: { riskstore_id: { in: riskstoreIds } },
          select: { riskstore_id: true, riskstore_name: true }
        });
        riskstoreRows.forEach(row => {
          if (row.riskstore_id && row.riskstore_name) {
            riskMapById.set(row.riskstore_id, row.riskstore_name);
          }
        });
      } catch (e) {
        console.error('Error fetching riskstore by ID for findAll:', e);
      }
    }

    const enrichedData = data.map(item => ({
      ...item,
      department_name: deptMap.get(item.department_id) || `แผนก ${item.department_id}`,
      sendto_department_name: item.sendto_department_id ? (deptMap.get(item.sendto_department_id.toString()) || `แผนก ${item.sendto_department_id}`) : 'ไม่มีระบุ',
      risk_topic_name: riskMapById.get(item.riskstore_id) || riskMapByRid.get(item.id_risk) || null,
    }));


    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(user?: any) {
    const [
      pendingScoping,
      confirmedScoping,
      reviewingScoping,
      closedScoping,
      notRiskScoping,
      allScoping
    ] = await Promise.all([
      this.buildScopingFilter(user, 'รายงาน'),
      this.buildScopingFilter(user, 'ตรวจสอบ'),
      this.buildScopingFilter(user, 'ทบทวน'),
      this.buildScopingFilter(user, 'จำหน่าย'),
      this.buildScopingFilter(user, 'ไม่ใช่ความเสี่ยง'),
      this.buildScopingFilter(user, 'all')
    ]);

    const [total, pending, confirmed, reviewing, closed, notRisk, sentinelClinical, sentinelGeneral] = await Promise.all([
      this.prisma.riskregister.count({ where: allScoping }),
      this.prisma.riskregister.count({ where: { ...pendingScoping, status_risk: 'รายงาน' } }),
      this.prisma.riskregister.count({ where: { ...confirmedScoping, status_risk: 'ตรวจสอบ' } }),
      this.prisma.riskregister.count({ where: { ...reviewingScoping, status_risk: 'ทบทวน' } }),
      this.prisma.riskregister.count({ where: { ...closedScoping, status_risk: 'จำหน่าย' } }),
      this.prisma.riskregister.count({ where: { ...notRiskScoping, status_risk: 'ไม่ใช่ความเสี่ยง' } }),
      this.prisma.riskregister.count({
        where: {
          ...allScoping,
          OR: [
            { level_id: { in: ['G', 'H', 'I'] } },
            {
              AND: [
                { level_id: { in: ['E', 'F'] } },
                { riskstore_id: { in: [297, 298, 300, 302] } }
              ]
            },
            { riskstore_id: 2000071 }
          ]
        }
      }),
      this.prisma.riskregister.count({ where: { ...allScoping, level_id: { in: ['4', '5'] } } }),
    ]);

    return {
      total,
      pending,        // รายงาน (รอยืนยัน)
      confirmed,      // ตรวจสอบ (ยืนยันแล้ว/รอแก้ไข)
      reviewing,      // ทบทวน (อยู่ระหว่างทบทวน/RCA)
      closed,         // จำหน่าย (ปิดเคส)
      notRisk,        // ไม่ใช่ความเสี่ยง
      sentinelClinical,
      sentinelGeneral,
      sentinelTotal: sentinelClinical + sentinelGeneral,
    };
  }

  async getMyReported(user: any, fiscalYearParam?: string) {
    const userId = Number(user?.id || user?.userId || user?.sub);
    if (!userId) {
      return {
        reportedThisMonth: 0,
        incidents: [],
        fiscalYearsList: [2026, 2025, 2024],
        currentFiscalYear: 2026,
        selectedFiscalYear: 2026
      };
    }

    // Calculate current fiscal year (Thailand fiscal year runs Oct 1st to Sep 30th)
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = Jan, 9 = Oct
    const defaultFiscalYear = currentMonth >= 9 ? currentYear + 1 : currentYear;

    const selectedFiscalYear = fiscalYearParam ? Number(fiscalYearParam) : defaultFiscalYear;

    // Calculate start and end dates for selected fiscal year (e.g. FY 2026: 2025-10-01 to 2026-09-30)
    const startOfYear = new Date(`${selectedFiscalYear - 1}-10-01T00:00:00.000Z`);
    const endOfYear = new Date(`${selectedFiscalYear}-09-30T23:59:59.999Z`);

    // Calculate start and end dates for the current calendar month
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Query reported this month count
    const reportedThisMonth = await this.prisma.riskregister.count({
      where: {
        created_by: userId,
        register_date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      }
    });

    // Query all incidents reported by this user in the selected fiscal year
    const incidents = await this.prisma.riskregister.findMany({
      where: {
        created_by: userId,
        register_date: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Enrich incidents with riskstore name and department name
    const enrichedIncidents = await Promise.all(
      incidents.map(async (inc) => {
        const [rStore, dept, targetDept] = await Promise.all([
          this.prisma.riskstore.findFirst({ where: { riskstore_id: inc.riskstore_id } }),
          this.prisma.department.findUnique({ where: { id: Number(inc.department_id) } }),
          inc.sendto_department_id ? this.prisma.department.findUnique({ where: { id: Number(inc.sendto_department_id) } }) : null
        ]);
        return {
          ...inc,
          riskstore_name: rStore ? rStore.riskstore_name : 'ไม่พบข้อมูลหัวข้อ',
          department_name: dept ? dept.depart_name : 'ไม่พบข้อมูลแผนก',
          sendto_department_name: targetDept ? targetDept.depart_name : 'ไม่มีระบุ'
        };
      })
    );

    // Generate dynamic list of fiscal years from DB to choose from
    const earliestRecord = await this.prisma.riskregister.findFirst({
      where: { created_by: userId },
      orderBy: { register_date: 'asc' },
      select: { register_date: true }
    });

    const yearsList: number[] = [];
    if (earliestRecord && earliestRecord.register_date) {
      const earliestYear = new Date(earliestRecord.register_date).getFullYear();
      for (let y = defaultFiscalYear; y >= earliestYear - 1; y--) {
        if (!yearsList.includes(y) && y >= 2020) {
          yearsList.push(y);
        }
      }
    }
    
    const fallbackYears = [defaultFiscalYear, defaultFiscalYear - 1, defaultFiscalYear - 2];
    fallbackYears.forEach(y => {
      if (!yearsList.includes(y)) {
        yearsList.push(y);
      }
    });

    yearsList.sort((a, b) => b - a);

    return {
      reportedThisMonth,
      incidents: enrichedIncidents,
      fiscalYearsList: yearsList,
      currentFiscalYear: defaultFiscalYear,
      selectedFiscalYear
    };
  }

  async getFormData() {
    const [departments, riskGroups, programs, reviewresults] = await Promise.all([
      this.prisma.department.findMany({
        select: { id: true, depart_name: true, depart_group_id: true },
        orderBy: { depart_name: 'asc' },
      }),
      this.prisma.riskgroup.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.program.findMany({
        select: { program_id: true, program_name: true },
        orderBy: { program_name: 'asc' },
      }),
      this.prisma.reviewresults.findMany({
        select: { id: true, reviewresults_name: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const formattedRiskGroups = riskGroups.map(g => ({
      id: g.id,
      risk_group_name: g.name
    }));

    const mockPrograms = programs.length > 0 ? programs : [
      { program_id: 1, program_name: 'การเฝ้าระวังการติดเชื้อ (IC)' },
      { program_id: 2, program_name: 'การดูแลรักษาผู้ป่วย (PT)' },
      { program_id: 3, program_name: 'ความปลอดภัยด้านสิ่งแวดล้อมและเครื่องมือ (ENV)' },
      { program_id: 4, program_name: 'ระบบยาและความปลอดภัยทางยา (Medication)' },
      { program_id: 5, program_name: 'บุคลากรและความปลอดภัยทั่วไป (HR/General)' }
    ];

    let risks: any[] = [];
    try {
      // Pull risk topics from the dedicated riskstore table
      const rawTopics = await this.prisma.riskstore.findMany({
        orderBy: { riskstore_name: 'asc' }
      });
 
      risks = rawTopics.map(row => {
        const text: string = row.riskstore_name || '';
        // Parse "IC/02 ชื่อความเสี่ยง..." → code="IC/02", name="ชื่อความเสี่ยง..."
        const spaceIdx = text.indexOf(' ');
        const clear_id = spaceIdx > 0 ? text.substring(0, spaceIdx) : text;
        const risk_name = spaceIdx > 0 ? text.substring(spaceIdx + 1).trim() : text;
 
        // Infer program & group from database columns
        let program_id = row.program_id || 2;
        let group_id = row.group_id || 2;
 
        // Fallback prefix parsing if database columns not populated
        if (!row.program_id) {
          const prefix = (clear_id.split('/')[0] || '').toUpperCase();
          if (prefix.startsWith('IC')) {
            program_id = 1; // Infection Control
          } else if (prefix.startsWith('EN')) {
            program_id = 2; // Environment/Safety
          } else if (prefix.startsWith('HR') || prefix.startsWith('CF')) {
            program_id = 3; // HR / Admin Organization
          } else if (prefix.startsWith('ES')) {
            program_id = 4; // Complaints / Rights
          } else if (prefix.startsWith('PTC')) {
            program_id = 5; // Medication Safety
          } else if (prefix.startsWith('PT')) {
            program_id = 6; // Patient Clinical Care
          } else if (prefix.startsWith('IM')) {
            program_id = 7; // IT / Record Systems
          } else if (prefix.startsWith('MI')) {
            program_id = 8; // Medical Equipment
          }
          group_id = [1, 5, 6].includes(program_id) ? 1 : 2;
        }
 
        return {
          id: row.riskstore_id,
          group_id,
          program_id,
          clear_id,
          risk_name,
          riskstore_full: text, // full string for reference
        };
      });
    } catch (e) {
      // Fallback to hardcoded if risks table unavailable
      risks = [
        { id: 1, group_id: 1, program_id: 2, clear_id: 'PT/01', risk_name: 'ผู้ป่วยพลัดตกหกล้ม' },
        { id: 2, group_id: 1, program_id: 4, clear_id: 'MED/01', risk_name: 'ความคลาดเคลื่อนทางยา (Medication Error)' },
        { id: 3, group_id: 1, program_id: 1, clear_id: 'IC/01', risk_name: 'อุบัติเหตุเข็มตำ/สัมผัสสารคัดหลั่ง' },
        { id: 4, group_id: 2, program_id: 3, clear_id: 'ENV/01', risk_name: 'อุปกรณ์และเครื่องมือแพทย์ชำรุดขัดข้อง' },
      ];
    }

    return { departments, riskGroups: formattedRiskGroups, programs: mockPrograms, risks, reviewresults };
  }



  async findOne(id: number) {
    const incident = await this.prisma.riskregister.findFirst({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);
    }

    // Get Department details
    let departmentName = `แผนก ${incident.department_id}`;
    if (incident.department_id) {
      const dept = await this.prisma.department.findUnique({
        where: { id: Number(incident.department_id) || 0 }
      });
      if (dept) departmentName = dept.depart_name;
    }

    // Get Program details
    let programName = '-';
    if (incident.program_id) {
      const prog = await this.prisma.program.findUnique({
        where: { program_id: incident.program_id }
      });
      if (prog) programName = prog.program_name;
    }

    // Get Sendto Team details
    let sendtoTeamName: string | null = null;
    if (incident.sendto_team_id) {
      const teamProg = await this.prisma.program.findUnique({
        where: { program_id: incident.sendto_team_id }
      });
      if (teamProg) sendtoTeamName = teamProg.program_name;
    }

    // Get Sendto Department details
    let sendtoDeptName: string | null = null;
    if (incident.sendto_department_id) {
      const sendtoDept = await this.prisma.department.findUnique({
        where: { id: Number(incident.sendto_department_id) || 0 }
      });
      if (sendtoDept) sendtoDeptName = sendtoDept.depart_name;
    }

    // Get Risk Topic Name from risks.riskstore (e.g. "IC/02 วัสดุเครื่องมือแพทย์ไม่ได้มาตรฐาน")
    let riskTopicName: string | null = null;
    if (incident.riskstore_id) {
      try {
        const riskStoreObj = await this.prisma.riskstore.findUnique({
          where: { riskstore_id: incident.riskstore_id },
          select: { riskstore_name: true }
        });
        if (riskStoreObj) {
          riskTopicName = riskStoreObj.riskstore_name;
        }
      } catch (e) {
        // ignore
      }
    }
    // Fallback to legacy id_risk/RID matching
    if (!riskTopicName && incident.id_risk) {
      try {
        const riskRow = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT riskstore FROM risks WHERE RID = ? LIMIT 1`,
          incident.id_risk
        );
        if (riskRow && riskRow.length > 0 && riskRow[0].riskstore) {
          riskTopicName = riskRow[0].riskstore;
        }
      } catch (e) {
        // ignore if risks table unavailable
      }
    }

    // Get Reviews timeline from riskreview safely
    let reviews: any[] = [];
    try {
      reviews = await this.prisma.riskreview.findMany({
        where: {
          OR: [
            { riskregister_id: id },
            ...(incident.id_risk ? [{ risk_id: incident.id_risk }] : [])
          ]
        },
        orderBy: { id: 'desc' }
      });
    } catch (e) {
      reviews = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, risk_id, riskregister_id, riskvisit, review_date, cause_problem, 
                notereview, reviewresults_id, status_risk, created_by, updated_by
         FROM riskreview 
         WHERE riskregister_id = ? OR risk_id = ? 
         ORDER BY id DESC`,
        id,
        incident.id_risk || 0
      );
    }

    // Enrich reviews with review results description
    const reviewResultIds = reviews.map(r => r.reviewresults_id).filter(Boolean);
    const reviewResults = await this.prisma.reviewresults.findMany({
      where: { id: { in: reviewResultIds } }
    });
    const resultMap = new Map(reviewResults.map(r => [r.id, r.reviewresults_name]));

    const enrichedReviews = reviews.map(r => ({
      ...r,
      reviewresults_name: resultMap.get(r.reviewresults_id) || 'ทบทวนเหตุการณ์'
    }));

    return {
      ...incident,
      department_name: departmentName,
      program_name: programName,
      sendto_team_name: sendtoTeamName,
      sendto_department_name: sendtoDeptName,
      risk_topic_name: riskTopicName,
      reviews: enrichedReviews,
    };
  }

  async create(data: any, user?: any) {
    // Generate id_risk
    const lastRecord = await this.prisma.riskregister.findFirst({
      orderBy: { id_risk: 'desc' },
      select: { id_risk: true }
    });
    const nextIdRisk = (lastRecord?.id_risk || 0) + 1;

    const createData: any = {
      id_risk: nextIdRisk,
      date_report: new Date(data.date_report || new Date()),
      time_report: new Date(data.time_report || new Date()),
      duration_id: data.duration_id ? Number(data.duration_id) : null,
      location_id: data.location_id ? Number(data.location_id) : null,
      user_ir_type: data.user_ir_type || 'ตนเอง',
      user_ir: data.user_ir ? Number(data.user_ir) : (user?.id || 1),
      program_id: data.program_id ? Number(data.program_id) : null,
      level_id: data.level_id || 'A',
      riskstore_id: data.riskstore_id ? Number(data.riskstore_id) : 1,
      detail: data.detail || '',
      detail_hosxp: data.detail_hosxp || null,
      affected: Array.isArray(data.affected) ? data.affected.join(', ') : (data.affected || null),
      edit: data.edit || null,
      problem_basic: data.problem_basic || null,
      inform_id: data.inform_id ? Number(data.inform_id) : 0,
      status_risk: data.status_risk || 'รายงาน', // Default legacy status: รายงาน (รอยืนยัน)
      department_id: data.department_id ? data.department_id.toString() : (user?.department_id?.toString() || '1'),
      register_date: new Date(),
      created_by: user?.id || 1,
      create_date: new Date(),
      modify_date: new Date(),
    };

    const newIncident = await this.prisma.riskregister.create({
      data: createData,
    });

    // Also mirror to legacy `risk` table if possible
    try {
      await this.prisma.risk.create({
        data: {
          date_report: createData.date_report,
          time_report: createData.time_report,
          user_ir_type: createData.user_ir_type.substring(0, 1),
          level_id: createData.level_id,
          riskstore_id: createData.riskstore_id,
          detail: createData.detail,
          detail_hosxp: createData.detail_hosxp,
          affected: createData.affected,
          edit: createData.edit,
          problem_basic: createData.problem_basic,
          inform_id: createData.inform_id,
          status_risk: createData.status_risk,
          department_id: createData.department_id,
          created_by: createData.created_by,
          create_date: new Date(),
          modify_date: new Date(),
        }
      });
    } catch (e) {
      // Ignore mirror error
    }

    return newIncident;
  }

  async update(id: number, data: any) {
    const updateData: any = { ...data };
    delete updateData.riskstore_text;
    delete updateData.risk_id;
    if (data.date_report) updateData.date_report = new Date(data.date_report);
    if (data.time_report) updateData.time_report = new Date(data.time_report);
    if (Array.isArray(data.affected)) updateData.affected = data.affected.join(', ');
    if (data.department_id) updateData.department_id = data.department_id.toString();

    await this.prisma.riskregister.updateMany({
      where: { id },
      data: updateData,
    });

    return this.findOne(id);
  }

  async updateStatus(id: number, newStatus: string, user?: any, note?: string) {
    const validStatuses = ['รายงาน', 'ตรวจสอบ', 'ทบทวน', 'จำหน่าย', 'ไม่ใช่ความเสี่ยง'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const updateData: any = {
      status_risk: newStatus,
      modify_date: new Date(),
      updated_by: user?.id || 1,
    };

    if (newStatus === 'ตรวจสอบ') {
      updateData.send_date = new Date();
      updateData.send_use = user?.name || 'หัวหน้างาน/ผู้ดูแลระบบ';
    }

    await this.prisma.riskregister.updateMany({
      where: { id },
      data: updateData,
    });

    // If a note was provided, log it into riskreview
    if (note && note.trim() !== '') {
      const incident = await this.prisma.riskregister.findFirst({ where: { id } });
      await this.prisma.riskreview.create({
        data: {
          riskregister_id: id,
          risk_id: incident?.id_risk || id,
          riskvisit: `REV-${Date.now().toString().slice(-10)}`,
          review_date: new Date(),
          notereview: note,
          reviewresults_id: newStatus === 'จำหน่าย' ? 2 : 1,
          status_risk: newStatus,
          created_by: user?.id || 1,
          create_date: new Date(),
          modify_date: new Date(),
          count: 1,
        }
      });
    }

    return this.findOne(id);
  }

  async addReview(id: number, reviewDto: any, user?: any) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    const createdReview = await this.prisma.riskreview.create({
      data: {
        riskregister_id: id,
        risk_id: incident.id_risk,
        riskvisit: `REV-${Date.now().toString().slice(-10)}`,
        review_date: new Date(reviewDto.review_date || new Date()),
        notereview: reviewDto.notereview || reviewDto.note || 'บันทึกการทบทวนเหตุการณ์',
        cause_problem: reviewDto.cause_problem || null,
        reviewresults_id: reviewDto.reviewresults_id ? Number(reviewDto.reviewresults_id) : 1,
        status_risk: 'ทบทวน',
        created_by: user?.id || 1,
        create_date: new Date(),
        modify_date: new Date(),
        count: 1,
      }
    });

    // Update riskregister status to 'ทบทวน'
    await this.prisma.riskregister.updateMany({
      where: { id },
      data: {
        status_risk: 'ทบทวน',
        modify_date: new Date(),
        updated_by: user?.id || 1,
      }
    });

    return createdReview;
  }

  async forwardIncident(id: number, forwardDto: { sendto_team_id?: number; sendto_department_id?: string; refer_type?: string; note?: string }, user?: any) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    const referType = forwardDto.refer_type || (forwardDto.sendto_team_id ? '2' : '1');
    const updateData: any = {
      sendto_team_id: forwardDto.sendto_team_id ? Number(forwardDto.sendto_team_id) : null,
      sendto_department_id: forwardDto.sendto_department_id ? forwardDto.sendto_department_id.toString() : null,
      refer_type: referType,
      send_date: new Date(),
      send_use: user?.name || 'ผู้ประสานงานความเสี่ยง',
      note: forwardDto.note || null,
      modify_date: new Date(),
      updated_by: user?.id || 1,
    };

    await this.prisma.riskregister.updateMany({
      where: { id },
      data: updateData,
    });

    // Determine destination target name for audit log
    let targetName = 'ทีมนำ / หน่วยงานที่เกี่ยวข้อง';
    if (forwardDto.sendto_team_id) {
      const prog = await this.prisma.program.findUnique({
        where: { program_id: Number(forwardDto.sendto_team_id) }
      });
      if (prog) targetName = `ทีมนำ: ${prog.program_name}`;
    } else if (forwardDto.sendto_department_id) {
      const dept = await this.prisma.department.findUnique({
        where: { id: Number(forwardDto.sendto_department_id) }
      });
      if (dept) targetName = `หน่วยงาน: ${dept.depart_name}`;
    }

    // Add audit entry in riskreview
    await this.prisma.riskreview.create({
      data: {
        riskregister_id: id,
        risk_id: incident.id_risk,
        riskvisit: `FWD-${Date.now().toString().slice(-10)}`,
        review_date: new Date(),
        notereview: `📤 [ส่งต่อร่วมทบทวน]: ส่งเรื่องไปยัง "${targetName}" เพื่อร่วมทบทวนและให้ข้อเสนอแนะ ${forwardDto.note ? `\nประเด็นที่ส่งปรึกษา: ${forwardDto.note}` : ''}`,
        cause_problem: 'ประสานงานส่งต่อร่วมทบทวน',
        reviewresults_id: 1,
        status_risk: incident.status_risk || 'ตรวจสอบ',
        created_by: user?.id || 1,
        create_date: new Date(),
        modify_date: new Date(),
        count: 1,
      }
    });

    return this.findOne(id);
  }

  async getRiskMatrixStats(query?: any) {
    // Only calculate for confirmed incidents: ตรวจสอบ, ทบทวน, จำหน่าย
    const where: any = {
      status_risk: { in: ['ตรวจสอบ', 'ทบทวน', 'จำหน่าย'] }
    };

    if (query?.department_id) {
      where.department_id = query.department_id.toString();
    }
    if (query?.program_id) {
      where.program_id = Number(query.program_id);
    }
    if (query?.startDate || query?.endDate) {
      where.date_report = {};
      if (query.startDate) where.date_report.gte = new Date(query.startDate);
      if (query.endDate) where.date_report.lte = new Date(query.endDate);
    }

    const incidents = await this.prisma.riskregister.findMany({
      where,
      select: {
        id: true,
        id_risk: true,
        level_id: true,
        date_report: true,
        department_id: true,
        program_id: true,
        detail: true,
        status_risk: true,
      }
    });

    // Helper to map severity level (A-I or 1-5) to 1..5 scale
    const mapSeverityToY = (level: string): number => {
      const upper = (level || '').toUpperCase().trim();
      if (['A', 'B', '1'].includes(upper)) return 1; // Minor / Near miss
      if (['C', 'D', '2'].includes(upper)) return 2; // Moderate
      if (['E', 'F', '3'].includes(upper)) return 3; // Serious
      if (['G', 'H', '4'].includes(upper)) return 4; // Major
      if (['I', '5'].includes(upper)) return 5;      // Catastrophic / Sentinel
      return 1;
    };

    // Calculate frequency per program/riskstore or department
    const groupCount: Record<string, number> = {};
    incidents.forEach(inc => {
      const key = `${inc.program_id || 'general'}_${inc.level_id}`;
      groupCount[key] = (groupCount[key] || 0) + 1;
    });

    const mapCountToFrequencyX = (count: number): number => {
      if (count <= 2) return 1;  // Rarely
      if (count <= 5) return 2;  // Unlikely
      if (count <= 10) return 3; // Possible
      if (count <= 20) return 4; // Likely
      return 5;                  // Almost Certain
    };

    // Build 5x5 Matrix: matrix[y][x] where y=1..5 (Severity), x=1..5 (Likelihood)
    const matrix: any[][] = Array.from({ length: 6 }, () => 
      Array.from({ length: 6 }, () => ({ count: 0, items: [] }))
    );

    incidents.forEach(inc => {
      const y = mapSeverityToY(inc.level_id);
      const key = `${inc.program_id || 'general'}_${inc.level_id}`;
      const freq = groupCount[key] || 1;
      const x = mapCountToFrequencyX(freq);

      matrix[y][x].count += 1;
      if (matrix[y][x].items.length < 5) {
        matrix[y][x].items.push({
          id: inc.id,
          id_risk: inc.id_risk,
          level_id: inc.level_id,
          detail: inc.detail?.slice(0, 60),
          status_risk: inc.status_risk
        });
      }
    });

    return {
      totalConfirmed: incidents.length,
      matrix: matrix.slice(1).map(row => row.slice(1)), // Return 5x5 array
      frequencies: groupCount,
    };
  }

  async getReportAnalytics(query?: any) {
    const where: any = {};
    if (query?.department_id) where.department_id = query.department_id.toString();
    if (query?.startDate || query?.endDate) {
      where.date_report = {};
      if (query.startDate) where.date_report.gte = new Date(query.startDate);
      if (query.endDate) where.date_report.lte = new Date(query.endDate);
    }

    const [byStatusRaw, byLevelRaw, allIncidents, departments, programs] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT status_risk, COUNT(*) as count 
        FROM riskregister 
        GROUP BY status_risk
      `,
      this.prisma.$queryRaw`
        SELECT level_id, COUNT(*) as count 
        FROM riskregister 
        GROUP BY level_id 
        ORDER BY count DESC
      `,
      this.prisma.riskregister.findMany({
        where,
        select: {
          id: true,
          date_report: true,
          level_id: true,
          program_id: true,
          department_id: true,
          user_ir_type: true,
        },
        take: 500,
        orderBy: { id: 'desc' }
      }),
      this.prisma.department.findMany({ select: { id: true, depart_name: true } }),
      this.prisma.program.findMany({ select: { program_id: true, program_name: true } }),
    ]);

    const deptMap = new Map(departments.map(d => [d.id.toString(), d.depart_name]));
    const progMap = new Map(programs.map(p => [p.program_id, p.program_name]));

    // Program Distribution
    const programCounts: Record<string, number> = {};
    allIncidents.forEach(inc => {
      const pName = progMap.get(inc.program_id || 0) || 'ทั่วไป/ไม่ระบุโปรแกรม';
      programCounts[pName] = (programCounts[pName] || 0) + 1;
    });

    // Department Distribution
    const departmentCounts: Record<string, number> = {};
    allIncidents.forEach(inc => {
      const dName = deptMap.get(inc.department_id) || `แผนก ${inc.department_id}`;
      departmentCounts[dName] = (departmentCounts[dName] || 0) + 1;
    });

    return {
      byStatus: byStatusRaw,
      byLevel: byLevelRaw,
      byProgram: Object.entries(programCounts).map(([name, count]) => ({ name, count })),
      byDepartment: Object.entries(departmentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  async getRiskRegister(query?: any) {
    const where: any = {};
    if (query?.department_id) where.department_id = query.department_id.toString();
    if (query?.startDate || query?.endDate) {
      where.date_report = {};
      if (query.startDate) where.date_report.gte = new Date(query.startDate);
      if (query.endDate) where.date_report.lte = new Date(query.endDate);
    }

    const incidents = await this.prisma.riskregister.findMany({
      where,
      select: {
        id: true,
        id_risk: true,
        level_id: true,
        date_report: true,
        department_id: true,
        program_id: true,
        riskstore_id: true,
        detail: true,
        status_risk: true,
        edit: true,
      },
      orderBy: { id: 'desc' },
      take: 1000,
    });

    const [departments, programs] = await Promise.all([
      this.prisma.department.findMany({ select: { id: true, depart_name: true } }),
      this.prisma.program.findMany({ select: { program_id: true, program_name: true } }),
    ]);

    const deptMap = new Map(departments.map(d => [d.id.toString(), d.depart_name]));
    const progMap = new Map(programs.map(p => [p.program_id, p.program_name]));

    const masterRiskProfiles = [
      {
        id: 1,
        code: 'PT/01',
        name: 'ผู้ป่วยพลัดตกหกล้ม (Patient Fall)',
        category: 'Clinical Risk (ความเสี่ยงทางคลินิก)',
        program_id: 2,
        program_name: 'การดูแลรักษาผู้ป่วย (PT)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 1: การดูแลผู้ป่วยวิกฤตและป้องกันการบาดเจ็บ',
        safety_goal: 'Patient Safety (P: Patient Fall Prevention)',
        existing_controls: 'ประเมิน Fall Risk Score ทุกรายแรกรับ, ติดป้ายสัญลักษณ์เสี่ยงล้ม, ยกไม้กั้นเตียง 2 ข้าง',
        mitigation_plan: 'ทบทวนเกณฑ์ High Fall Risk Protocol, อบรมญาติและผู้ดูแล, ติดตั้งเซ็นเซอร์กันตกเตียงในหอผู้ป่วยพิเศษ',
        responsible_unit: 'คณะกรรมการความปลอดภัยผู้ป่วย (PT Committee) / งานการพยาบาล',
        control_status: 'มีแผนควบคุมแล้ว',
        keywords: ['หกล้ม', 'ตกเตียง', 'fall', 'pt/01', 'พลัดตก'],
      },
      {
        id: 2,
        code: 'MED/01',
        name: 'ความคลาดเคลื่อนทางยา (Medication Error - Level E+)',
        category: 'Clinical Risk (ความเสี่ยงทางคลินิก)',
        program_id: 4,
        program_name: 'ระบบยาและความปลอดภัยทางยา (Medication)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 3: การบริหารยาที่มีความเสี่ยงสูง (High Alert Drugs)',
        safety_goal: 'Medication Safety (M: Medication Error Prevention)',
        existing_controls: 'ระบบ Double Check ยา HAD โดยพยาบาล 2 คน, ป้ายเตือน LASA บนกล่องยา, ตรวจสอบซ้ำก่อนจ่ายยา',
        mitigation_plan: 'ติดตั้งระบบ Barcode Medication Administration (BCMA), ปรับปรุงระบบแจ้งเตือน Drug Interaction ใน HOSxP',
        responsible_unit: 'คณะกรรมการเภสัชกรรมและการบำบัด (PTC) / กลุ่มงานเภสัชกรรม',
        control_status: 'เฝ้าระวังต่อเนื่อง',
        keywords: ['ยา', 'med', 'dose', 'แพ้ยา', 'ฉีดยา', 'medication', 'lasa', 'had'],
      },
      {
        id: 3,
        code: 'IC/01',
        name: 'การติดเชื้อในโรงพยาบาล (CAUTI, VAP, CLABSI, SSI)',
        category: 'Clinical Risk (ความเสี่ยงทางคลินิก)',
        program_id: 1,
        program_name: 'การเฝ้าระวังการติดเชื้อ (IC)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 4: การป้องกันและควบคุมการติดเชื้อในโรงพยาบาล',
        safety_goal: 'Infection Prevention (I: Healthcare-Associated Infections)',
        existing_controls: 'ปฏิบัติการล้างมือ 5 Moments, ชุด Care Bundle สำหรับสายสวนปัสสาวะและสายสวนหลอดเลือดดำ, ตรวจสอบสิ่งแวดล้อม IC Round',
        mitigation_plan: 'เพิ่มความถี่ IC Surveillance ในหอผู้ป่วยวิกฤต (ICU), อบรมเชิงปฏิบัติการ Sterile Technique สำหรับบุคลากรใหม่',
        responsible_unit: 'คณะกรรมการป้องกันและควบคุมการติดเชื้อ (ICC) / ทีม ICN',
        control_status: 'มีแผนควบคุมแล้ว',
        keywords: ['ติดเชื้อ', 'ic', 'cauti', 'vap', 'clabsi', 'ssi', 'เชื้อดื้อยา', 'sterile'],
      },
      {
        id: 4,
        code: 'PT/02',
        name: 'การเกิดแผลกดทับระดับ 2 ขึ้นไปในโรงพยาบาล (Hospital-Acquired Pressure Injury)',
        category: 'Clinical Risk (ความเสี่ยงทางคลินิก)',
        program_id: 2,
        program_name: 'การดูแลรักษาผู้ป่วย (PT)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 1: การดูแลผู้ป่วยและคุณภาพการพยาบาล',
        safety_goal: 'Patient Safety (P: Pressure Injury Prevention)',
        existing_controls: 'ประเมิน Braden Scale ภายใน 2 ชั่วโมงแรกรับ, พลิกตัวผู้ป่วยติดเตียงทุก 2 ชั่วโมง, ใช้เบาะลมลดแรงกด',
        mitigation_plan: 'จัดหาที่นอนลมแรงดันสลับสำหรับผู้ป่วยความเสี่ยงสูงมาก, จัดทีม Skin Care Nurse ติดตามประเมินแผลสัปดาห์ละครั้ง',
        responsible_unit: 'ทีมพัฒนาคุณภาพการพยาบาล (Nursing Quality Committee)',
        control_status: 'เฝ้าระวังต่อเนื่อง',
        keywords: ['แผลกดทับ', 'pressure', 'braden', 'bed sore'],
      },
      {
        id: 5,
        code: 'PT/03',
        name: 'การระบุตัวผู้ป่วยผิดพลาด (Patient Identification Error)',
        category: 'Clinical Risk (ความเสี่ยงทางคลินิก)',
        program_id: 2,
        program_name: 'การดูแลรักษาผู้ป่วย (PT)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 2: การระบุตัวผู้ป่วยอย่างถูกต้องแม่นยำ',
        safety_goal: 'Patient Identification (P: Correct Patient Identification)',
        existing_controls: 'ใช้ตัวระบุตัวตนอย่างน้อย 2 ตัว (ชื่อ-สกุล และ HN/วันเดือนปีเกิด), ติดป้ายข้อมือผู้ป่วยในทุกราย, ตรวจสอบซ้ำก่อนทำหัตถการ/เจาะเลือด',
        mitigation_plan: 'ใช้เครื่องสแกนบาร์โค้ดสายรัดข้อมือคู่กับระบบ EMR, รณรงค์การถามชื่อ-สกุลแบบเปิด (Open-ended question)',
        responsible_unit: 'คณะกรรมการบริหารความเสี่ยง (RM Committee) / ฝ่ายการพยาบาล',
        control_status: 'บรรลุผลสำเร็จ',
        keywords: ['ระบุตัว', 'ผิดคน', 'สลับตัว', 'ป้ายข้อมือ', 'identification', 'hn ผิด'],
      },
      {
        id: 6,
        code: 'BLD/01',
        name: 'อุบัติการณ์การให้เลือดและส่วนประกอบเลือดผิดพลาด (Blood Transfusion Reaction / Error)',
        category: 'Clinical Risk (ความเสี่ยงทางคลินิก)',
        program_id: 2,
        program_name: 'การดูแลรักษาผู้ป่วย (PT)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 5: ความปลอดภัยในการให้เลือดและส่วนประกอบของเลือด',
        safety_goal: 'Blood Safety (B: Safe Blood Transfusion)',
        existing_controls: 'กระบวนการ Cross-matching รัดกุม, Double Check 2 คนข้างเตียง (Bedside Check), บันทึก Vital Signs 15 นาทีแรก',
        mitigation_plan: 'พัฒนาระบบ Blood Tracking System อิเล็กทรอนิกส์, ซ้อมแผนระงับการให้เลือดเมื่อเกิดปฏิกิริยาผิดปกติทันที',
        responsible_unit: 'คณะกรรมการการใช้เลือด (Blood Transfusion Committee) / ธนาคารเลือด',
        control_status: 'มีแผนควบคุมแล้ว',
        keywords: ['เลือด', 'blood', 'transfusion', 'crossmatch', 'prc', 'ffp'],
      },
      {
        id: 7,
        code: 'SURG/01',
        name: 'การผ่าตัดผิดคน ผิดข้าง ผิดตำแหน่ง หรือสิ่งแปลกปลอมตกค้าง (Wrong Site Surgery & Retained Items)',
        category: 'Clinical Risk (ความเสี่ยงทางคลินิก)',
        program_id: 2,
        program_name: 'การดูแลรักษาผู้ป่วย (PT)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 6: ความปลอดภัยในการทำผ่าตัดและหัตถการ',
        safety_goal: 'Safe Surgery (S: Surgical Safety Checklist)',
        existing_controls: 'ใช้ WHO Surgical Safety Checklist (Sign-in, Time-out, Sign-out), การทำ Site Marking โดยแพทย์ผู้ผ่าตัด',
        mitigation_plan: 'บังคับบันทึก Surgical Safety Checklist ในระบบดิจิทัลแบบ Real-time ในห้องผ่าตัด, ตรวจนับผ้ากอซและเครื่องมือแบบ 2 ผู้ตรวจ',
        responsible_unit: 'คณะกรรมการห้องผ่าตัด (OR Committee)',
        control_status: 'มีแผนควบคุมแล้ว',
        keywords: ['ผ่าตัด', 'surgery', 'or', 'หัตถการ', 'ก๊อซ', 'ผิดข้าง', 'time-out'],
      },
      {
        id: 8,
        code: 'ENV/01',
        name: 'เครื่องมือและอุปกรณ์ทางการแพทย์ชำรุด/ไม่พร้อมใช้งาน (Medical Device Failure)',
        category: 'Non-Clinical Risk (ความเสี่ยงทั่วไป/สิ่งแวดล้อม)',
        program_id: 3,
        program_name: 'ความปลอดภัยด้านสิ่งแวดล้อมและเครื่องมือ (ENV)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 7: ความปลอดภัยของระบบสิ่งแวดล้อมและเครื่องมือแพทย์',
        safety_goal: 'Environment Safety (E: Equipment & Facility Safety)',
        existing_controls: 'แผนบำรุงรักษาเชิงป้องกัน (PM: Preventive Maintenance) รายปี, ติดสติกเกอร์ Calibrate ผ่านการทดสอบ, มีเครื่องสำรองฉุกเฉิน',
        mitigation_plan: 'จัดระบบแจ้งซ่อมเครื่องมือแพทย์ด่วนผ่านแอปพลิเคชัน, สำรองเครื่อง Defibrillator และเครื่องช่วยหายใจในจุดสำคัญ',
        responsible_unit: 'คณะกรรมการบริหารสิ่งแวดล้อมและความปลอดภัย (ENV Committee) / ศูนย์เครื่องมือแพทย์',
        control_status: 'เฝ้าระวังต่อเนื่อง',
        keywords: ['เครื่องมือ', 'ชำรุด', 'เสีย', 'defibrillator', 'ventilator', 'device', 'env'],
      },
      {
        id: 9,
        code: 'ENV/02',
        name: 'ระบบสาธารณูปโภควิกฤตขัดข้อง (ไฟฟ้าสำรอง, น้ำประปา, ออกซิเจนทางการแพทย์)',
        category: 'Non-Clinical Risk (ความเสี่ยงทั่วไป/สิ่งแวดล้อม)',
        program_id: 3,
        program_name: 'ความปลอดภัยด้านสิ่งแวดล้อมและเครื่องมือ (ENV)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 7: ความปลอดภัยของระบบสิ่งแวดล้อมและเครื่องมือแพทย์',
        safety_goal: 'Environment Safety (E: Utility Failure Prevention)',
        existing_controls: 'เครื่องกำเนิดไฟฟ้าสำรอง (Generator) สตาร์ทอัตโนมัติภายใน 10 วินาที, ระบบสำรองท่อก๊าซออกซิเจน Manifold 2 ชั้น, ตรวจสอบทุกสัปดาห์',
        mitigation_plan: 'ซ้อมแผนรับมือไฟฟ้าดับฉุกเฉินปีละ 2 ครั้ง, ติดตั้งระบบ IoT แจ้งเตือนระดับแรงดันก๊าซออกซิเจนแบบเรียลไทม์',
        responsible_unit: 'คณะกรรมการ ENV / กลุ่มงานช่างและซ่อมบำรุง',
        control_status: 'มีแผนควบคุมแล้ว',
        keywords: ['ไฟฟ้า', 'ดับ', 'ออกซิเจน', 'generator', 'น้ำไม่ไหล', 'แอร์เสีย'],
      },
      {
        id: 10,
        code: 'HR/01',
        name: 'บุคลากรเกิดอุบัติเหตุเข็มตำ/สัมผัสสารคัดหลั่ง (Needlestick & Sharp Injury)',
        category: 'Personnel Safety (ความปลอดภัยของบุคลากร)',
        program_id: 5,
        program_name: 'บุคลากรและความปลอดภัยทั่วไป (HR/General)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 8: ความปลอดภัยและสุขอนามัยของบุคลากร',
        safety_goal: 'Personnel Safety (P: Healthcare Worker Safety)',
        existing_controls: 'ห้ามสวมปลอกเข็มกลับด้วย 2 มือ (No Recapping), ใช้กล่องทิ้งของมีคมมาตรฐาน, มีแนวทาง Post-Exposure Prophylaxis (PEP) 24 ชม.',
        mitigation_plan: 'เปลี่ยนไปใช้อุปกรณ์ Safety Needles และ Safety IV Catheter ทั่วทั้งโรงพยาบาล, ฉีดวัคซีนป้องกันไวรัสตับอักเสบบีให้บุคลากรทุกคน',
        responsible_unit: 'คณะกรรมการอาชีวอนามัยและความปลอดภัย (OH&S Committee) / ทีม ICN',
        control_status: 'มีแผนควบคุมแล้ว',
        keywords: ['เข็มตำ', 'สัมผัสเลือด', 'สารคัดหลั่ง', 'sharp', 'needlestick', 'pep'],
      },
      {
        id: 11,
        code: 'HR/02',
        name: 'บุคลากรถูกคุกคาม ข่มขู่ หรือทำร้ายร่างกาย (Violence & Aggression at Workplace)',
        category: 'Personnel Safety (ความปลอดภัยของบุคลากร)',
        program_id: 5,
        program_name: 'บุคลากรและความปลอดภัยทั่วไป (HR/General)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 8: ความปลอดภัยของบุคลากรและสิ่งแวดล้อม',
        safety_goal: 'Personnel Safety (P: Workplace Violence Prevention)',
        existing_controls: 'ปุ่มกดแจ้งเหตุด่วน (Panic Button) ในแผนกฉุกเฉินและจุดบริการเสี่ยง, เจ้าหน้าที่ รปภ. ประจำจุด 24 ชม., กล้องวงจรปิด CCTV',
        mitigation_plan: 'ติดตั้งระบบแจ้งเหตุฉุกเฉิน Code Violet, ซ้อมแผนเผชิญเหตุบุคคลคลุ้มคลั่งร่วมกับสถานีตำรวจในพื้นที่',
        responsible_unit: 'คณะกรรมการความปลอดภัยและสิ่งแวดล้อม (ENV) / งานรักษาความปลอดภัย',
        control_status: 'ต้องปรับปรุงด่วน',
        keywords: ['ทำร้าย', 'ข่มขู่', 'ด่าทอ', 'วิวาท', 'violence', 'อาวุธ', 'รปภ'],
      },
      {
        id: 12,
        code: 'IT/01',
        name: 'ระบบสารสนเทศโรงพยาบาล (HOSxP/EMR) ล่มหรือถูกโจมตีทางไซเบอร์ (Cyberattack / System Downtime)',
        category: 'Non-Clinical Risk (ความเสี่ยงทั่วไป/เทคโนโลยีสารสนเทศ)',
        program_id: 5,
        program_name: 'บุคลากรและความปลอดภัยทั่วไป (HR/General)',
        essential_std: 'มาตรฐานสำคัญจำเป็นข้อที่ 9: ความมั่นคงปลอดภัยของข้อมูลและระบบสารสนเทศ',
        safety_goal: 'Digital Health Safety (D: Cyber Security & Data Privacy)',
        existing_controls: 'ระบบ Backup ข้อมูลประจำวัน (Daily Full Backup & Off-site Sync), ติดตั้ง Firewall และ Antivirus ระดับองค์กร, ระบบ Contingency Manual Paper',
        mitigation_plan: 'ซ้อมแผน Downtime Plan ระดับโรงพยาบาล, ทดสอบระบบ Disaster Recovery Site (DR-Site), ดำเนินการตามมาตรฐาน PDPA & Cyber Security Act',
        responsible_unit: 'ศูนย์เทคโนโลยีสารสนเทศทางการแพทย์ (IT Center)',
        control_status: 'มีแผนควบคุมแล้ว',
        keywords: ['hosxp', 'คอมพิวเตอร์', 'ล่ม', 'เน็ตหลุด', 'ข้อมูลหาย', 'it', 'cyber'],
      },
    ];

    // Map severity to score 1..5
    const mapSeverityScore = (level: string): number => {
      const upper = (level || '').toUpperCase().trim();
      if (['I', '5'].includes(upper)) return 5;
      if (['G', 'H', '4'].includes(upper)) return 4;
      if (['E', 'F', '3'].includes(upper)) return 3;
      if (['C', 'D', '2'].includes(upper)) return 2;
      return 1;
    };

    // Map count to likelihood 1..5
    const mapLikelihoodScore = (count: number): number => {
      if (count === 0) return 1;
      if (count <= 2) return 1;
      if (count <= 5) return 2;
      if (count <= 10) return 3;
      if (count <= 20) return 4;
      return 5;
    };

    // Enrich each master profile with actual incidents
    const registerItems = masterRiskProfiles.map(item => {
      // Find matching incidents
      const matched = incidents.filter(inc => {
        if (inc.program_id === item.program_id) return true;
        const text = `${inc.detail || ''} ${inc.edit || ''}`.toLowerCase();
        return item.keywords.some(kw => text.includes(kw));
      });

      const count = matched.length;
      let maxSeverityScore = 1;
      let highestSeverity = 'A';

      matched.forEach(inc => {
        const score = mapSeverityScore(inc.level_id);
        if (score > maxSeverityScore) {
          maxSeverityScore = score;
          highestSeverity = inc.level_id || 'A';
        }
      });

      const likelihood = mapLikelihoodScore(count);
      const impact = count > 0 ? maxSeverityScore : (item.code.startsWith('MED') || item.code.startsWith('SURG') ? 4 : 2);
      const risk_score = likelihood * impact;

      let risk_level = 'Low';
      let risk_level_thai = 'ต่ำ';
      let badge_color = 'emerald';

      if (risk_score >= 15) {
        risk_level = 'Extreme';
        risk_level_thai = 'วิกฤต (Extreme)';
        badge_color = 'red';
      } else if (risk_score >= 9) {
        risk_level = 'High';
        risk_level_thai = 'สูง (High)';
        badge_color = 'amber';
      } else if (risk_score >= 4) {
        risk_level = 'Medium';
        risk_level_thai = 'ปานกลาง (Medium)';
        badge_color = 'yellow';
      }

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        program_id: item.program_id,
        program_name: item.program_name,
        essential_std: item.essential_std,
        safety_goal: item.safety_goal,
        incident_count: count,
        highest_severity: highestSeverity,
        likelihood_score: likelihood,
        impact_score: impact,
        risk_score,
        risk_level,
        risk_level_thai,
        badge_color,
        existing_controls: item.existing_controls,
        mitigation_plan: item.mitigation_plan,
        responsible_unit: item.responsible_unit,
        control_status: item.control_status,
        recent_incidents: matched.slice(0, 5).map(inc => ({
          id: inc.id,
          id_risk: inc.id_risk,
          level_id: inc.level_id,
          department_name: deptMap.get(inc.department_id) || `แผนก ${inc.department_id}`,
          date_report: inc.date_report,
          detail: inc.detail,
          status_risk: inc.status_risk,
        })),
      };
    });

    // Summary Statistics
    const extremeCount = registerItems.filter(r => r.risk_level === 'Extreme').length;
    const highCount = registerItems.filter(r => r.risk_level === 'High').length;
    const mediumCount = registerItems.filter(r => r.risk_level === 'Medium').length;
    const lowCount = registerItems.filter(r => r.risk_level === 'Low').length;

    return {
      totalRisks: registerItems.length,
      extremeCount,
      highCount,
      mediumCount,
      lowCount,
      items: registerItems.sort((a, b) => b.risk_score - a.risk_score),
    };
  }

  async remove(id: number) {
    await this.prisma.riskregister.deleteMany({
      where: { id },
    });
    return { success: true, message: `ลบรายงาน #${id} สำเร็จ` };
  }
}
