import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { analyticsPeriod, summarizeSignals } from './decision-support';
import { PrismaService } from '../../prisma/prisma.service';
import { GetIncidentsQueryDto } from './dto/get-incidents-query.dto';
import { IncidentRcaPolicyService } from '../rca/incident-rca-policy.service';
import { isNrlsRequired, NRLS_CUTOVER_DATE, NRLS_CUTOVER_DATE_THAI } from './nrls-cutover-policy';
import { TeamBatchReviewDto } from './dto/team-batch-review.dto';
import { serializeContributingFactors } from '../rca/contributing-factor.catalog';
import {
  consequenceFromSeverity,
  currentFiscalYear,
  elapsedFiscalMonths,
  fiscalYearPeriod,
  likelihoodFromAnnualCount,
  riskLevelFor,
} from '../../common/risk-matrix-policy';
import { existsSync, statSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { basename, extname, resolve, sep } from 'path';
import { randomBytes } from 'crypto';
import { CreateIncidentReviewDto } from './dto/create-incident-review.dto';
import { rankAiRiskCandidates } from './ai-incident-assistant.utils';
import {
  MAX_REVIEW_ATTACHMENT_BYTES,
  MAX_REVIEW_ATTACHMENT_FILES,
  parseReviewAttachments,
  REVIEW_ATTACHMENT_EXTENSIONS,
  type ReviewAttachment,
  validateReviewAttachmentFiles,
} from './review-attachments';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rcaPolicy: IncidentRcaPolicyService,
  ) {}

  private isAdmin(user: any): boolean {
    return user?.role === 'admin';
  }

  private isRmCommittee(user: any): boolean {
    return user?.role === 'rm_committee';
  }

  private isHead(user: any): boolean {
    return user?.role === 'head';
  }

  private getUserId(user: any): number | null {
    const id = Number(user?.id || user?.userId || user?.sub);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private resolveTeamScope(user: any, requestedTeamId?: number): number | null {
    if (this.isAdmin(user)) {
      const value = Number(requestedTeamId);
      return Number.isFinite(value) && value > 0 ? value : null;
    }
    const teamId = Number(user?.teamId);
    if (!Number.isFinite(teamId) || teamId <= 0) {
      throw new ForbiddenException('บัญชีนี้ไม่ได้สังกัดทีมนำ จึงไม่มีสิทธิ์ใช้พื้นที่ทบทวนของทีม');
    }
    if (requestedTeamId && Number(requestedTeamId) !== teamId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เปิดข้อมูลของทีมอื่น');
    }
    return teamId;
  }

  private getUserDepartmentIds(user: any): string[] {
    return [user?.departmentId, user?.departmentId2]
      .filter((id) => id !== undefined && id !== null && Number(id) !== 0 && String(id) !== '')
      .map(String);
  }

  private async getGroupDepartmentIds(user: any): Promise<string[]> {
    if (!user?.departmentGroup) return this.getUserDepartmentIds(user);
    const departments = await this.prisma.department.findMany({
      where: { depart_group_id: Number(user.departmentGroup) },
      select: { id: true },
    });
    return departments.map((department) => String(department.id));
  }

  private incidentTouchesDepartments(incident: any, departmentIds: string[]): boolean {
    return departmentIds.includes(String(incident?.department_id || ''))
      || departmentIds.includes(String(incident?.sendto_department_id || ''));
  }

  private isCreator(user: any, incident: any): boolean {
    const userId = this.getUserId(user);
    const creatorId = incident?.created_by ?? incident?.user_create ?? incident?.user_ir;
    return userId !== null && creatorId !== undefined && creatorId !== null && Number(creatorId) === userId;
  }

  private isTeamRecipient(user: any, incident: any): boolean {
    return user?.teamId !== undefined
      && user?.teamId !== null
      && Number(user.teamId) === Number(incident?.sendto_team_id);
  }

  private async isInManagementScope(user: any, incident: any): Promise<boolean> {
    // Management scope belongs to Head/RM accounts. Admin workflow access is
    // evaluated separately and is always limited to the admin's own departments.
    if (this.isAdmin(user)) return false;

    if (this.isRmCommittee(user)) {
      if (user?.rmScope === 'hospital') return true;
      if (user?.rmScope === 'group') {
        return this.incidentTouchesDepartments(incident, await this.getGroupDepartmentIds(user));
      }
      return this.incidentTouchesDepartments(incident, this.getUserDepartmentIds(user));
    }

    if (this.isHead(user)) {
      const departmentIds = user?.rmScope === 'group'
        ? await this.getGroupDepartmentIds(user)
        : this.getUserDepartmentIds(user);
      return this.incidentTouchesDepartments(incident, departmentIds);
    }

    return false;
  }

  private isInAdminDepartmentScope(user: any, incident: any): boolean {
    return this.isAdmin(user)
      && this.incidentTouchesDepartments(incident, this.getUserDepartmentIds(user));
  }

  private async isInWorkflowDecisionScope(user: any, incident: any): Promise<boolean> {
    return this.isInAdminDepartmentScope(user, incident)
      || await this.isInManagementScope(user, incident);
  }

  private async getIncidentPermissions(user: any, incident: any) {
    const status = incident?.status_risk || 'รายงาน';
    const isClosed = status === 'จำหน่าย' || status === 'ไม่ใช่ความเสี่ยง';
    const isPendingOrReturned = status === 'รายงาน' || status === 'แก้ไข';
    const isConfirmedOrReviewing = status === 'ตรวจสอบ' || status === 'ทบทวน';
    const isDepartmentVisible = !isPendingOrReturned;
    const managementScope = await this.isInManagementScope(user, incident);
    const adminDepartmentScope = this.isInAdminDepartmentScope(user, incident);
    const userDepartmentIds = this.getUserDepartmentIds(user);
    const informationalRecipient = String(incident?.review_forwarding_purpose || '').toUpperCase() === 'INFORM'
      && userDepartmentIds.includes(String(incident?.sendto_department_id || ''))
      && !userDepartmentIds.includes(String(incident?.department_id || ''))
      && !this.isRmCommittee(user);
    const workflowDecisionScope = (managementScope || adminDepartmentScope) && !informationalRecipient;
    const adminAccess = this.isAdmin(user);
    const creator = this.isCreator(user, incident);
    const teamRecipient = this.isTeamRecipient(user, incident);
    const teamScopeVisible = teamRecipient && ['ทบทวน', 'จำหน่าย'].includes(status);
    const departmentParticipant = this.incidentTouchesDepartments(incident, this.getUserDepartmentIds(user));
    const canView = adminAccess
      || managementScope
      || creator
      || teamScopeVisible
      || (isDepartmentVisible && departmentParticipant);

    return {
      canView,
      canEdit: !isClosed && (adminAccess || managementScope || (creator && isPendingOrReturned)),
      canConfirm: isPendingOrReturned && workflowDecisionScope,
      canReview: !isClosed && isConfirmedOrReviewing && workflowDecisionScope,
      canTeamReview: !isClosed && status === 'ทบทวน' && teamRecipient,
      canForward: !isClosed && workflowDecisionScope,
      canForwardToTeam: !isClosed && status === 'ทบทวน' && workflowDecisionScope,
      canAssignDepartment: !isClosed && workflowDecisionScope,
      canClose: status === 'ทบทวน'
        && managementScope
        && (['A', 'B', '1'].includes(String(incident?.level_id || '').toUpperCase()) || this.isRmCommittee(user)),
      canReject: !isClosed
        && ['รายงาน', 'แก้ไข', 'ตรวจสอบ', 'ทบทวน'].includes(status)
        && managementScope,
      canDelete: adminAccess,
    };
  }

  private getForwardedOpenFilter() {
    return {
      AND: [
        {
          OR: [
            { sendto_team_id: { not: null } },
            {
              AND: [
                { sendto_department_id: { not: null } },
                {
                  NOT: {
                    sendto_department_id: {
                      equals: this.prisma.riskregister.fields.department_id,
                    },
                  },
                },
              ],
            },
          ],
        },
        { status_risk: { notIn: ['จำหน่าย', 'ไม่ใช่ความเสี่ยง'] } },
      ],
    };
  }

  private assertPermission(allowed: boolean, message: string): void {
    if (!allowed) throw new ForbiddenException(message);
  }

  private getNrlsKind(nrls: any): 'CLINICAL' | 'GENERAL' {
    const code = String(nrls?.nrls_code || '').toUpperCase();
    if (code.startsWith('C')) return 'CLINICAL';
    if (code.startsWith('G')) return 'GENERAL';
    throw new BadRequestException('รหัส NRLS ต้องขึ้นต้นด้วย C (Clinical) หรือ G (General)');
  }

  private async resolveClassification(nrlsCode: string, riskstoreId: number | null | undefined, levelId: string) {
    const code = String(nrlsCode || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('กรุณาเลือกความเสี่ยงตามมาตรฐาน NRLS');
    const nrls = await this.prisma.nRLS_riskstore.findUnique({ where: { nrls_code: code } });
    if (!nrls) throw new BadRequestException(`ไม่พบรหัส ${code} ในข้อมูลมาตรฐาน NRLS กรุณาเลือกจากรายการ`);
    if (!nrls.program_id) throw new BadRequestException(`รหัส NRLS ${code} ยังไม่ได้กำหนดโปรแกรม กรุณาแจ้งผู้ดูแลระบบ`);

    const kind = this.getNrlsKind(nrls);
    const level = String(levelId || '').trim().toUpperCase();
    const valid = kind === 'CLINICAL' ? /^[A-I]$/.test(level) : /^[1-5]$/.test(level);
    if (!valid) {
      throw new BadRequestException(kind === 'CLINICAL'
        ? 'ความเสี่ยง Clinical ต้องเลือกระดับความรุนแรง A–I'
        : 'ความเสี่ยง General ต้องเลือกระดับความรุนแรง 1–5');
    }

    const localId = riskstoreId === undefined || riskstoreId === null || riskstoreId === 0
      ? null : Number(riskstoreId);
    if (localId !== null) {
      const local = await this.prisma.riskstore.findUnique({ where: { riskstore_id: localId } });
      if (!local) throw new BadRequestException('ไม่พบชื่อความเสี่ยงเดิมของโรงพยาบาลที่เลือก');
      if (String(local.nrls_code || '').toUpperCase() !== code) {
        throw new BadRequestException('ชื่อความเสี่ยงเดิมของโรงพยาบาลไม่ตรงกับรหัส NRLS ที่เลือก กรุณาเลือกใหม่');
      }
    }
    return { nrls, code, kind, level, localId };
  }

  private async resolveLegacyClassification(riskstoreId: number | null | undefined, levelId: string) {
    const localId = riskstoreId === undefined || riskstoreId === null || riskstoreId === 0
      ? null : Number(riskstoreId);
    const local = localId === null ? null : await this.prisma.riskstore.findUnique({ where: { riskstore_id: localId } });
    if (localId !== null && !local) throw new BadRequestException('ไม่พบชื่อความเสี่ยงเดิมของโรงพยาบาลที่เลือก');
    const level = String(levelId || '').trim().toUpperCase();
    if (!/^(?:[A-I]|[1-5])$/.test(level)) throw new BadRequestException('กรุณาระบุระดับความรุนแรง');
    return { localId, local, level };
  }

  async getAiRiskCandidates(eventText: string) {
    const [standards, localRisks] = await Promise.all([
      this.prisma.nRLS_riskstore.findMany({
        select: {
          nrls_code: true,
          name: true,
          group: true,
          category: true,
          type: true,
          sub_type: true,
          definition: true,
          program_id: true,
        },
      }),
      this.prisma.riskstore.findMany({
        where: {
          nrls_code: { not: null },
          OR: [{ status: null }, { status: '1' }],
        },
        select: { riskstore_id: true, riskstore_name: true, nrls_code: true },
      }),
    ]);
    return rankAiRiskCandidates(eventText, standards, localRisks, 20);
  }

  private async buildScopingFilter(user: any, status_risk?: string, scope_type?: string) {
    // Team views must never fall back to every forwarded incident for users without a team.
    if (scope_type === 'team') {
      const departmentHandled = { status_risk: { in: ['ทบทวน', 'จำหน่าย'] } };
      if (this.isAdmin(user)) return { AND: [{ sendto_team_id: { not: null } }, departmentHandled] };
      if (user?.teamId) {
        return { AND: [{ sendto_team_id: Number(user.teamId) }, departmentHandled] };
      }
      return { id: -1 };
    }

    if (!user) return { id: -1 };

    if (this.isAdmin(user)) return {};

    const isRmCommittee = this.isRmCommittee(user);
    const isHead = this.isHead(user);

    if (isRmCommittee) {
      if (user?.rmScope === 'hospital') return {};
      if (user?.rmScope === 'group') {
        const deptIds = await this.getGroupDepartmentIds(user);
        return {
          OR: [
            { department_id: { in: deptIds } },
            { sendto_department_id: { in: deptIds } },
          ],
        };
      }
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
    } else if (isHead) {
      const deptIds = user?.rmScope === 'group'
        ? await this.getGroupDepartmentIds(user)
        : this.getUserDepartmentIds(user);
      if (status_risk === 'รายงาน' || status_risk === 'แก้ไข') {
        return { department_id: { in: deptIds } };
      } else {
        if (!status_risk || status_risk === 'all') {
          return {
            OR: [
              {
                AND: [
                  { status_risk: { in: ['รายงาน', 'แก้ไข'] } },
                  { department_id: { in: deptIds } },
                ],
              },
              {
                AND: [
                  { status_risk: { notIn: ['รายงาน', 'แก้ไข'] } },
                  { OR: [{ department_id: { in: deptIds } }, { sendto_department_id: { in: deptIds } }] },
                ],
              },
            ],
          };
        }
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
        const userId = this.getUserId(user);
        return userId ? { department_id: deptId, created_by: userId } : { id: -1 };
      } else {
        const userId = this.getUserId(user);
        return {
          OR: [
            ...(userId ? [{ created_by: userId }] : []),
            {
              AND: [
                { status_risk: { notIn: ['รายงาน', 'แก้ไข'] } },
                { OR: [{ department_id: deptId }, { sendto_department_id: deptId }] }
              ]
            },
            ...(user.teamId ? [{ sendto_team_id: Number(user.teamId) }] : [])
          ]
        };
      }
    }
    return { id: -1 };
  }

  private async scopeIncidentWhere(where: any, user?: any): Promise<any> {
    const scoping = await this.buildScopingFilter(user);
    return Object.keys(scoping).length > 0 ? { AND: [where, scoping] } : where;
  }

  private async getVisibleReportDepartmentIds(user?: any): Promise<number[] | null> {
    if (this.isAdmin(user) || (this.isRmCommittee(user) && user?.rmScope === 'hospital')) return null;
    if ((this.isRmCommittee(user) || this.isHead(user)) && user?.rmScope === 'group') {
      return (await this.getGroupDepartmentIds(user)).map(Number).filter(Number.isFinite);
    }
    return this.getUserDepartmentIds(user).map(Number).filter(Number.isFinite);
  }

  private assertAttachmentReferencesOwned(imageValue: unknown, user?: any, existingImageValue?: unknown): void {
    if (!imageValue || this.isAdmin(user)) return;
    const actorId = this.getUserId(user);
    if (!actorId) throw new ForbiddenException('ไม่พบตัวตนเจ้าของไฟล์แนบ');

    const existingNames = new Set(String(existingImageValue || '').split(',').map((name) => name.trim()).filter(Boolean));
    const uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
    for (const storedName of String(imageValue).split(',').map((name) => name.trim()).filter(Boolean)) {
      if (existingNames.has(storedName)) continue;
      const filename = basename(storedName.replace(/\\/g, '/'));
      if (filename !== storedName || !filename.startsWith(`${actorId}-`)) {
        throw new ForbiddenException('อ้างอิงได้เฉพาะไฟล์แนบที่บัญชีนี้เป็นผู้อัปโหลด');
      }
      const filePath = resolve(uploadDir, filename);
      if (!filePath.startsWith(`${uploadDir}${sep}`) || !existsSync(filePath)) {
        throw new BadRequestException(`ไม่พบไฟล์แนบ ${filename}`);
      }
    }
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
      nrls,
      nrls_type,
      classification_status,
      sendto_team_id,
      is_forwarded
    } = query as any;
    const skip = (page - 1) * limit;

    const where: any = { AND: [] };

    // Forwarded to Lead Team Filter
    if (sendto_team_id) {
      where.sendto_team_id = Number(sendto_team_id);
    } else if (is_forwarded === 'true' || is_forwarded === true) {
      where.AND.push(this.getForwardedOpenFilter());
    }

    // Date filtering
    if (startDate || endDate) {
      where.date_report = {};
      if (startDate) where.date_report.gte = new Date(startDate);
      if (endDate) where.date_report.lte = new Date(endDate);
    }

    // Severity level filter or Sentinel filter
    if (level_id) {
      if (level_id === 'clinical_ef') {
        where.level_id = { in: ['E', 'F'] };
      } else if (level_id === 'clinical_ghi') {
        where.level_id = { in: ['G', 'H', 'I'] };
      } else if (level_id === 'general_45') {
        where.level_id = { in: ['4', '5'] };
      } else if (level_id === 'sentinel_clinical') {
        where.AND.push({
          OR: [
            { level_id: { in: ['G', 'H', 'I'] } },
            {
              AND: [
                { level_id: { in: ['E', 'F'] } },
                { riskstore_id: { in: [297, 298, 300, 302] } }
              ]
            },
            { riskstore_id: 2000071 }
          ],
        });
      } else if (level_id === 'sentinel_general') {
        where.level_id = { in: ['4', '5'] };
      } else if (level_id === 'sentinel_all') {
        where.AND.push({
          OR: [
            { level_id: { in: ['G', 'H', 'I', '4', '5'] } },
            {
              AND: [
                { level_id: { in: ['E', 'F'] } },
                { riskstore_id: { in: [297, 298, 300, 302] } }
              ]
            },
            { riskstore_id: 2000071 }
          ],
        });
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
    if (classification_status) where.classification_status = classification_status;
    if (nrls_type) {
      where.nrls_code = { startsWith: nrls_type === 'CLINICAL' ? 'C' : 'G' };
    }
    if (nrls && nrls.trim()) {
      const term = nrls.trim();
      where.AND.push({ OR: [
        { nrls_code: { contains: term } },
        { nrls_name_snapshot: { contains: term } },
      ] });
    }

    // Keyword Search
    if (search && search.trim() !== '') {
      const s = search.trim();
      const numId = Number(s);
      const searchConditions: any[] = [
        { detail: { contains: s } },
        { problem_basic: { contains: s } },
        { detail_hosxp: { contains: s } },
        { nrls_code: { contains: s } },
        { nrls_name_snapshot: { contains: s } },
        { nrls_standard: { name: { contains: s } } },
        { local_risk: { riskstore_name: { contains: s } } },
      ];
      if (!isNaN(numId)) {
        searchConditions.push({ id: numId });
        searchConditions.push({ id_risk: numId });
      }
      where.AND.push({ OR: searchConditions });
    }

    // RBAC Data Scoping
    const scoping = await this.buildScopingFilter(user, status_risk, query.scope_type);
    if (Object.keys(scoping).length > 0) {
      where.AND.push(scoping);
    }
    if (department_id) where.AND.push({ department_id });

    let data: any[] = [];
    let total = 0;

    const STATUS_PRIORITY_ORDER: Record<string, number> = {
      'รายงาน': 1,           // 1. รอยืนยัน
      'ตรวจสอบ': 2,          // 2. ยืนยันแล้วรอแก้ไข
      'ทบทวน': 3,            // 3. อยู่ระหว่างการทบทวน
      'ส่งต่อ': 4,           // 4. ร่วมส่งต่อทบทวน
      'จำหน่าย': 5,          // 5. ปิดเคส
      'ไม่ใช่ความเสี่ยง': 6,  // 6. ไม่ใช่ความเสี่ยง
    };

    const getStatusPriority = (item: any): number => {
      if (item.sendto_department_id && String(item.sendto_department_id) !== String(item.department_id)) {
        if (item.status_risk !== 'จำหน่าย' && item.status_risk !== 'ไม่ใช่ความเสี่ยง') {
          return 4; // ร่วมส่งต่อทบทวน
        }
      }
      return STATUS_PRIORITY_ORDER[item.status_risk] || 99;
    };

    if (!query.sortBy || query.sortBy === 'default') {
      // Default Status Priority Sorting for "ทั้งหมด" tab
      const allMatching = await this.prisma.riskregister.findMany({
        where,
        select: {
          id: true,
          status_risk: true,
          department_id: true,
          sendto_department_id: true,
        },
      });

      allMatching.sort((a, b) => {
        const pA = getStatusPriority(a);
        const pB = getStatusPriority(b);
        if (pA !== pB) return pA - pB;
        return b.id - a.id;
      });

      total = allMatching.length;
      const pageIds = allMatching.slice(skip, skip + limit).map((item) => item.id);

      const pageRecords = await this.prisma.riskregister.findMany({
        where: { AND: [where, { id: { in: pageIds } }] },
      });

      const recordMap = new Map(pageRecords.map((r) => [r.id, r]));
      data = pageIds.map((id) => recordMap.get(id)).filter(Boolean);
    } else {
      const sortField = query.sortBy;
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

      [data, total] = await Promise.all([
        this.prisma.riskregister.findMany({
          where,
          skip,
          take: limit,
          orderBy,
        }),
        this.prisma.riskregister.count({ where }),
      ]);
    }

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

    const enrichedData = await Promise.all(data.map(async (item) => ({
      ...item,
      department_name: deptMap.get(item.department_id) || `แผนก ${item.department_id}`,
      sendto_department_name: item.sendto_department_id ? (deptMap.get(item.sendto_department_id.toString()) || `แผนก ${item.sendto_department_id}`) : 'ไม่มีระบุ',
      risk_topic_name: riskMapById.get(item.riskstore_id) || riskMapByRid.get(item.id_risk) || null,
      permissions: await this.getIncidentPermissions(user, item),
    })));


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

    const [total, pending, confirmed, reviewing, closed, notRisk, sentinelClinical, sentinelGeneral, severityGroups, activeGoalGroups] = await Promise.all([
      this.prisma.riskregister.count({ where: allScoping }),
      this.prisma.riskregister.count({ where: { ...pendingScoping, status_risk: 'รายงาน' } }),
      this.prisma.riskregister.count({ where: { ...confirmedScoping, status_risk: 'ตรวจสอบ' } }),
      this.prisma.riskregister.count({ where: { ...reviewingScoping, status_risk: 'ทบทวน' } }),
      this.prisma.riskregister.count({ where: { ...closedScoping, status_risk: 'จำหน่าย' } }),
      this.prisma.riskregister.count({ where: { ...notRiskScoping, status_risk: 'ไม่ใช่ความเสี่ยง' } }),
      this.prisma.riskregister.count({
        where: {
          AND: [
            allScoping,
            {
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
          ]
        }
      }),
      this.prisma.riskregister.count({ where: { AND: [allScoping, { level_id: { in: ['4', '5'] } }] } }),
      this.prisma.riskregister.groupBy({
        by: ['level_id'],
        where: allScoping,
        _count: { _all: true },
      }),
      this.prisma.riskregister.groupBy({
        by: ['nrls_code', 'level_id'],
        where: {
          AND: [allScoping, { status_risk: { in: ['ตรวจสอบ', 'ทบทวน'] } }],
        },
        _count: { _all: true },
      }),
    ]);

    const byLevel = severityGroups.reduce<Record<string, number>>((result, row) => {
      const level = String(row.level_id || '').trim().toUpperCase();
      if (level) result[level] = row._count._all;
      return result;
    }, {});

    const activeSeverityByGoal: Record<'clinical' | 'patient' | 'personnel' | 'organization', Record<string, number>> = {
      clinical: {},
      patient: {},
      personnel: {},
      organization: {},
    };
    for (const row of activeGoalGroups) {
      const level = String(row.level_id || '').trim().toUpperCase();
      const code = String(row.nrls_code || '').trim().toUpperCase();
      const count = row._count._all;
      if (!level) continue;

      if (/^[A-I]$/.test(level)) {
        activeSeverityByGoal.clinical[level] = (activeSeverityByGoal.clinical[level] || 0) + count;
      }
      if (code.startsWith('CP')) {
        activeSeverityByGoal.patient[level] = (activeSeverityByGoal.patient[level] || 0) + count;
      } else if (code.startsWith('GP')) {
        activeSeverityByGoal.personnel[level] = (activeSeverityByGoal.personnel[level] || 0) + count;
      } else if (code.startsWith('GO')) {
        activeSeverityByGoal.organization[level] = (activeSeverityByGoal.organization[level] || 0) + count;
      }
    }

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
      byLevel,
      activeSeverityByGoal,
    };
  }

  async getTabCounts(user: any, scope_type?: string) {
    const statusScopes = await Promise.all([
      this.buildScopingFilter(user, undefined, scope_type),
      this.buildScopingFilter(user, 'รายงาน', scope_type),
      this.buildScopingFilter(user, 'แก้ไข', scope_type),
      this.buildScopingFilter(user, 'ตรวจสอบ', scope_type),
      this.buildScopingFilter(user, 'ทบทวน', scope_type),
      this.buildScopingFilter(user, 'จำหน่าย', scope_type),
      this.buildScopingFilter(user, 'ไม่ใช่ความเสี่ยง', scope_type),
    ]);
    const [generalScope, pendingScope, returnedScope, verifiedScope, reviewingScope, closedScope, notRiskScope] = statusScopes;

    const countWith = (scope: any, extra: any) => this.prisma.riskregister.count({
      where: Object.keys(scope).length > 0 ? { AND: [scope, extra] } : extra,
    });

    const forwardedExtra = this.getForwardedOpenFilter();

    // For sentinel: level_id G/H/I or special riskstore
    const sentinelExtra = {
      OR: [
        { level_id: { in: ['G', 'H', 'I'] } },
        { AND: [{ level_id: { in: ['E', 'F'] } }, { riskstore_id: { in: [297, 298, 300, 302] } }] },
        { riskstore_id: 2000071 },
        { level_id: { in: ['4', '5'] } },
      ],
    };

    const userId = Number(user?.id || user?.userId || user?.sub);
    const today = new Date();
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [all, pending, returnedForEdit, verified, reviewing, forwarded, closed, notRisk, sentinel, myReportedThisMonth] = await Promise.all([
      countWith(generalScope, {}),
      countWith(pendingScope, { status_risk: 'รายงาน' }),
      countWith(returnedScope, { status_risk: 'แก้ไข' }),
      countWith(verifiedScope, { status_risk: 'ตรวจสอบ' }),
      countWith(reviewingScope, { status_risk: 'ทบทวน' }),
      countWith(generalScope, forwardedExtra),
      countWith(closedScope, { status_risk: 'จำหน่าย' }),
      countWith(notRiskScope, { status_risk: 'ไม่ใช่ความเสี่ยง' }),
      countWith(generalScope, sentinelExtra),
      userId ? this.prisma.riskregister.count({
        where: {
          created_by: userId,
          register_date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }) : 0,
    ]);

    const teamScoping = await this.buildScopingFilter(user, undefined, 'team');
    const teamReviewCount = await this.prisma.riskregister.count({
      where: {
        AND: [
          teamScoping,
          { status_risk: 'ทบทวน' },
          { OR: [{ team_review_status: null }, { team_review_status: { in: ['PENDING', 'IN_PROGRESS'] } }] },
        ]
      }
    });

    return { 
      all, 
      pending, 
      returnedForEdit, 
      verified, 
      reviewing, 
      forwarded, 
      closed, 
      notRisk, 
      sentinel, 
      myReportedThisMonth,
      deptReviewCount: verified + returnedForEdit,
      teamReviewCount
    };
  }

  async getTeamWorkspace(user: any, query: any = {}) {
    const requestedTeamId = query.team_id ? Number(query.team_id) : undefined;
    const teamId = this.resolveTeamScope(user, requestedTeamId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const now = new Date();
    const defaultFiscalYear = currentFiscalYear(now);
    const nrlsCutoverFiscalYear = currentFiscalYear(new Date(`${NRLS_CUTOVER_DATE}T00:00:00`));
    const fiscalYear = query.fiscal_year ? Number(query.fiscal_year) : defaultFiscalYear;
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
      throw new BadRequestException('ปีงบประมาณไม่ถูกต้อง');
    }
    const fiscalPeriod = fiscalYearPeriod(fiscalYear);
    const observationMonths = elapsedFiscalMonths(fiscalYear, now);
    const observedEnd = observationMonths === 0
      ? null
      : new Date(Math.min(now.getTime(), fiscalPeriod.end.getTime()));
    const matrixStatuses = ['ตรวจสอบ', 'ทบทวน', 'จำหน่าย'];
    const queueAnd: any[] = [
      teamId ? { sendto_team_id: teamId } : { sendto_team_id: { not: null } },
      // Legacy forwarded incidents commonly remain at "ตรวจสอบ". They are valid
      // risk records and must not disappear from the team's historical queue.
      { status_risk: { in: matrixStatuses } },
      { date_report: { gte: fiscalPeriod.start, lte: fiscalPeriod.end } },
    ];
    const matrixTeamScope = teamId
      ? {
          OR: [
            { sendto_team_id: teamId },
            // Before team forwarding was consistently recorded, the owner of
            // the local risk topic is the most reliable team attribution.
            { sendto_team_id: null, local_risk: { team_id: teamId } },
          ],
        }
      : {
          OR: [
            { sendto_team_id: { not: null } },
            { sendto_team_id: null, local_risk: { team_id: { not: null } } },
          ],
        };
    const matrixAnd: any[] = [
      matrixTeamScope,
      { status_risk: { in: matrixStatuses } },
      { date_report: { gte: fiscalPeriod.start, lte: fiscalPeriod.end } },
    ];
    const and: any[] = [...queueAnd];

    if (query.team_review_status === 'PENDING') {
      and.push({ OR: [{ team_review_status: null }, { team_review_status: 'PENDING' }] });
    } else if (['IN_PROGRESS', 'COMPLETED'].includes(String(query.team_review_status || ''))) {
      and.push({ team_review_status: String(query.team_review_status) });
    }
    if (query.department_id) and.push({ department_id: String(query.department_id) });
    if (query.program_id) and.push({ program_id: Number(query.program_id) });
    if (query.nrls_code) and.push({ nrls_code: String(query.nrls_code).trim() });
    if (String(query.search || '').trim()) {
      const search = String(query.search).trim();
      const numericId = Number(search);
      const or: any[] = [
        { nrls_code: { contains: search } },
        { nrls_name_snapshot: { contains: search } },
        { detail: { contains: search } },
        { problem_basic: { contains: search } },
      ];
      if (Number.isFinite(numericId)) or.push({ id: numericId });
      and.push({ OR: or });
    }

    const [incidents, matrixIncidents] = await Promise.all([
      this.prisma.riskregister.findMany({
        where: { AND: and },
        orderBy: [{ date_report: 'desc' }, { id: 'desc' }],
      }),
      // The annual matrix must remain stable when the user filters the work
      // queue by workflow status, department, program or search text.
      this.prisma.riskregister.findMany({
        where: { AND: matrixAnd },
        orderBy: [{ date_report: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const statusOrder: Record<string, number> = { PENDING: 1, IN_PROGRESS: 2, COMPLETED: 3 };
    incidents.sort((a, b) => {
      const aStatus = a.status_risk === 'จำหน่าย' ? 'COMPLETED' : (a.team_review_status || 'PENDING');
      const bStatus = b.status_risk === 'จำหน่าย' ? 'COMPLETED' : (b.team_review_status || 'PENDING');
      const statusDiff = (statusOrder[aStatus] || 9) - (statusOrder[bStatus] || 9);
      if (statusDiff !== 0) return statusDiff;
      return b.date_report.getTime() - a.date_report.getTime() || b.id - a.id;
    });

    const departmentIds = [...new Set(incidents.map((row) => Number(row.department_id)).filter(Boolean))];
    const programIds = [...new Set(incidents.map((row) => Number(row.program_id)).filter(Boolean))];
    const localRiskIds = [...new Set(matrixIncidents.map((row) => Number(row.riskstore_id)).filter((id) => Number.isInteger(id) && id > 0))];
    const [departments, programs, team, localRisks] = await Promise.all([
      this.prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, depart_name: true } }),
      this.prisma.program.findMany({ where: { program_id: { in: programIds } }, select: { program_id: true, program_name: true } }),
      teamId ? this.prisma.team.findUnique({ where: { id: teamId }, select: { id: true, team_name: true } }) : null,
      localRiskIds.length > 0
        ? this.prisma.riskstore.findMany({
            where: { riskstore_id: { in: localRiskIds } },
            select: { riskstore_id: true, riskstore_name: true, nrls_code: true, team_id: true },
          })
        : Promise.resolve([] as { riskstore_id: number; riskstore_name: string; nrls_code: string | null; team_id: number | null; }[]),
    ]);
    const departmentMap = new Map(departments.map((row) => [String(row.id), row.depart_name]));
    const programMap = new Map(programs.map((row) => [row.program_id, row.program_name]));
    const localRiskMap = new Map(localRisks.map((row) => [row.riskstore_id, row]));
    const classificationFor = (row: any) => {
      const localRisk = row.riskstore_id ? localRiskMap.get(Number(row.riskstore_id)) : null;
      const directNrlsCode = String(row.nrls_code || '').trim() || null;
      const mappedNrlsCode = String(localRisk?.nrls_code || '').trim() || null;
      const effectiveNrlsCode = directNrlsCode || mappedNrlsCode;
      const source = directNrlsCode
        ? 'DIRECT_NRLS'
        : mappedNrlsCode
          ? 'LEGACY_MAPPED'
          : localRisk
            ? 'LOCAL_UNMAPPED'
            : 'UNCLASSIFIED';
      return { localRisk, directNrlsCode, mappedNrlsCode, effectiveNrlsCode, source };
    };
    const effectiveNrlsCodes = [...new Set(matrixIncidents
      .map((row) => classificationFor(row).effectiveNrlsCode)
      .filter((code): code is string => Boolean(code)))];
    const nrlsStandards = effectiveNrlsCodes.length > 0
      ? await this.prisma.nRLS_riskstore.findMany({
          where: { nrls_code: { in: effectiveNrlsCodes } },
          select: { nrls_code: true, name: true },
        })
      : [];
    const nrlsNameMap = new Map(nrlsStandards.map((row) => [row.nrls_code, row.name]));

    const createMatrix = () => Array.from(
      { length: 5 },
      () => Array.from({ length: 5 }, () => ({ count: 0, items: [] as any[] })),
    );
    const nrlsRiskSummary = new Map<string, any>();
    const subRiskSummary = new Map<string, any>();
    const addIncidentToSummary = (summaries: Map<string, any>, key: string, seed: any, row: any, source: string) => {
      const consequence = consequenceFromSeverity(row.level_id);
      const summary = summaries.get(key) || {
        ...seed,
        key,
        count: 0,
        waiting: 0,
        max_consequence: 0,
        incident_ids: [],
        source_counts: {},
      };
      summary.count += 1;
      summary.source_counts[source] = (summary.source_counts[source] || 0) + 1;
      if (row.status_risk !== 'จำหน่าย' && (!row.team_review_status || row.team_review_status === 'PENDING')) summary.waiting += 1;
      summary.max_consequence = Math.max(summary.max_consequence, consequence);
      if (summary.incident_ids.length < 100) summary.incident_ids.push(row.id);
      summaries.set(key, summary);
    };

    for (const row of matrixIncidents) {
      const classification = classificationFor(row);
      const effectiveNrlsName = classification.effectiveNrlsCode
        ? nrlsNameMap.get(classification.effectiveNrlsCode) || row.nrls_name_snapshot || classification.effectiveNrlsCode
        : null;

      if (classification.effectiveNrlsCode) {
        addIncidentToSummary(nrlsRiskSummary, classification.effectiveNrlsCode, {
          nrls_code: classification.effectiveNrlsCode,
          name: effectiveNrlsName,
          mapping_status: classification.source === 'LEGACY_MAPPED' ? 'LEGACY_MAPPED' : 'DIRECT_NRLS',
        }, row, classification.source);
      }

      if (classification.localRisk) {
        const mappingStatus = classification.effectiveNrlsCode
          ? classification.mappedNrlsCode && classification.directNrlsCode && classification.mappedNrlsCode !== classification.directNrlsCode
              ? 'MAPPING_CONFLICT'
              : 'NRLS_WITH_LOCAL'
          : 'LOCAL_UNMAPPED';
        const subRiskKey = `LOCAL:${classification.localRisk.riskstore_id}:NRLS:${classification.effectiveNrlsCode || 'UNMAPPED'}`;
        addIncidentToSummary(subRiskSummary, subRiskKey, {
          riskstore_id: classification.localRisk.riskstore_id,
          nrls_code: classification.effectiveNrlsCode,
          parent_name: effectiveNrlsName,
          name: classification.localRisk.riskstore_name,
          mapping_status: mappingStatus,
        }, row, classification.source);
      } else if (classification.effectiveNrlsCode) {
        addIncidentToSummary(subRiskSummary, `NRLS:${classification.effectiveNrlsCode}:NO_SUBRISK`, {
          riskstore_id: null,
          nrls_code: classification.effectiveNrlsCode,
          parent_name: effectiveNrlsName,
          name: 'ยังไม่ระบุชื่อความเสี่ยงย่อย',
          mapping_status: 'NRLS_NO_SUBRISK',
        }, row, classification.source);
      }
    }

    const buildMatrix = (summaries: Map<string, any>) => {
      const result = createMatrix();
      for (const summary of summaries.values()) {
        const likelihood = likelihoodFromAnnualCount(summary.count, observationMonths);
        if (likelihood === 0) continue;
        const consequence = summary.max_consequence;
        summary.likelihood = likelihood;
        summary.consequence = consequence;
        summary.risk_score = likelihood * consequence;
        summary.risk_level = riskLevelFor(likelihood, consequence);
        const cell = result[consequence - 1][likelihood - 1];
        cell.count += 1;
        if (cell.items.length < 20) cell.items.push({
          key: summary.key,
          riskstore_id: summary.riskstore_id || null,
          nrls_code: summary.nrls_code || null,
          parent_name: summary.parent_name || null,
          name: summary.name,
          mapping_status: summary.mapping_status,
          source_counts: summary.source_counts,
          incident_count: summary.count,
          risk_score: summary.risk_score,
          risk_level: summary.risk_level,
        });
      }
      return result;
    };
    const mappedSubRiskSummary = new Map(
      [...subRiskSummary].filter(([, summary]) => summary.mapping_status !== 'LOCAL_UNMAPPED'),
    );
    const matrix = buildMatrix(nrlsRiskSummary);
    const subRiskMatrix = buildMatrix(subRiskSummary);
    const mappedSubRiskMatrix = buildMatrix(mappedSubRiskSummary);

    const start = (page - 1) * limit;
    const pageRows = incidents.slice(start, start + limit).map((row) => {
      const classification = classificationFor(row);
      return {
        ...row,
        effective_nrls_code: classification.effectiveNrlsCode,
        effective_nrls_name: classification.effectiveNrlsCode
          ? nrlsNameMap.get(classification.effectiveNrlsCode) || row.nrls_name_snapshot || classification.effectiveNrlsCode
          : null,
        local_risk_name: classification.localRisk?.riskstore_name || null,
        matrix_mapping_source: classification.source,
        team_review_status: row.status_risk === 'จำหน่าย' ? 'COMPLETED' : (row.team_review_status || 'PENDING'),
        department_name: departmentMap.get(row.department_id) || `หน่วยงาน ${row.department_id}`,
        program_name: programMap.get(Number(row.program_id)) || '-',
      };
    });

    const directNrlsIncidents = matrixIncidents.filter((row) => classificationFor(row).source === 'DIRECT_NRLS').length;
    const legacyMappedIncidents = matrixIncidents.filter((row) => classificationFor(row).source === 'LEGACY_MAPPED').length;
    const localUnmappedIncidents = matrixIncidents.filter((row) => classificationFor(row).source === 'LOCAL_UNMAPPED').length;
    const unclassifiedIncidents = matrixIncidents.filter((row) => classificationFor(row).source === 'UNCLASSIFIED').length;
    const nrlsWithoutSubRiskIncidents = matrixIncidents.filter((row) => {
      const classification = classificationFor(row);
      return Boolean(classification.effectiveNrlsCode && !classification.localRisk);
    }).length;
    const forwardedMatrixIncidents = matrixIncidents.filter((row) => teamId
      ? Number(row.sendto_team_id) === teamId
      : Boolean(row.sendto_team_id)).length;
    const localOwnerMatrixIncidents = matrixIncidents.filter((row) => {
      const localRisk = row.riskstore_id ? localRiskMap.get(Number(row.riskstore_id)) : null;
      return !row.sendto_team_id && Boolean(localRisk?.team_id) && (!teamId || Number(localRisk?.team_id) === teamId);
    }).length;

    return {
      team: team || { id: teamId, team_name: teamId ? `ทีมนำรหัส ${teamId}` : 'ทุกทีมนำ' },
      summary: {
        total: incidents.length,
        pending: incidents.filter((row) => row.status_risk !== 'จำหน่าย' && (!row.team_review_status || row.team_review_status === 'PENDING')).length,
        in_progress: incidents.filter((row) => row.team_review_status === 'IN_PROGRESS').length,
        completed: incidents.filter((row) => row.status_risk === 'จำหน่าย' || row.team_review_status === 'COMPLETED').length,
        high_severity: incidents.filter((row) => consequenceFromSeverity(row.level_id) >= 4).length,
        matrix_incidents: matrixIncidents.length,
        forwarded_matrix_incidents: forwardedMatrixIncidents,
        local_owner_matrix_incidents: localOwnerMatrixIncidents,
        mapped_risks: nrlsRiskSummary.size,
        sub_risks: subRiskSummary.size,
        mapped_sub_risks: mappedSubRiskSummary.size,
        direct_nrls_incidents: directNrlsIncidents,
        legacy_mapped_incidents: legacyMappedIncidents,
        nrls_without_subrisk_incidents: nrlsWithoutSubRiskIncidents,
        local_unmapped_incidents: localUnmappedIncidents,
        unclassified_incidents: unclassifiedIncidents,
        unmapped_incidents: localUnmappedIncidents + unclassifiedIncidents,
      },
      matrix,
      matrices: {
        nrls: matrix,
        sub_risk: subRiskMatrix,
        sub_risk_mapped: mappedSubRiskMatrix,
      },
      top_risks: [...nrlsRiskSummary.values()].sort((a, b) => b.count - a.count || b.max_consequence - a.max_consequence).slice(0, 10),
      top_sub_risks: [...subRiskSummary.values()].sort((a, b) => b.count - a.count || b.max_consequence - a.max_consequence).slice(0, 10),
      top_sub_risks_mapped: [...mappedSubRiskSummary.values()].sort((a, b) => b.count - a.count || b.max_consequence - a.max_consequence).slice(0, 10),
      data: pageRows,
      meta: {
        total: incidents.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(incidents.length / limit)),
        fiscal_year: fiscalYear,
        fiscal_year_thai: fiscalYear + 543,
        fiscal_year_start: fiscalPeriod.start,
        fiscal_year_end: fiscalPeriod.end,
        observed_end: observedEnd,
        observation_months: observationMonths,
        is_complete_year: observationMonths === 12,
        nrls_cutover_date: NRLS_CUTOVER_DATE,
        data_quality: fiscalYear < nrlsCutoverFiscalYear
          ? 'LEGACY_PARTIAL'
          : observationMonths === 0
            ? 'NOT_STARTED'
            : observationMonths < 12
              ? 'IN_PROGRESS'
              : 'COMPLETE',
        available_fiscal_years: Array.from(new Set([fiscalYear, defaultFiscalYear + 1, defaultFiscalYear, defaultFiscalYear - 1, defaultFiscalYear - 2, defaultFiscalYear - 3])).sort((a, b) => b - a),
      },
    };
  }

  async batchReviewTeam(dto: TeamBatchReviewDto, user: any) {
    const ids = [...new Set((dto.incident_ids || []).map(Number).filter((id) => Number.isFinite(id) && id > 0))];
    if (!ids.length) throw new BadRequestException('กรุณาเลือกอุบัติการณ์อย่างน้อย 1 รายการ');
    if (dto.action === 'COMPLETE' && !String(dto.note || '').trim()) {
      throw new BadRequestException('กรุณาระบุผลสรุปหรือข้อเสนอแนะของทีม');
    }

    const requestedTeamId = dto.team_id ? Number(dto.team_id) : undefined;
    let teamId = this.resolveTeamScope(user, requestedTeamId);
    const incidents = await this.prisma.riskregister.findMany({
      where: {
        id: { in: ids },
        sendto_team_id: teamId ? teamId : { not: null },
        status_risk: 'ทบทวน',
        OR: [{ team_review_status: null }, { team_review_status: { in: ['PENDING', 'IN_PROGRESS'] } }],
      },
    });
    if (incidents.length !== ids.length) {
      throw new ForbiddenException('บางรายการไม่ได้ส่งให้ทีมนี้ ยังไม่ผ่านการทบทวนของหน่วยงาน หรือปิดเหตุการณ์แล้ว');
    }

    const assignedTeams = [...new Set(incidents.map((row) => Number(row.sendto_team_id)).filter(Boolean))];
    if (!teamId) {
      if (assignedTeams.length !== 1) throw new BadRequestException('Admin ต้องเลือกเหตุการณ์จากทีมเดียวกันต่อหนึ่งครั้ง');
      teamId = assignedTeams[0];
    }
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { team_name: true } });
    const actorId = this.getUserId(user) || 1;
    const now = new Date();
    const actionLabel = dto.action === 'START' ? 'รับเข้าทบทวนเป็นชุด' : 'สรุปผลการทบทวนเป็นชุด';
    const note = String(dto.note || '').trim();

    await this.prisma.$transaction(async (tx) => {
      for (const [index, incident] of incidents.entries()) {
        await tx.riskregister.updateMany({
          where: { id: incident.id, id_risk: incident.id_risk, sendto_team_id: teamId },
          data: dto.action === 'START' ? {
            team_review_status: 'IN_PROGRESS',
            team_review_started_at: incident.team_review_started_at || now,
            team_review_completed_at: null,
            team_reviewed_by: actorId,
            modify_date: now,
            updated_by: actorId,
          } : {
            team_review_status: 'COMPLETED',
            team_review_started_at: incident.team_review_started_at || now,
            team_review_completed_at: now,
            team_reviewed_by: actorId,
            modify_date: now,
            updated_by: actorId,
          },
        });
        await tx.riskreview.create({
          data: {
            riskregister_id: incident.id,
            risk_id: incident.id_risk,
            riskvisit: `TEAM-${Date.now().toString().slice(-9)}-${index + 1}`,
            review_date: now,
            notereview: `👥 [${team?.team_name || `ทีมนำ ${teamId}`}] ${actionLabel}${note ? `: ${note}` : ''}`,
            cause_problem: 'การทบทวนระดับทีมนำแบบกลุ่ม',
            reviewresults_id: dto.action === 'COMPLETE' ? 2 : 1,
            status_risk: incident.status_risk,
            created_by: actorId,
            create_date: now,
            modify_date: now,
            count: 1,
          },
        });
      }
    });

    return { success: true, action: dto.action, updated: incidents.length, team_id: teamId };
  }

  async getMyReported(user: any, fiscalYearParam?: string, summaryOnly = false) {
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
    if (!Number.isInteger(selectedFiscalYear) || selectedFiscalYear < 2020 || selectedFiscalYear > defaultFiscalYear + 1) {
      throw new BadRequestException('ปีงบประมาณไม่ถูกต้อง');
    }

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

    const yearWhere = { created_by: userId, register_date: { gte: startOfYear, lte: endOfYear } };
    const [totalReported, returnedForEdit] = await Promise.all([
      this.prisma.riskregister.count({ where: yearWhere }),
      this.prisma.riskregister.count({ where: { ...yearWhere, status_risk: 'แก้ไข' } }),
    ]);
    // The dashboard only displays five recent rows. Keep the full-year view for its dedicated page.
    const incidents = await this.prisma.riskregister.findMany({
      where: yearWhere,
      select: { id: true, id_risk: true, riskstore_id: true, department_id: true,
        sendto_department_id: true, detail: true, nrls_code: true, date_report: true,
        register_date: true, status_risk: true, level_id: true, rca_required: true,
        improvement_status: true },
      orderBy: { id: 'desc' },
      ...(summaryOnly ? { take: 5 } : {}),
    });

    // Two lookups replace up to three queries per incident.
    const riskIds = [...new Set(incidents.map((inc) => inc.riskstore_id).filter((id): id is number => id != null))];
    const departmentIds = [...new Set(incidents.flatMap((inc) => [inc.department_id, inc.sendto_department_id])
      .filter((id): id is string => !!id).map(Number).filter(Number.isFinite))];
    const [riskNames, departmentNames] = await Promise.all([
      riskIds.length ? this.prisma.riskstore.findMany({ where: { riskstore_id: { in: riskIds } }, select: { riskstore_id: true, riskstore_name: true } }) : [],
      departmentIds.length ? this.prisma.department.findMany({ where: { id: { in: departmentIds } }, select: { id: true, depart_name: true } }) : [],
    ]);
    const riskNameById = new Map<number, string>(riskNames.map((row) => [row.riskstore_id, row.riskstore_name] as [number, string]));
    const departmentNameById = new Map<number, string>(departmentNames.map((row) => [row.id, row.depart_name] as [number, string]));
    const enrichedIncidents = incidents.map((inc) => ({
      ...inc,
      riskstore_name: riskNameById.get(inc.riskstore_id || -1) || 'ไม่พบข้อมูลหัวข้อ',
      department_name: departmentNameById.get(Number(inc.department_id)) || 'ไม่พบข้อมูลแผนก',
      sendto_department_name: departmentNameById.get(Number(inc.sendto_department_id)) || 'ไม่มีระบุ',
    }));

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
      totalReported,
      returnedForEdit,
      incidents: enrichedIncidents,
      fiscalYearsList: yearsList,
      currentFiscalYear: defaultFiscalYear,
      selectedFiscalYear
    };
  }

  async getFormData() {
    const [departments, riskGroups, programs, reviewresults, locations, teams] = await Promise.all([
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
        where: { id: { in: [1, 2] } },
        select: { id: true, reviewresults_name: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.location.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.team.findMany({
        select: { id: true, team_name: true },
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
        where: {
          OR: [{ status: null }, { status: '1' }],
        },
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
          type_id: row.type_id || (group_id === 1 ? 2 : 1), // fallback: if no type_id, infer from group_id (1=clinical/type2, 2=general/type1)
          clear_id,
          risk_name,
          riskstore_full: text, // full string for reference
          nrls_code: row.nrls_code,
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

    return { departments, locations, riskGroups: formattedRiskGroups, programs: mockPrograms, teams, risks, reviewresults };
  }



  async findOne(id: number, user?: any) {
    const incident = await this.prisma.riskregister.findFirst({
      where: { id },
    });

    if (!incident) {
      throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);
    }

    const permissions = await this.getIncidentPermissions(user, incident);
    this.assertPermission(permissions.canView, 'ไม่มีสิทธิ์ดูอุบัติการณ์นอกขอบเขตของคุณ');

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
      const team = await this.prisma.team.findUnique({
        where: { id: incident.sendto_team_id }
      });
      if (team) sendtoTeamName = team.team_name;
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

    const [nrlsStandard, classificationAudits, structuredReviews, capaActions] = await Promise.all([
      incident.nrls_code ? this.prisma.nRLS_riskstore.findUnique({
        where: { nrls_code: incident.nrls_code }, include: { program: true },
      }) : Promise.resolve(null),
      this.prisma.incident_classification_audit.findMany({
        where: { incident_id: incident.id, id_risk: incident.id_risk }, orderBy: { changed_at: 'desc' },
      }),
      (this.prisma as any).incident_review_entry.findMany({
        where: { incident_id: incident.id, incident_id_risk: incident.id_risk },
        orderBy: { submitted_at: 'desc' },
      }),
      (this.prisma as any).capa_action.findMany({
        where: { incident_id: incident.id, incident_id_risk: incident.id_risk },
        include: { effectiveness_reviews: { orderBy: { review_date: 'desc' } } },
        orderBy: { id: 'desc' },
      }),
    ]);
    if (nrlsStandard?.program?.program_name) programName = nrlsStandard.program.program_name;

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

    // Get Location details
    let locationName: string | null = null;
    if (incident.location_id) {
      try {
        const loc = await this.prisma.location.findUnique({
          where: { id: Number(incident.location_id) }
        });
        if (loc) locationName = loc.name;
      } catch (e) {
        // ignore
      }
    }

    // Get automatic Level Warning from levelwarning table based on severity (level_id)
    const lvl = (incident.level_id || '').toUpperCase().trim();
    let warningCode = 'RV1';
    if (['1', 'A', 'B'].includes(lvl)) warningCode = 'RV1';
    else if (['2', 'C', 'D'].includes(lvl)) warningCode = 'RV2';
    else if (['3', 'E', 'F'].includes(lvl)) warningCode = 'RV3';
    else if (['4', '5', 'G', 'H', 'I'].includes(lvl)) warningCode = 'RV4';

    let levelWarning: any = null;
    try {
      levelWarning = await this.prisma.levelwarning.findFirst({
        where: { warning_code: warningCode }
      });
    } catch (e) {
      // ignore
    }

    if (!levelWarning) {
      const fallbacks: Record<string, string> = {
        RV1: 'ทบทวน 14 วัน (ความเสี่ยงทั่วไประดับ 1,คลินิกระดับ A,B)',
        RV2: 'ทบทวน 7 วัน (ความเสี่ยงทั่วไประดับ 2,คลินิกระดับ C,D)',
        RV3: 'ทบทวนภายใน 3 วัน (ความเสี่ยงทั่วไประดับ 3,คลินิกระดับ E,F)',
        RV4: 'ทบทวนภายใน 24 ชม. (ความเสี่ยงทั่วไประดับ 4,5,คลินิกระดับ G,H,I)',
      };
      levelWarning = {
        warning_code: warningCode,
        warning_name: fallbacks[warningCode] || 'ทบทวน 14 วัน'
      };
    }

    return {
      ...incident,
      department_name: departmentName,
      location_name: locationName,
      program_name: programName,
      sendto_team_name: sendtoTeamName,
      sendto_department_name: sendtoDeptName,
      risk_topic_name: riskTopicName,
      nrls_name: incident.nrls_name_snapshot || nrlsStandard?.name || null,
      nrls_type: nrlsStandard ? this.getNrlsKind(nrlsStandard) : null,
      classification_audits: classificationAudits,
      level_warning: levelWarning,
      reviews: enrichedReviews,
      structured_reviews: structuredReviews,
      capa_actions: capaActions,
      capa_summary: {
        total: capaActions.length,
        closed: capaActions.filter((action: any) => String(action.status).toUpperCase() === 'CLOSED').length,
        awaiting_effectiveness: capaActions.filter((action: any) => ['IMPLEMENTED', 'AWAITING_EFFECTIVENESS'].includes(String(action.status).toUpperCase())).length,
        rework: capaActions.filter((action: any) => String(action.status).toUpperCase() === 'REWORK').length,
      },
      permissions: {
        ...permissions,
        canClassify: await this.isInWorkflowDecisionScope(user, incident),
        canRecordOwnerReview: permissions.canReview,
        canRecordCoReview: permissions.canTeamReview,
        canRecordRmReview: this.isRmCommittee(user) && await this.isInManagementScope(user, incident),
      },
    };
  }

  async getAttachmentPath(id: number, requestedFilename: string, user?: any): Promise<string> {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);

    const permissions = await this.getIncidentPermissions(user, incident);
    this.assertPermission(permissions.canView, 'ไม่มีสิทธิ์เปิดไฟล์แนบของอุบัติการณ์นี้');

    const filename = basename(String(requestedFilename || '').trim());
    if (!filename || filename !== requestedFilename || filename.includes('..')) {
      throw new BadRequestException('ชื่อไฟล์แนบไม่ถูกต้อง');
    }

    const attachmentNames = String(incident.image || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => basename(item.replace(/\\/g, '/')));
    if (!attachmentNames.includes(filename)) {
      throw new NotFoundException('ไฟล์นี้ไม่ได้แนบอยู่กับอุบัติการณ์ที่ร้องขอ');
    }

    const uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
    const filePath = resolve(uploadDir, filename);
    if (!filePath.startsWith(`${uploadDir}${sep}`) || !existsSync(filePath)) {
      throw new NotFoundException('ไม่พบไฟล์แนบบนเซิร์ฟเวอร์');
    }
    return filePath;
  }

  async getReviewAttachmentPath(id: number, reviewId: number, requestedFilename: string, user?: any): Promise<string> {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);
    const permissions = await this.getIncidentPermissions(user, incident);
    this.assertPermission(permissions.canView, 'ไม่มีสิทธิ์เปิดไฟล์แนบของการทบทวนนี้');

    const review = await this.prisma.riskreview.findFirst({
      where: { id: reviewId, riskregister_id: id },
      select: { files: true },
    });
    if (!review) throw new NotFoundException('ไม่พบรอบการทบทวนที่ร้องขอ');

    const filename = basename(String(requestedFilename || '').trim());
    if (!filename || filename !== requestedFilename || filename.includes('..')) {
      throw new BadRequestException('ชื่อไฟล์แนบไม่ถูกต้อง');
    }
    const attachment = parseReviewAttachments(review.files).find((item) => item.filename === filename);
    if (!attachment) throw new NotFoundException('ไฟล์นี้ไม่ได้แนบอยู่กับรอบการทบทวนที่ร้องขอ');

    const uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
    const filePath = resolve(uploadDir, filename);
    if (!filePath.startsWith(`${uploadDir}${sep}`) || !existsSync(filePath)) {
      throw new NotFoundException('ไม่พบไฟล์แนบบนเซิร์ฟเวอร์');
    }
    return filePath;
  }

  async create(
    data: any,
    user?: any,
    internalSource?: { linkKey?: string; note?: string; referType?: string },
  ) {
    const requestedDepartmentId = String(data.department_id || user?.departmentId || '').trim();
    if (!requestedDepartmentId) throw new BadRequestException('กรุณาระบุหน่วยงานต้นทางของรายงาน');
    if (!(this.isRmCommittee(user) && user?.rmScope === 'hospital')) {
      const allowedDepartmentIds = (this.isRmCommittee(user) || this.isHead(user)) && user?.rmScope === 'group'
        ? await this.getGroupDepartmentIds(user)
        : this.getUserDepartmentIds(user);
      this.assertPermission(
        allowedDepartmentIds.includes(requestedDepartmentId),
        'ไม่สามารถสร้างรายงานโดยอ้างหน่วยงานต้นทางนอกขอบเขตของบัญชีนี้',
      );
    }
    this.assertAttachmentReferencesOwned(data.image, user);
    const incidentDate = new Date(data.date_report || new Date());
    const hasNrls = Boolean(String(data.nrls_code || '').trim());
    if (!hasNrls) {
      throw new BadRequestException('รายงานใหม่ทุกวันที่เกิดเหตุต้องเลือกความเสี่ยงตามมาตรฐาน NRLS');
    }
    const classification = await this.resolveClassification(data.nrls_code, data.riskstore_id, data.level_id);
    // Generate id_risk
    const lastRecord = await this.prisma.riskregister.findFirst({
      orderBy: { id_risk: 'desc' },
      select: { id_risk: true }
    });
    const nextIdRisk = (lastRecord?.id_risk || 0) + 1;

    const createData: any = {
      id_risk: nextIdRisk,
      date_report: incidentDate,
      time_report: new Date(data.time_report || new Date()),
      duration_id: data.duration_id ? Number(data.duration_id) : null,
      location_id: data.location_id ? Number(data.location_id) : null,
      user_ir_type: data.user_ir_type || 'ตนเอง',
      user_ir: this.getUserId(user) || 1,
      program_id: classification.nrls.program_id,
      level_id: classification.level,
      riskstore_id: classification.localId,
      detail: data.detail || '',
      detail_hosxp: data.detail_hosxp || null,
      affected: Array.isArray(data.affected) ? data.affected.join(', ') : (data.affected || null),
      edit: data.edit || null,
      problem_basic: data.problem_basic || null,
      inform_id: data.inform_id ? Number(data.inform_id) : 0,
      // Every new incident must enter the approval workflow. Client input cannot skip stages.
      status_risk: 'รายงาน',
      department_id: requestedDepartmentId,
      image: data.image || null,
      nrls_code: classification.code,
      nrls_name_snapshot: classification.nrls.name,
      is_sec41: Boolean(data.is_sec41),
      is_potential_harm: Boolean(data.is_potential_harm),
      classification_status: 'PENDING',
      classified_by: null,
      classified_at: null,
      link_key: internalSource?.linkKey ? String(internalSource.linkKey).slice(0, 100) : null,
      note: internalSource?.note ? String(internalSource.note).slice(0, 255) : null,
      refer_type: internalSource?.referType ? String(internalSource.referType).slice(0, 1) : null,
      register_date: new Date(),
      created_by: this.getUserId(user) || 1,
      create_date: new Date(),
      modify_date: new Date(),
    };

    const newIncident = await this.prisma.riskregister.create({
      data: createData,
    });
    await this.rcaPolicy.evaluateAndPersist(newIncident.id, this.getUserId(user) || undefined, 'INCIDENT_CREATED');

    // Also mirror to legacy `risk` table if possible
    if (createData.riskstore_id !== null) try {
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

    // Trigger Telegram notification for high level risks
    try {
      this.sendTelegramAlert(newIncident).catch(e => console.error('Telegram send error:', e));
    } catch (e) {
      console.error('Error triggering Telegram alert:', e);
    }

    return newIncident;
  }

  private async sendTelegramAlert(incident: any) {
    let botApiToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let chatId = process.env.TELEGRAM_CHAT_ID || 'PUT_YOUR_CHAT_ID_HERE'; 
    let deptName = String(incident.department_id || '-');

    // Try to get department-specific bot configuration
    if (incident.department_id) {
      try {
        const dept = await this.prisma.department.findUnique({
          where: { id: parseInt(incident.department_id, 10) }
        });
        if (dept) {
          deptName = dept.depart_name;
          if (dept.telegram_token && dept.telegram_chat_id) {
            botApiToken = dept.telegram_token;
            chatId = dept.telegram_chat_id;
          }
        }
      } catch (e) {
        console.error('Error fetching department telegram settings:', e);
      }
    }
    
    if (!botApiToken || chatId === 'PUT_YOUR_CHAT_ID_HERE') {
      console.warn('Telegram is not configured; notification skipped');
      return;
    }

    // Only the dedicated basic-problem summary is eligible for Telegram. Never
    // fall back to the full narrative because it can contain unexpected PHI.
    const safeSummary = this.sanitizeTelegramSummary(incident.problem_basic || '');
    const message = `🚨 <b>แจ้งเตือนอุบัติการณ์ความเสี่ยงใหม่ (ระดับ ${incident.level_id})</b> 🚨\n\n` +
      `<b>รหัส:</b> ${incident.id}\n` +
      `<b>NRLS:</b> ${incident.nrls_code || 'รอจัดประเภท'}\n` +
      `<b>ประเภทเหตุการณ์:</b> ${this.sanitizeTelegramSummary(incident.nrls_name_snapshot || '') || '-'}\n` +
      `<b>ระดับ:</b> ${incident.level_id}\n` +
      `<b>วันที่เกิดเหตุ:</b> ${new Date(incident.date_report).toLocaleDateString('th-TH')}\n` +
      `<b>หน่วยงาน:</b> ${deptName}\n` +
      (safeSummary ? `<b>สรุปเหตุการณ์:</b> ${safeSummary}\n` : '') +
      `<i>โปรดตรวจสอบในระบบ HRMS</i>`;

    const url = `https://api.telegram.org/bot${botApiToken}/sendMessage`;
    
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.error('Error sending telegram:', e);
    }
  }

  private sanitizeTelegramSummary(value: string): string {
    return String(value || '')
      .replace(/\b(?:HN|AN|CID|เลขบัตร(?:ประชาชน)?)\s*[:#-]?\s*[A-Za-z0-9-]+/gi, '[ปกปิด]')
      .replace(/\b\d{13}\b/g, '[ปกปิดเลขประจำตัว]')
      .replace(/\b0\d{8,9}\b/g, '[ปกปิดเบอร์โทร]')
      .replace(/(?:นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*[ก-๙A-Za-z]+(?:\s+[ก-๙A-Za-z]+){0,2}/g, '[ปกปิดชื่อ]')
      .replace(/&/g, 'และ')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
  }

  async update(id: number, data: any, user?: any) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);
    const permissions = await this.getIncidentPermissions(user, incident);
    this.assertPermission(permissions.canEdit, 'ไม่มีสิทธิ์แก้ไขรายละเอียดอุบัติการณ์นี้');
    if (data.image !== undefined) this.assertAttachmentReferencesOwned(data.image, user, incident.image);
    if (data.department_id !== undefined && String(data.department_id) !== String(incident.department_id)) {
      throw new BadRequestException(
        'หน่วยงานต้นทางของรายงานเปลี่ยนไม่ได้หลังสร้างรายการ กรุณาใช้หน่วยงานผู้รับผิดชอบ/หน่วยงานปลายทางแทน',
      );
    }

    const editableFields = [
      'date_report', 'time_report', 'duration_id', 'location_id', 'user_ir_type', 'user_ir',
      'level_id', 'detail', 'detail_hosxp', 'affected', 'edit', 'problem_basic', 'inform_id',
      'image', 'is_sec41', 'is_potential_harm',
    ];
    const updateData: any = {};
    for (const field of editableFields) if (data[field] !== undefined) updateData[field] = data[field];
    const effectiveDate = data.date_report || incident.date_report;
    const effectiveNrlsCode = data.nrls_code !== undefined ? data.nrls_code : incident.nrls_code;
    const mayRemainLegacy = incident.classification_status === 'LEGACY'
      && !String(incident.nrls_code || '').trim()
      && !isNrlsRequired(effectiveDate);
    if (!String(effectiveNrlsCode || '').trim() && !mayRemainLegacy) {
      throw new BadRequestException('เฉพาะประวัติเดิมสถานะ Legacy ก่อน 1 ตุลาคม 2569 เท่านั้นที่ไม่มีรหัส NRLS ได้');
    }
    const classificationChanged = data.nrls_code !== undefined || data.riskstore_id !== undefined;
    if (classificationChanged) {
      this.assertPermission(
        await this.isInWorkflowDecisionScope(user, incident),
        'การจัดประเภท NRLS เป็นการตัดสินด้านความเสี่ยง ทำได้เฉพาะหัวหน้าหรือ RM ในขอบเขตนี้',
      );
      if (incident.classification_status === 'CONFIRMED') {
        this.assertPermission(await this.isInWorkflowDecisionScope(user, incident), 'รายการที่ยืนยันแล้วแก้การจัดประเภทได้เฉพาะผู้รับผิดชอบในขอบเขตนี้');
      }
      const selectedRiskstoreId = data.riskstore_id !== undefined ? data.riskstore_id : incident.riskstore_id;
      const selectedLevel = data.level_id ?? incident.level_id;
      if (String(effectiveNrlsCode || '').trim()) {
        const classification = await this.resolveClassification(effectiveNrlsCode, selectedRiskstoreId, selectedLevel);
        updateData.nrls_code = classification.code;
        updateData.nrls_name_snapshot = classification.nrls.name;
        updateData.program_id = classification.nrls.program_id;
        updateData.riskstore_id = classification.localId;
        updateData.level_id = classification.level;
        updateData.classification_status = incident.classification_status === 'CONFIRMED' ? 'NEEDS_REVIEW' : 'PENDING';
      } else {
        const legacy = await this.resolveLegacyClassification(selectedRiskstoreId, selectedLevel);
        updateData.nrls_code = null;
        updateData.nrls_name_snapshot = null;
        updateData.program_id = legacy.local?.program_id || null;
        updateData.riskstore_id = legacy.localId;
        updateData.level_id = legacy.level;
        updateData.classification_status = 'LEGACY';
      }
      updateData.classified_by = null;
      updateData.classified_at = null;
    } else if (data.level_id !== undefined && incident.nrls_code) {
      const classification = await this.resolveClassification(incident.nrls_code, incident.riskstore_id, data.level_id);
      updateData.level_id = classification.level;
    }
    if (data.date_report) updateData.date_report = new Date(data.date_report);
    if (data.time_report) updateData.time_report = new Date(data.time_report);
    if (Array.isArray(data.affected)) updateData.affected = data.affected.join(', ');

    await this.prisma.$transaction(async (tx) => {
      await tx.riskregister.updateMany({ where: { id, id_risk: incident.id_risk }, data: updateData });
      if (classificationChanged &&
          (String(incident.nrls_code || '') !== String(updateData.nrls_code || '') ||
           Number(incident.riskstore_id || 0) !== Number(updateData.riskstore_id || 0))) {
        await tx.incident_classification_audit.create({ data: {
          incident_id: incident.id,
          id_risk: incident.id_risk,
          old_nrls_code: incident.nrls_code,
          new_nrls_code: updateData.nrls_code,
          old_riskstore_id: incident.riskstore_id,
          new_riskstore_id: updateData.riskstore_id,
          changed_by: this.getUserId(user),
          reason: data.classification_reason || 'แก้ไขการจัดประเภทอุบัติการณ์',
        } });
      }
    });
    const remainsLegacy = (updateData.classification_status ?? incident.classification_status) === 'LEGACY';
    if (!remainsLegacy && (classificationChanged || data.level_id !== undefined || data.is_sec41 !== undefined || data.is_potential_harm !== undefined)) {
      await this.rcaPolicy.evaluateAndPersist(id, this.getUserId(user) || undefined, 'INCIDENT_UPDATED');
    }

    return this.findOne(id, user);
  }

  async confirmClassification(id: number, reason?: string, user?: any) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);
    this.assertPermission(await this.isInWorkflowDecisionScope(user, incident), 'ไม่มีสิทธิ์ยืนยันการจัดประเภทอุบัติการณ์นี้');
    if (['จำหน่าย', 'ไม่ใช่ความเสี่ยง'].includes(String(incident.status_risk || ''))) {
      throw new BadRequestException('ไม่สามารถยืนยันหรือเปลี่ยนการจัดประเภทของเคสที่สิ้นสุด Workflow แล้ว');
    }
    if (!incident.nrls_code || incident.classification_status === 'LEGACY') {
      throw new BadRequestException(`ข้อมูลเดิมก่อน ${NRLS_CUTOVER_DATE_THAI} ที่ไม่มี NRLS ไม่ต้องยืนยันย้อนหลัง`);
    }
    const classification = await this.resolveClassification(incident.nrls_code || '', incident.riskstore_id, incident.level_id);
    const userId = this.getUserId(user);
    await this.prisma.riskregister.updateMany({
      where: { id, id_risk: incident.id_risk },
      data: {
        nrls_code: classification.code,
        nrls_name_snapshot: classification.nrls.name,
        program_id: classification.nrls.program_id,
        riskstore_id: classification.localId,
        level_id: classification.level,
        classification_status: 'CONFIRMED',
        classified_by: userId,
        classified_at: new Date(),
        modify_date: new Date(),
      },
    });
    await this.prisma.incident_classification_audit.create({ data: {
      incident_id: incident.id, id_risk: incident.id_risk,
      old_nrls_code: incident.nrls_code, new_nrls_code: classification.code,
      old_riskstore_id: incident.riskstore_id, new_riskstore_id: classification.localId,
      changed_by: userId, reason: reason || 'ยืนยันการจัดประเภท NRLS',
    } });
    await this.rcaPolicy.evaluateAndPersist(id, userId || undefined, 'CLASSIFICATION_CONFIRMED');
    return this.findOne(id, user);
  }

  async updateStatus(
    id: number, 
    newStatus: string, 
    user?: any, 
    note?: string,
    department_id?: string,
    sendto_department_id?: string,
    user_ir_type?: string
  ) {
    const validStatuses = ['รายงาน', 'แก้ไข', 'ตรวจสอบ', 'ทบทวน', 'จำหน่าย', 'ไม่ใช่ความเสี่ยง'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`สถานะไม่ถูกต้อง: ${newStatus}`);
    }

    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);

    const permissions = await this.getIncidentPermissions(user, incident);
    const permissionByTarget: Record<string, boolean> = {
      'รายงาน': false,
      'แก้ไข': permissions.canConfirm,
      'ตรวจสอบ': permissions.canConfirm,
      'ทบทวน': permissions.canReview,
      'จำหน่าย': permissions.canClose,
      'ไม่ใช่ความเสี่ยง': permissions.canReject,
    };
    this.assertPermission(permissionByTarget[newStatus], 'ไม่มีสิทธิ์เปลี่ยนเป็นสถานะที่ร้องขอ');

    if (['จำหน่าย', 'ไม่ใช่ความเสี่ยง'].includes(newStatus) && String(note || '').trim().length < 10) {
      throw new BadRequestException('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษรก่อนปิดเคสหรือระบุว่าไม่ใช่ความเสี่ยง');
    }

    const currentStatus = incident.status_risk || 'รายงาน';
    if (['รายงาน', 'แก้ไข'].includes(currentStatus)
      && sendto_department_id
      && String(sendto_department_id) !== String(incident.department_id)) {
      throw new BadRequestException('หน่วยงานต้นทางต้องทบทวนเบื้องต้นก่อนส่งให้หน่วยงานอื่น');
    }
    if (newStatus !== currentStatus
      && ['แก้ไข', 'ตรวจสอบ', 'ทบทวน'].includes(newStatus)
      && String(note || '').trim().length < 10) {
      throw new BadRequestException('กรุณาระบุเหตุผลหรือผลการดำเนินงานอย่างน้อย 10 ตัวอักษรก่อนเปลี่ยนสถานะ');
    }

    if (newStatus === 'ตรวจสอบ'
      && isNrlsRequired(incident.date_report)
      && incident.classification_status !== 'CONFIRMED') {
      throw new BadRequestException('ต้องยืนยันการจัดประเภท NRLS ก่อนยืนยันอุบัติการณ์เข้าสู่ขั้นตอนตรวจสอบ');
    }

    if (
      department_id !== undefined
      && department_id !== null
      && department_id !== ''
      && String(department_id) !== String(incident.department_id)
    ) {
      throw new BadRequestException(
        'หน่วยงานต้นทางของรายงานเปลี่ยนไม่ได้ในขั้นตอน Workflow กรุณากำหนดหน่วยงานผู้รับผิดชอบแทน',
      );
    }

    if (newStatus === 'จำหน่าย') {
      const completedReviews = await this.prisma.riskreview.count({
        where: {
          riskregister_id: incident.id,
          status_risk: 'ทบทวน',
          notereview: { not: '' },
        },
      });
      if (completedReviews < 1) {
        throw new BadRequestException('ไม่สามารถจำหน่ายอุบัติการณ์ได้: ต้องบันทึกผลการทบทวนอย่างน้อย 1 ครั้งก่อน');
      }

      const severity = String(incident.level_id || '').trim().toUpperCase();
      const isLowSeverity = ['A', 'B', '1'].includes(severity);
      if (!isLowSeverity && !this.isRmCommittee(user)) {
        throw new ForbiddenException('อุบัติการณ์ระดับ C–I หรือ 2–5 ต้องให้คณะกรรมการ RM เป็นผู้จำหน่ายเคส');
      }
    }

    if (newStatus === 'จำหน่าย' && incident.rca_required) {
      const mini = await this.prisma.rca_case.findFirst({
        where: { incident_id: incident.id, status: 'COMPLETED', completed_at: { not: null } },
      });
      const standard = await this.prisma.standard_rca_case.findFirst({
        where: { incident_id: incident.id, status: 'COMPLETED', completed_at: { not: null } },
      });
      if (!mini && !standard) {
        throw new BadRequestException('ไม่สามารถจำหน่ายอุบัติการณ์ได้: ต้องทำ RCA ให้เสร็จและระบุวันที่เสร็จสิ้นก่อน');
      }
    }
    const allowedTransitions: Record<string, string[]> = {
      'รายงาน': ['แก้ไข', 'ตรวจสอบ', 'ไม่ใช่ความเสี่ยง'],
      'แก้ไข': ['ตรวจสอบ', 'ไม่ใช่ความเสี่ยง'],
      'ตรวจสอบ': ['แก้ไข', 'ทบทวน', 'ไม่ใช่ความเสี่ยง'],
      'ทบทวน': ['ทบทวน', 'จำหน่าย', 'ไม่ใช่ความเสี่ยง'],
      'จำหน่าย': [],
      'ไม่ใช่ความเสี่ยง': [],
    };
    if (newStatus !== currentStatus && !(allowedTransitions[currentStatus] || []).includes(newStatus)) {
      throw new BadRequestException(`ไม่สามารถเปลี่ยนสถานะจาก "${currentStatus}" เป็น "${newStatus}" ได้`);
    }

    const isReassigning = (
      sendto_department_id !== undefined
      && String(sendto_department_id || '') !== String(incident.sendto_department_id || '')
    );
    if (isReassigning) {
      this.assertPermission(permissions.canAssignDepartment, 'ไม่มีสิทธิ์เปลี่ยนหน่วยงานรับผิดชอบหรือหน่วยงานปลายทาง');
      if (this.isAdmin(user)) {
        const adminDepartmentIds = this.getUserDepartmentIds(user);
        this.assertPermission(
          adminDepartmentIds.includes(String(sendto_department_id || incident.department_id || '')),
          'Admin กำหนดหน่วยงานรับผิดชอบในขั้นตอนยืนยันได้เฉพาะหน่วยงานของตนเอง',
        );
      } else {
        const permissionsAfterMove = await this.getIncidentPermissions(user, {
          ...incident,
          status_risk: newStatus,
          sendto_department_id: sendto_department_id === undefined
            ? incident.sendto_department_id
            : (sendto_department_id || null),
        });
        this.assertPermission(permissionsAfterMove.canView, 'ไม่สามารถย้ายอุบัติการณ์ออกนอกขอบเขตที่คุณรับผิดชอบได้');
      }
    }

    if (sendto_department_id) {
      const destination = await this.prisma.department.findUnique({
        where: { id: Number(sendto_department_id) },
        select: { id: true },
      });
      if (!destination) throw new BadRequestException('ไม่พบหน่วยงานผู้รับผิดชอบที่เลือก');
    }

    const updateData: any = {
      status_risk: newStatus,
      modify_date: new Date(),
      updated_by: this.getUserId(user) || 1,
    };

    if (sendto_department_id !== undefined) {
      updateData.sendto_department_id = sendto_department_id ? String(sendto_department_id) : null;
    }

    if (user_ir_type !== undefined && user_ir_type !== null && user_ir_type !== '') {
      updateData.user_ir_type = String(user_ir_type);
    }

    if (newStatus === 'ตรวจสอบ') {
      updateData.send_date = new Date();
      updateData.send_use = user?.name || 'หัวหน้างาน/คณะกรรมการ RM';
      // An incident always has one accountable owner. If no destination was
      // explicitly selected, the reporting department owns the first review.
      updateData.sendto_department_id = String(
        ['รายงาน', 'แก้ไข'].includes(currentStatus)
          ? incident.department_id
          : sendto_department_id || incident.sendto_department_id || incident.department_id,
      );
    }

    if (newStatus === 'จำหน่าย') {
      const capaActions = await (this.prisma as any).capa_action.findMany({
        where: { incident_id: incident.id, incident_id_risk: incident.id_risk },
        select: { status: true },
      });
      const statuses = capaActions.map((action: any) => String(action.status || '').toUpperCase());
      const activeCount = statuses.filter((status: string) => !['CLOSED', 'CANCELLED'].includes(status)).length;
      const closedCount = statuses.filter((status: string) => status === 'CLOSED').length;
      updateData.operational_closed_at = new Date();
      updateData.improvement_status = statuses.length === 0 || (activeCount === 0 && closedCount === 0)
        ? 'NOT_REQUIRED'
        : activeCount === 0
          ? 'CLOSED'
          : 'MONITORING';
      updateData.effectiveness_closed_at = updateData.improvement_status === 'CLOSED' ? new Date() : null;
    } else if (newStatus === 'ไม่ใช่ความเสี่ยง') {
      updateData.operational_closed_at = new Date();
      updateData.improvement_status = 'NOT_REQUIRED';
      updateData.effectiveness_closed_at = null;
    }

    const actorId = this.getUserId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.riskregister.updateMany({
        where: { id, id_risk: incident.id_risk },
        data: updateData,
      });
      await tx.workflow_audit.create({
        data: {
          entity_type: 'INCIDENT',
          entity_id: String(id),
          action: 'STATUS_TRANSITION',
          old_value: JSON.stringify({
            status_risk: currentStatus,
            sendto_department_id: incident.sendto_department_id,
          }),
          new_value: JSON.stringify({
            status_risk: newStatus,
            sendto_department_id: updateData.sendto_department_id ?? incident.sendto_department_id,
          }),
          reason: String(note || '').trim() || null,
          changed_by: actorId,
        },
      });

      if (newStatus === 'ตรวจสอบ') {
        const level = String(incident.level_id || '').trim().toUpperCase();
        const severityGroup = ['G', 'H', 'I', '4', '5'].includes(level)
          ? 'CRITICAL'
          : ['E', 'F', '3'].includes(level)
            ? 'HIGH'
            : ['C', 'D', '2'].includes(level)
              ? 'MEDIUM'
              : 'LOW';
        const policy = await (tx as any).sla_policy.findUnique({
          where: {
            workflow_stage_severity_group: {
              workflow_stage: 'REVIEW_OWNER',
              severity_group: severityGroup,
            },
          },
        });
        const startedAt = new Date();
        const dueAt = new Date(startedAt.getTime() + Number(policy?.duration_hours || 336) * 3600000);
        await (tx as any).sla_instance.upsert({
          where: {
            entity_type_entity_id_workflow_stage: {
              entity_type: 'INCIDENT',
              entity_id: String(id),
              workflow_stage: 'REVIEW_OWNER',
            },
          },
          create: {
            policy_id: policy?.id || null,
            entity_type: 'INCIDENT',
            entity_id: String(id),
            workflow_stage: 'REVIEW_OWNER',
            severity: incident.level_id,
            owner_department_id: updateData.sendto_department_id || incident.sendto_department_id || incident.department_id,
            started_at: startedAt,
            due_at: dueAt,
          },
          update: {
            policy_id: policy?.id || null,
            severity: incident.level_id,
            owner_department_id: updateData.sendto_department_id || incident.sendto_department_id || incident.department_id,
            started_at: startedAt,
            due_at: dueAt,
            status: 'ACTIVE',
            breached_at: null,
            completed_at: null,
            escalation_level: 0,
            last_escalated_at: null,
          },
        });
      }

      // Keep the human-readable timeline in addition to the immutable workflow audit.
      if (note && note.trim() !== '') {
        await tx.riskreview.create({
          data: {
            riskregister_id: id,
            risk_id: incident?.id_risk || id,
            riskvisit: `REV-${Date.now().toString().slice(-10)}`,
            review_date: new Date(),
            notereview: note,
            reviewresults_id: newStatus === 'จำหน่าย' ? 2 : 1,
            status_risk: newStatus,
            created_by: actorId || 1,
            create_date: new Date(),
            modify_date: new Date(),
            count: 1,
          },
        });
      }
    });

    return this.findOne(id, user);
  }

  private validateStoredReviewAttachments(value: unknown, user?: any): ReviewAttachment[] {
    const attachments = parseReviewAttachments(value);
    if (!value) return [];
    if (!Array.isArray(value) || attachments.length !== value.length || attachments.length > MAX_REVIEW_ATTACHMENT_FILES) {
      throw new BadRequestException('รายการไฟล์แนบการทบทวนไม่ถูกต้อง');
    }
    const actorId = this.getUserId(user);
    if (!actorId) throw new ForbiddenException('ไม่พบตัวตนเจ้าของไฟล์แนบ');
    const uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
    let totalBytes = 0;
    return attachments.map((attachment) => {
      const filename = basename(attachment.filename.replace(/\\/g, '/'));
      if (filename !== attachment.filename || !filename.startsWith(`${actorId}-review-`)) {
        throw new ForbiddenException('อ้างอิงได้เฉพาะไฟล์ทบทวนที่บัญชีนี้เป็นผู้อัปโหลด');
      }
      const extension = extname(filename).toLowerCase();
      const mimetype = Object.entries(REVIEW_ATTACHMENT_EXTENSIONS).find(([, ext]) => ext === extension)?.[0];
      if (!mimetype) throw new BadRequestException('ชนิดไฟล์แนบการทบทวนไม่ถูกต้อง');
      const filePath = resolve(uploadDir, filename);
      if (!filePath.startsWith(`${uploadDir}${sep}`) || !existsSync(filePath)) {
        throw new BadRequestException(`ไม่พบไฟล์แนบ ${filename}`);
      }
      const actualSize = statSync(filePath).size;
      totalBytes += actualSize;
      if (totalBytes > MAX_REVIEW_ATTACHMENT_BYTES) {
        throw new BadRequestException('ขนาดไฟล์แนบรวมต้องไม่เกิน 10 MB');
      }
      const originalname = basename(String(attachment.originalname || filename).replace(/\\/g, '/'))
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, 255) || filename;
      return { filename, originalname, mimetype, size: actualSize };
    });
  }

  async addReviewWithAttachments(id: number, reviewDto: CreateIncidentReviewDto, files: any[], user?: any) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    const permissions = await this.getIncidentPermissions(user, incident);
    const canAttach = this.isRmCommittee(user)
      ? await this.isInManagementScope(user, incident)
      : permissions.canReview || permissions.canTeamReview;
    this.assertPermission(canAttach, 'ไม่มีสิทธิ์แนบไฟล์ในการทบทวนอุบัติการณ์นี้');
    validateReviewAttachmentFiles(files);

    const actorId = this.getUserId(user);
    if (!actorId) throw new ForbiddenException('ไม่พบตัวตนผู้อัปโหลด');
    const uploadDir = resolve(process.env.UPLOAD_DIR || './uploads');
    const storedPaths: string[] = [];
    const attachments: ReviewAttachment[] = [];
    try {
      for (const file of files) {
        const extension = REVIEW_ATTACHMENT_EXTENSIONS[file.mimetype];
        const filename = `${actorId}-review-${Date.now()}-${randomBytes(8).toString('hex')}${extension}`;
        const filePath = resolve(uploadDir, filename);
        await writeFile(filePath, file.buffer, { flag: 'wx' });
        storedPaths.push(filePath);
        const originalname = basename(String(file.originalname || filename).replace(/\\/g, '/'))
          .replace(/[\u0000-\u001f\u007f]/g, '')
          .slice(0, 255) || filename;
        attachments.push({ filename, originalname, mimetype: file.mimetype, size: file.size });
      }
      return await this.addReview(id, { ...reviewDto, files: attachments }, user);
    } catch (error) {
      await Promise.all(storedPaths.map((filePath) => unlink(filePath).catch(() => undefined)));
      throw error;
    }
  }

  async addReview(
    id: number,
    reviewDto: CreateIncidentReviewDto & { files?: ReviewAttachment[] },
    user?: any,
  ) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    const permissions = await this.getIncidentPermissions(user, incident);
    const requestedRole = String(reviewDto.review_role || '').toUpperCase();
    const reviewRole = this.isRmCommittee(user)
      ? 'RM'
      : permissions.canReview
        ? 'OWNER'
        : 'CO_REVIEW';
    if (requestedRole && requestedRole !== reviewRole) {
      throw new ForbiddenException(`ไม่สามารถเปลี่ยนบทบาทผู้ทบทวนเป็น ${requestedRole} ได้ ระบบกำหนดบทบาทจากสิทธิ์เป็น ${reviewRole}`);
    }
    const allowedByRole: Record<string, boolean> = {
      OWNER: permissions.canReview,
      CO_REVIEW: permissions.canTeamReview,
      RM: this.isRmCommittee(user) && await this.isInManagementScope(user, incident),
    };
    this.assertPermission(Boolean(allowedByRole[reviewRole]), `ไม่มีสิทธิ์บันทึกผลทบทวนในบทบาท ${reviewRole}`);

    const note = String(reviewDto.findings || reviewDto.notereview || '').trim();
    if (note.length < 10) throw new BadRequestException('กรุณาระบุรายละเอียดการทบทวนหรือมาตรการอย่างน้อย 10 ตัวอักษร');
    const learningAction = reviewDto.learning_action
      ? String(reviewDto.learning_action).toUpperCase()
      : null;
    if (learningAction && !['NO_NEW_MEASURE', 'SEND_RCA', 'REQUEST_CO_REVIEW'].includes(learningAction)) {
      throw new BadRequestException('รูปแบบการเรียนรู้และปรับปรุงไม่ถูกต้อง');
    }
    const severity = String(incident.level_id || '').trim().toUpperCase();
    const isLowSeverity = ['A', 'B', '1'].includes(severity);
    const departmentOutcome = reviewDto.department_outcome
      ? String(reviewDto.department_outcome).toUpperCase()
      : null;
    if (departmentOutcome && !['IN_PROGRESS', 'RESOLVED', 'UNRESOLVED'].includes(departmentOutcome)) {
      throw new BadRequestException('ผลการดำเนินการแก้ไขปัญหาระดับหน่วยงานไม่ถูกต้อง');
    }
    if (isLowSeverity && departmentOutcome === 'UNRESOLVED') {
      throw new BadRequestException('อุบัติการณ์ระดับ A–B หรือ 1 ไม่มีตัวเลือก “ไม่สามารถยุติปัญหาได้” กรุณาเลือกอยู่ระหว่างดำเนินการหรือยุติปัญหาได้');
    }
    const forwardingPurpose = String(
      reviewDto.forwarding_purpose || (learningAction === 'REQUEST_CO_REVIEW' ? 'CO_REVIEW' : 'NONE'),
    ).toUpperCase();
    if (!['NONE', 'INFORM', 'CO_REVIEW', 'ADDITIONAL_ACTION', 'TRANSFER_OWNER'].includes(forwardingPurpose)) {
      throw new BadRequestException('วัตถุประสงค์การส่งต่อไม่ถูกต้อง');
    }
    const serializedContributingFactors = serializeContributingFactors(reviewDto.contributing_factors);
    if (!isLowSeverity && reviewDto.learning_action && !serializedContributingFactors && !String(reviewDto.cause_problem || '').trim()) {
      throw new BadRequestException('กรุณาเลือกปัจจัยที่เกี่ยวข้อง หรือพิมพ์สาเหตุอื่น ๆ');
    }
    const reviewAttachments = this.validateStoredReviewAttachments(reviewDto.files, user);
    const reviewResultId = reviewDto.reviewresults_id ? Number(reviewDto.reviewresults_id) : 1;
    if (!Number.isInteger(reviewResultId) || ![1, 2].includes(reviewResultId)) {
      throw new BadRequestException('กรุณาเลือกผลการทบทวนและการเปลี่ยนแปลงมาตรการ');
    }
    if (reviewDto.reviewresults_id) {
      const reviewResultExists = await this.prisma.reviewresults.findUnique({
        where: { id: reviewResultId },
        select: { id: true },
      });
      if (!reviewResultExists) {
        throw new BadRequestException('ไม่พบผลการทบทวนที่เลือก กรุณารีเฟรชหน้าแล้วเลือกใหม่');
      }
    }

    let coReviewDepartmentId: string | null = null;
    if (forwardingPurpose !== 'NONE') {
      this.assertPermission(permissions.canForward, 'ไม่มีสิทธิ์ส่งให้หน่วยงานอื่นทบทวนเพิ่มเติม');
      coReviewDepartmentId = String(reviewDto.forwarded_department_id || reviewDto.co_review_department_id || '').trim();
      if (!coReviewDepartmentId) throw new BadRequestException('กรุณาเลือกหน่วยงานปลายทาง');
      if (coReviewDepartmentId === String(incident.department_id || '')) {
        throw new BadRequestException('กรุณาเลือกหน่วยงานอื่นที่ไม่ใช่หน่วยงานต้นทาง');
      }
      const destination = await this.prisma.department.findUnique({
        where: { id: Number(coReviewDepartmentId) },
        select: { id: true },
      });
      if (!destination) throw new BadRequestException('ไม่พบหน่วยงานที่เลือกสำหรับทบทวนเพิ่มเติม');
    }
    if (learningAction === 'SEND_RCA') {
      this.assertPermission(permissions.canForward, 'ไม่มีสิทธิ์ส่งเรื่องเข้าศูนย์ RCA');
      if (!incident.nrls_code) throw new BadRequestException('ต้องยืนยันรหัสมาตรฐาน NRLS ก่อนส่งเรื่องเข้าศูนย์ RCA');
    }
    const decision = String(reviewDto.decision || 'SUBMIT').toUpperCase();
    if (reviewRole !== 'RM' && decision !== 'SUBMIT') {
      throw new ForbiddenException('เฉพาะ RM เท่านั้นที่บันทึกผล ACCEPT หรือ RETURN ได้');
    }
    if (decision === 'RETURN' && String(reviewDto.returned_reason || '').trim().length < 10) {
      throw new BadRequestException('กรุณาระบุเหตุผลส่งกลับอย่างน้อย 10 ตัวอักษร');
    }
    const reviewStatus = decision === 'ACCEPT' ? 'ACCEPTED' : decision === 'RETURN' ? 'RETURNED' : 'SUBMITTED';

    const actorId = this.getUserId(user);
    let queuedRcaCaseId: string | null = null;
    const createdReview = await this.prisma.$transaction(async (tx) => {
      const review = await tx.riskreview.create({
        data: {
          riskregister_id: id,
          risk_id: incident.id_risk,
          riskvisit: `REV-${Date.now().toString().slice(-10)}`,
          review_date: new Date(reviewDto.review_date || new Date()),
          notereview: note,
          cause_problem: reviewDto.cause_problem?.trim() || null,
          contributing_factors: serializedContributingFactors,
          department_outcome: departmentOutcome,
          forwarding_purpose: forwardingPurpose,
          forwarded_department_id: coReviewDepartmentId,
          files: reviewAttachments.length ? JSON.stringify(reviewAttachments) : null,
          reviewresults_id: reviewResultId,
          status_risk: 'ทบทวน',
          created_by: actorId || 1,
          create_date: new Date(),
          modify_date: new Date(),
          count: 1,
        },
      });

      const structured = await (tx as any).incident_review_entry.create({
        data: {
          incident_id: incident.id,
          incident_id_risk: incident.id_risk,
          review_role: reviewRole,
          review_status: reviewStatus,
          reviewer_user_id: actorId,
          reviewer_member_cid: user?.cid || null,
          reviewer_department_id: user?.departmentId ? String(user.departmentId) : null,
          reviewer_team_id: user?.teamId ? Number(user.teamId) : null,
          findings: note,
          recommendation: reviewDto.recommendation?.trim() || null,
          decision,
          returned_reason: reviewDto.returned_reason?.trim() || null,
          department_outcome: departmentOutcome,
          forwarding_purpose: forwardingPurpose,
          forwarded_department_id: coReviewDepartmentId,
          submitted_at: new Date(reviewDto.review_date || new Date()),
          accepted_at: decision === 'ACCEPT' ? new Date() : null,
          accepted_by: decision === 'ACCEPT' ? actorId : null,
        },
      });

      const incidentUpdateData: any = {
        status_risk: 'ทบทวน',
        department_review_outcome: departmentOutcome,
        review_forwarding_purpose: forwardingPurpose,
        modify_date: new Date(),
        updated_by: actorId || 1,
      };

      if (forwardingPurpose !== 'NONE' && coReviewDepartmentId) {
        incidentUpdateData.sendto_department_id = coReviewDepartmentId;
        incidentUpdateData.refer_type = '1';
        incidentUpdateData.send_date = new Date();
        incidentUpdateData.send_use = user?.name || 'ผู้ทบทวนความเสี่ยง';
        incidentUpdateData.note = note;
      }

      if (learningAction === 'SEND_RCA') {
        const existingRca = await tx.standard_rca_case.findFirst({
          where: { incident_id: incident.id },
          select: { id: true, status: true, completed_at: true },
        });
        queuedRcaCaseId = existingRca?.id
          || `RCA-FULL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${incident.id}`;

        if (!existingRca) {
          await tx.standard_rca_case.create({
            data: {
              id: queuedRcaCaseId,
              rm_no: String(incident.id_risk || incident.id),
              incident_id: incident.id,
              incident_id_risk: incident.id_risk,
              topic: String(incident.nrls_name_snapshot || incident.detail || `อุบัติการณ์ #${incident.id}`).slice(0, 255),
              incident_date: incident.date_report,
              rca_team: 'รอศูนย์ RCA รับเรื่อง',
              severity: incident.level_id,
              nrls_code: incident.nrls_code,
              nrls_name_snapshot: incident.nrls_name_snapshot,
              program_id: incident.program_id,
              department_id: incident.department_id,
              due_at: incident.rca_due_at,
              what_happened: incident.detail,
              actual_impact: incident.problem_basic,
              contributing_factors: serializedContributingFactors,
              status: 'PENDING',
              created_by: actorId || 1,
            },
          });
        }

        incidentUpdateData.rca_required = true;
        incidentUpdateData.rca_status = existingRca?.status === 'COMPLETED' && existingRca.completed_at
          ? 'COMPLETED'
          : 'REQUIRED';
        incidentUpdateData.rca_case_id = queuedRcaCaseId;
        incidentUpdateData.recommended_rca_type = 'FULL';
      }

      await tx.riskregister.updateMany({
        where: { id, id_risk: incident.id_risk },
        data: incidentUpdateData,
      });
      await tx.workflow_audit.create({
        data: {
          entity_type: 'INCIDENT',
          entity_id: String(id),
          action: 'REVIEW_RECORDED',
          old_value: JSON.stringify({ status_risk: incident.status_risk || 'ตรวจสอบ' }),
          new_value: JSON.stringify({
            status_risk: incidentUpdateData.status_risk,
            review_id: review.id,
            structured_review_id: structured.id,
            review_role: reviewRole,
            review_status: reviewStatus,
            learning_action: learningAction,
            reviewresults_id: reviewResultId,
            department_outcome: departmentOutcome,
            forwarding_purpose: forwardingPurpose,
            forwarded_department_id: coReviewDepartmentId,
            rca_case_id: queuedRcaCaseId,
            co_review_department_id: coReviewDepartmentId,
            attachment_count: reviewAttachments.length,
          }),
          reason: note,
          changed_by: actorId,
        },
      });
      if (reviewRole === 'OWNER') {
        await (tx as any).sla_instance.updateMany({
          where: {
            entity_type: 'INCIDENT',
            entity_id: String(id),
            workflow_stage: 'REVIEW_OWNER',
            status: 'ACTIVE',
          },
          data: { status: 'COMPLETED', completed_at: new Date(), updated_at: new Date() },
        });
      }
      return {
        ...review,
        structured_review: structured,
        learning_action: learningAction,
        department_outcome: departmentOutcome,
        forwarding_purpose: forwardingPurpose,
        forwarded_department_id: coReviewDepartmentId,
        incident_status: incidentUpdateData.status_risk,
        rca_case_id: queuedRcaCaseId,
        co_review_department_id: coReviewDepartmentId,
      };
    });

    return createdReview;
  }

  async updateReviewOutcome(
    id: number,
    body: { review_id: number; structured_review_id: number; department_outcome: string },
    user?: any,
  ) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    const permissions = await this.getIncidentPermissions(user, incident);
    const canRecordOutcome = permissions.canReview
      || permissions.canTeamReview
      || (this.isRmCommittee(user) && await this.isInManagementScope(user, incident));
    this.assertPermission(canRecordOutcome, 'ไม่มีสิทธิ์บันทึกผลการดำเนินการระดับหน่วยงาน');

    const reviewId = Number(body.review_id);
    const structuredReviewId = Number(body.structured_review_id);
    if (!Number.isInteger(reviewId) || reviewId < 1 || !Number.isInteger(structuredReviewId) || structuredReviewId < 1) {
      throw new BadRequestException('ไม่พบรายการทบทวนที่ต้องการบันทึกผล');
    }
    const departmentOutcome = String(body.department_outcome || '').trim().toUpperCase();
    if (!['IN_PROGRESS', 'RESOLVED', 'UNRESOLVED'].includes(departmentOutcome)) {
      throw new BadRequestException('ผลการดำเนินการแก้ไขปัญหาระดับหน่วยงานไม่ถูกต้อง');
    }
    const severity = String(incident.level_id || '').trim().toUpperCase();
    if (['A', 'B', '1'].includes(severity) && departmentOutcome === 'UNRESOLVED') {
      throw new BadRequestException('อุบัติการณ์ระดับ A–B หรือ 1 เลือกได้เฉพาะอยู่ระหว่างดำเนินการหรือยุติปัญหาได้');
    }

    const [review, structuredReview] = await Promise.all([
      this.prisma.riskreview.findFirst({
        where: { id: reviewId, riskregister_id: id },
        select: { id: true, created_by: true, department_outcome: true },
      }),
      (this.prisma as any).incident_review_entry.findFirst({
        where: { id: structuredReviewId, incident_id: id, incident_id_risk: incident.id_risk },
        select: { id: true, reviewer_user_id: true },
      }),
    ]);
    if (!review || !structuredReview) throw new NotFoundException('ไม่พบผลการทบทวนที่เพิ่งบันทึก');
    const actorId = this.getUserId(user);
    if (!this.isRmCommittee(user) && (
      Number(review.created_by || 0) !== Number(actorId || 0)
      || Number(structuredReview.reviewer_user_id || 0) !== Number(actorId || 0)
    )) {
      throw new ForbiddenException('บันทึกผลการดำเนินการได้เฉพาะรายการทบทวนของตนเอง');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.riskreview.updateMany({
        where: { id: reviewId, riskregister_id: id },
        data: { department_outcome: departmentOutcome, updated_by: actorId || 1, modify_date: new Date() },
      });
      await (tx as any).incident_review_entry.updateMany({
        where: { id: structuredReviewId, incident_id: id, incident_id_risk: incident.id_risk },
        data: { department_outcome: departmentOutcome },
      });
      await tx.riskregister.updateMany({
        where: { id, id_risk: incident.id_risk },
        data: { department_review_outcome: departmentOutcome, modify_date: new Date(), updated_by: actorId || 1 },
      });
      await tx.workflow_audit.create({
        data: {
          entity_type: 'INCIDENT',
          entity_id: String(id),
          action: 'DEPARTMENT_OUTCOME_RECORDED',
          old_value: JSON.stringify({ department_outcome: review.department_outcome || null }),
          new_value: JSON.stringify({ department_outcome: departmentOutcome, review_id: reviewId }),
          reason: 'บันทึกผลการดำเนินการระดับหน่วยงานจากหน้าสรุปผลการทบทวน',
          changed_by: actorId,
        },
      });
    });
    return { department_outcome: departmentOutcome, review_id: reviewId, structured_review_id: structuredReviewId };
  }

  async sendReviewToRca(id: number, user?: any, request: { direct?: boolean; reason?: string } = {}) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    const permissions = await this.getIncidentPermissions(user, incident);
    this.assertPermission(permissions.canForward, 'ไม่มีสิทธิ์ส่งเรื่องเข้าศูนย์ RCA');
    if (!['ตรวจสอบ', 'ทบทวน'].includes(String(incident.status_risk || ''))) {
      throw new BadRequestException('ต้องยืนยันความเสี่ยงก่อนส่งเข้าศูนย์ RCA');
    }
    const direct = request.direct === true;
    const reason = String(request.reason || '').trim();
    if (direct && (reason.length < 10 || reason.length > 2000)) {
      throw new BadRequestException('กรุณาระบุเหตุผลส่งเข้าศูนย์ RCA 10–2000 ตัวอักษร');
    }
    if (!incident.nrls_code) throw new BadRequestException('ต้องยืนยันรหัสมาตรฐาน NRLS ก่อนส่งเรื่องเข้าศูนย์ RCA');
    if (['จำหน่าย', 'ไม่ใช่ความเสี่ยง'].includes(String(incident.status_risk || ''))) {
      throw new BadRequestException('เคสนี้สิ้นสุดแล้ว ไม่สามารถส่งเข้าศูนย์ RCA ได้');
    }

    const latestReview = await this.prisma.riskreview.findFirst({
      where: { riskregister_id: id },
      orderBy: [{ review_date: 'desc' }, { id: 'desc' }],
      select: { id: true, contributing_factors: true },
    });
    if (!latestReview && !direct) throw new BadRequestException('กรุณาบันทึกผลการทบทวนก่อนส่งเรื่องเข้าศูนย์ RCA');

    const actorId = this.getUserId(user);
    return this.prisma.$transaction(async (tx) => {
      const existingRca = await tx.standard_rca_case.findFirst({
        where: { incident_id: incident.id },
        select: { id: true, status: true, completed_at: true },
      });
      if (existingRca && ['CANCELLED', 'COMPLETED'].includes(String(existingRca.status || ''))) {
        throw new BadRequestException('เอกสาร RCA เดิมสิ้นสุดแล้ว กรุณาตรวจประวัติก่อนเปิดทบทวนใหม่');
      }
      const caseId = existingRca?.id
        || `RCA-FULL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${incident.id}`;

      if (!existingRca) {
        await tx.standard_rca_case.create({
          data: {
            id: caseId,
            rm_no: String(incident.id_risk || incident.id),
            incident_id: incident.id,
            incident_id_risk: incident.id_risk,
            topic: String(incident.nrls_name_snapshot || incident.detail || `อุบัติการณ์ #${incident.id}`).slice(0, 255),
            incident_date: incident.date_report,
            rca_team: 'รอศูนย์ RCA รับเรื่อง',
            severity: incident.level_id,
            nrls_code: incident.nrls_code,
            nrls_name_snapshot: incident.nrls_name_snapshot,
            program_id: incident.program_id,
            department_id: incident.department_id,
            due_at: incident.rca_due_at,
            what_happened: incident.detail,
            actual_impact: incident.problem_basic,
            contributing_factors: latestReview?.contributing_factors || null,
            status: 'PENDING',
            created_by: actorId || 1,
          },
        });
      }

      const rcaStatus = existingRca?.status === 'COMPLETED' && existingRca.completed_at
        ? 'COMPLETED'
        : 'REQUIRED';
      await tx.riskregister.updateMany({
        where: { id, id_risk: incident.id_risk },
        data: {
          status_risk: 'ทบทวน',
          rca_required: true,
          rca_status: rcaStatus,
          rca_case_id: caseId,
          recommended_rca_type: 'FULL',
          modify_date: new Date(),
          updated_by: actorId || 1,
        },
      });
      await tx.workflow_audit.create({
        data: {
          entity_type: 'INCIDENT',
          entity_id: String(id),
          action: direct ? 'RCA_QUEUED_DIRECTLY' : 'RCA_QUEUED_FROM_REVIEW_SUMMARY',
          old_value: JSON.stringify({ rca_status: incident.rca_status || null }),
          new_value: JSON.stringify({ rca_status: rcaStatus, rca_case_id: caseId, review_id: latestReview?.id || null, direct }),
          reason: direct ? reason : 'ส่งเรื่องเข้าศูนย์ RCA จากหน้าทบทวน',
          changed_by: actorId,
        },
      });
      return { rca_case_id: caseId, rca_status: rcaStatus, already_existed: Boolean(existingRca) };
    });
  }

  async forwardIncident(id: number, forwardDto: { sendto_team_id?: number; sendto_department_id?: string; refer_type?: string; note?: string }, user?: any) {
    const incident = await this.prisma.riskregister.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');
    const permissions = await this.getIncidentPermissions(user, incident);
    this.assertPermission(permissions.canForward, 'ไม่มีสิทธิ์ส่งต่ออุบัติการณ์นี้');
    if (incident.status_risk !== 'ทบทวน') {
      throw new BadRequestException('ต้องบันทึกผลการทบทวนของหน่วยงานก่อนส่งต่อ');
    }
    if (!forwardDto.sendto_team_id && !forwardDto.sendto_department_id) {
      throw new BadRequestException('กรุณาเลือกทีมนำหรือหน่วยงานปลายทาง');
    }
    if (forwardDto.sendto_team_id && incident.status_risk !== 'ทบทวน') {
      throw new BadRequestException('ต้องบันทึกผลการทบทวนของหน่วยงานให้เหตุการณ์อยู่สถานะ “ทบทวน” ก่อนส่งให้ทีมนำ');
    }

    const referType = forwardDto.refer_type || (forwardDto.sendto_team_id ? '2' : '1');
    const updateData: any = {
      sendto_team_id: forwardDto.sendto_team_id ? Number(forwardDto.sendto_team_id) : null,
      sendto_department_id: forwardDto.sendto_department_id ? forwardDto.sendto_department_id.toString() : null,
      team_review_status: forwardDto.sendto_team_id ? 'PENDING' : null,
      team_review_started_at: null,
      team_review_completed_at: null,
      team_reviewed_by: null,
      refer_type: referType,
      send_date: new Date(),
      send_use: user?.name || 'ผู้ประสานงานความเสี่ยง',
      note: forwardDto.note || null,
      modify_date: new Date(),
      updated_by: this.getUserId(user) || 1,
    };

    await this.prisma.riskregister.updateMany({
      where: { id, id_risk: incident.id_risk },
      data: updateData,
    });

    // Determine destination target name for audit log
    let targetName = 'ทีมนำ / หน่วยงานที่เกี่ยวข้อง';
    if (forwardDto.sendto_team_id) {
      const team = await this.prisma.team.findUnique({
        where: { id: Number(forwardDto.sendto_team_id) }
      });
      if (team) targetName = `ทีมนำ: ${team.team_name}`;
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
        created_by: this.getUserId(user) || 1,
        create_date: new Date(),
        modify_date: new Date(),
        count: 1,
      }
    });

    return this.findOne(id, user);
  }

  async getRiskMatrixStats(query?: any, user?: any) {
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
      where: await this.scopeIncidentWhere(where, user),
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

  async getDecisionSupport(query: any, user: any) {
    const now = new Date();
    const period = analyticsPeriod(query.days, now);
    const department = query.department_id && query.department_id !== 'all' ? String(query.department_id) : undefined;
    const scope = await this.scopeIncidentWhere(department ? { department_id: department } : {}, user);
    // All visible dates are needed for open RCA/CAPA; never retrieve narratives or identifiers.
    const incidents = await this.prisma.riskregister.findMany({ where: scope, select: {
      id: true, id_risk: true, date_report: true, department_id: true, nrls_code: true,
      classification_status: true, level_id: true, rca_required: true, rca_status: true, rca_due_at: true,
    } });
    const allowed = await this.getVisibleReportDepartmentIds(user);
    const profileWhere: any = { status: { not: 'closed' } };
    if (allowed) profileWhere.department_id = { in: allowed.map(String) };
    if (department) profileWhere.AND = [{ department_id: department }];
    const [profiles, departments, names] = await Promise.all([
      this.prisma.riskanalysis.findMany({ where: profileWhere, select: {
        id: true, risk_title: true, nrls_code: true, department_id: true, scope_level: true, source: true,
        is_never_event: true, initial_risk_level: true, next_review_date: true, risk_owner_name: true,
        reviews: { orderBy: [{ review_date: 'desc' }, { id: 'desc' }], take: 1, select: { current_risk_level: true } },
      } }),
      this.prisma.department.findMany({ select: { id: true, depart_name: true } }),
      this.prisma.nRLS_riskstore.findMany({ select: { nrls_code: true, name: true } }),
    ]);
    const capas: Array<{ id: number; incident_id: number; nrls_code: string; status: string; due_date: Date | null; effectiveness_status: string; effectiveness_due_date: Date | null; completed_at: Date | null }> = [];
    // Match both parts of the incident identity; bound each SQL parameter list.
    for (let offset = 0; offset < incidents.length; offset += 500) {
      capas.push(...await this.prisma.capa_action.findMany({ where: {
        OR: incidents.slice(offset, offset + 500).map(i => ({ incident_id: i.id, incident_id_risk: i.id_risk })),
        status: { not: 'CANCELLED' },
      }, select: { id: true, incident_id: true, nrls_code: true, status: true, due_date: true, effectiveness_status: true, effectiveness_due_date: true, completed_at: true } }));
    }
    const signals = summarizeSignals(incidents, period);
    const nameMap = new Map(names.map(r => [r.nrls_code, r.name]));
    const deptMap = new Map(departments.map(d => [String(d.id), d.depart_name]));
    const rca = incidents.filter(i => (i.rca_required || ['PENDING', 'IN_PROGRESS'].includes(i.rca_status?.toUpperCase() || '')) && i.rca_status?.toUpperCase() !== 'COMPLETED');
    const overdueRca = rca.filter(i => i.rca_due_at && i.rca_due_at < now);
    const pendingCapa = capas.filter(c => c.status !== 'CLOSED');
    const overdueCapa = pendingCapa.filter(c => !c.completed_at && c.due_date && c.due_date < period.end);
    const followup = profiles.map(p => {
      const count = p.nrls_code && p.scope_level !== 'group' ? signals.current.filter(i => i.classification_status === 'CONFIRMED' && i.nrls_code === p.nrls_code && (p.scope_level === 'hospital' || i.department_id === p.department_id)).length : null;
      const level = p.reviews[0]?.current_risk_level || p.initial_risk_level;
      const reasons = [p.is_never_event ? 'Never Event' : '', ['red', 'orange'].includes(level) ? 'ความเสี่ยงคงเหลือสูง' : '',
        p.next_review_date && p.next_review_date < period.end ? 'เกินกำหนดทบทวน' : '', !p.next_review_date ? 'ยังไม่มีกำหนดทบทวน' : ''].filter(Boolean);
      return { id: p.id, title: p.risk_title, code: p.nrls_code, owner: p.risk_owner_name, count, reasons, nextReview: p.next_review_date, assessed: !!p.reviews.length };
    }).filter(p => p.reasons.length).sort((a, b) => b.reasons.length - a.reasons.length || a.id - b.id);
    return {
      generatedAt: now, period, scope: department ? deptMap.get(department) || 'หน่วยงานที่เลือก' : allowed ? 'เฉพาะข้อมูลตามสิทธิ์ของคุณ' : 'ทั้งโรงพยาบาล',
      summary: signals.summary,
      proactive: { count: profiles.filter(p => ['FMEA', 'Safety Walkround', 'Proactive Risk Assessment'].includes(p.source || '')).length, total: profiles.length },
      priorities: signals.priorities.map(p => ({ ...p, name: nameMap.get(p.code) || p.code,
        departments: p.departments.map(d => ({ ...d, name: deptMap.get(d.id) || d.id })),
      })),
      departments: [...new Set([...signals.current, ...rca].map(i => i.department_id))].map(id => ({ id, name: deptMap.get(id) || id,
        total: signals.current.filter(i => i.department_id === id).length,
        severe: signals.current.filter(i => i.department_id === id && ['G', 'H', 'I', '4', '5'].includes(i.level_id)).length,
        rca: rca.filter(i => i.department_id === id).length,
      })).sort((a, b) => b.severe - a.severe || b.rca - a.rca || b.total - a.total),
      backlog: { rca: rca.length, overdueRca: overdueRca.length, capa: pendingCapa.length, overdueCapa: overdueCapa.length,
        rcaItems: rca.map(i => ({ id: i.id, code: i.nrls_code, due: i.rca_due_at, overdue: !!i.rca_due_at && i.rca_due_at < now })),
        capaItems: pendingCapa.map(c => ({ id: c.id, incidentId: c.incident_id, code: c.nrls_code, status: c.status,
          due: c.due_date, overdue: !c.completed_at && !!c.due_date && c.due_date < period.end,
          effectivenessStatus: c.effectiveness_status, effectivenessDue: c.effectiveness_due_date,
          effectivenessOverdue: !!c.effectiveness_due_date && c.effectiveness_due_date < period.end
            && !['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE'].includes(c.effectiveness_status),
        })),
      },
      effectiveness: { total: capas.length, effective: capas.filter(c => c.effectiveness_status === 'EFFECTIVE').length,
        partial: capas.filter(c => c.effectiveness_status === 'PARTIALLY_EFFECTIVE').length,
        ineffective: capas.filter(c => c.effectiveness_status === 'INEFFECTIVE').length,
        unassessed: capas.filter(c => !['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE'].includes(c.effectiveness_status)).length,
        overdue: pendingCapa.filter(c => c.effectiveness_due_date && c.effectiveness_due_date < period.end && !['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE'].includes(c.effectiveness_status)).length,
        items: capas.map(c => ({ id: c.id, code: c.nrls_code, status: c.effectiveness_status,
          due: c.effectiveness_due_date, overdue: !!c.effectiveness_due_date && c.effectiveness_due_date < period.end
            && !['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE'].includes(c.effectiveness_status),
        })),
      }, followup,
    };
  }

  async getReportAnalytics(query?: any, user?: any) {
    const where: any = {};
    if (query?.department_id) where.department_id = query.department_id.toString();
    if (query?.startDate || query?.endDate) {
      where.date_report = {};
      if (query.startDate) where.date_report.gte = new Date(query.startDate);
      if (query.endDate) where.date_report.lte = new Date(query.endDate);
    }

    const scopedWhere = await this.scopeIncidentWhere(where, user);
    const [byStatusGroups, byLevelGroups, allIncidents, departments, programs] = await Promise.all([
      this.prisma.riskregister.groupBy({
        by: ['status_risk'],
        where: scopedWhere,
        _count: { _all: true },
      }),
      this.prisma.riskregister.groupBy({
        by: ['level_id'],
        where: scopedWhere,
        _count: { _all: true },
        orderBy: { _count: { level_id: 'desc' } },
      }),
      this.prisma.riskregister.findMany({
        where: scopedWhere,
        select: {
          id: true,
          date_report: true,
          level_id: true,
          program_id: true,
          department_id: true,
          user_ir_type: true,
        },
        orderBy: { id: 'desc' }
      }),
      this.prisma.department.findMany({ select: { id: true, depart_name: true } }),
      this.prisma.program.findMany({ select: { program_id: true, program_name: true } }),
    ]);

    const deptMap = new Map(departments.map(d => [d.id.toString(), d.depart_name]));
    const progMap = new Map(programs.map(p => [p.program_id, p.program_name]));
    const byStatusRaw = byStatusGroups.map((item: any) => ({
      status_risk: item.status_risk,
      count: item._count._all,
    }));
    const byLevelRaw = byLevelGroups.map((item: any) => ({
      level_id: item.level_id,
      count: item._count._all,
    }));

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

  async getRiskRegister(query?: any, user?: any) {
    const where: any = {};
    if (query?.department_id) where.department_id = query.department_id.toString();
    if (query?.startDate || query?.endDate) {
      where.date_report = {};
      if (query.startDate) where.date_report.gte = new Date(query.startDate);
      if (query.endDate) where.date_report.lte = new Date(query.endDate);
    }

    const incidents = await this.prisma.riskregister.findMany({
      where: await this.scopeIncidentWhere(where, user),
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

  async remove(
    id: number,
    deletion: { duplicate_of_incident_id: number; reason: string },
    user?: any,
  ) {
    this.assertPermission(this.isAdmin(user), 'เฉพาะผู้ดูแลระบบเท่านั้นที่ทำ Safe Delete ได้');
    const reason = String(deletion?.reason || '').trim();
    if (reason.length < 10) throw new BadRequestException('กรุณาระบุเหตุผลการลบอย่างน้อย 10 ตัวอักษร');

    const duplicateOfId = Number(deletion?.duplicate_of_incident_id);
    if (!Number.isInteger(duplicateOfId) || duplicateOfId <= 0 || duplicateOfId === id) {
      throw new BadRequestException('กรุณาระบุรหัสรายการต้นฉบับที่ซ้ำให้ถูกต้อง');
    }

    const [incident, original] = await Promise.all([
      this.prisma.riskregister.findFirst({ where: { id } }),
      this.prisma.riskregister.findFirst({ where: { id: duplicateOfId } }),
    ]);
    if (!incident) throw new NotFoundException(`ไม่พบรายงานอุบัติการณ์รหัส #${id}`);
    if (!original) throw new NotFoundException(`ไม่พบรายการต้นฉบับที่อ้างว่าเป็นรายการซ้ำ #${duplicateOfId}`);

    if (!['ตรวจสอบ', 'ทบทวน'].includes(String(incident.status_risk || ''))) {
      throw new BadRequestException('Safe Delete ทำได้เฉพาะรายการที่ยืนยันแล้วและอยู่ระหว่างรอตรวจสอบ/ทบทวน');
    }

    const confirmedAt = incident.classified_at || incident.send_date;
    const now = new Date();
    if (!confirmedAt
      || confirmedAt.getFullYear() !== now.getFullYear()
      || confirmedAt.getMonth() !== now.getMonth()) {
      throw new BadRequestException('ลบได้เฉพาะรายการที่ยืนยันภายในเดือนปัจจุบัน ตามนโยบาย Safe Delete');
    }

    const sameEventDate = new Date(incident.date_report).toISOString().slice(0, 10)
      === new Date(original.date_report).toISOString().slice(0, 10);
    const sameDepartment = String(incident.department_id) === String(original.department_id);
    const sameClassification = incident.nrls_code && original.nrls_code
      ? String(incident.nrls_code) === String(original.nrls_code)
      : Boolean(incident.riskstore_id && original.riskstore_id
        && Number(incident.riskstore_id) === Number(original.riskstore_id));
    if (!sameEventDate || !sameDepartment || !sameClassification) {
      throw new BadRequestException(
        'ข้อมูลไม่ตรงกับรายการต้นฉบับ: วันเกิดเหตุ หน่วยงานต้นทาง และประเภทความเสี่ยงต้องตรงกันก่อนลบรายการซ้ำ',
      );
    }

    const [reviewCount, miniRcaCount, standardRcaCount, capaCount] = await Promise.all([
      this.prisma.riskreview.count({ where: { riskregister_id: id, status_risk: 'ทบทวน' } }),
      this.prisma.rca_case.count({ where: { incident_id: id } }),
      this.prisma.standard_rca_case.count({ where: { incident_id: id } }),
      this.prisma.capa_action.count({ where: { incident_id: id } }),
    ]);
    if (reviewCount + miniRcaCount + standardRcaCount + capaCount > 0) {
      throw new BadRequestException('รายการนี้มีผลทบทวน RCA หรือมาตรการแก้ไขแล้ว จึงห้ามลบและต้องใช้การแก้ไขข้อมูลแทน');
    }

    const actorId = this.getUserId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.workflow_audit.create({
        data: {
          entity_type: 'INCIDENT',
          entity_id: String(id),
          action: 'SAFE_DELETE_DUPLICATE',
          old_value: JSON.stringify({
            id: incident.id,
            id_risk: incident.id_risk,
            date_report: incident.date_report,
            department_id: incident.department_id,
            sendto_department_id: incident.sendto_department_id,
            nrls_code: incident.nrls_code,
            riskstore_id: incident.riskstore_id,
            level_id: incident.level_id,
            status_risk: incident.status_risk,
          }),
          new_value: JSON.stringify({ duplicate_of_incident_id: duplicateOfId }),
          reason,
          changed_by: actorId,
        },
      });
      await tx.riskreview.deleteMany({ where: { riskregister_id: id } });
      await tx.incident_classification_audit.deleteMany({ where: { incident_id: id } });
      await tx.riskregister.deleteMany({ where: { id } });
    });
    return {
      success: true,
      message: `ลบรายการซ้ำ #${id} สำเร็จ โดยเก็บ Audit อ้างอิงรายการต้นฉบับ #${duplicateOfId}`,
    };
  }

  async getIndividualMonthlyStats(query?: {
    department_group_id?: number;
    department_id?: number;
    year?: number;
    year_type?: string;
  }, user?: any) {
    const currentYear = new Date().getFullYear();
    const targetYear = query?.year || currentYear;
    const yearType = query?.year_type || 'calendar';

    const deptWhere: any = {};
    if (query?.department_id) {
      deptWhere.id = Number(query.department_id);
    } else if (query?.department_group_id) {
      deptWhere.depart_group_id = Number(query.department_group_id);
    }
    const visibleDepartmentIds = await this.getVisibleReportDepartmentIds(user);
    if (visibleDepartmentIds !== null) {
      if (deptWhere.id !== undefined && !visibleDepartmentIds.includes(Number(deptWhere.id))) {
        deptWhere.id = -1;
      } else if (deptWhere.id === undefined) {
        deptWhere.id = { in: visibleDepartmentIds };
      }
    }

    const departments = await this.prisma.department.findMany({
      where: deptWhere,
      select: { id: true, depart_name: true, depart_group_id: true },
      orderBy: { depart_name: 'asc' },
    });

    const deptIds = departments.map((d) => d.id);
    const deptMap = new Map(departments.map((d) => [d.id, d.depart_name]));

    const [groups, positions] = await Promise.all([
      this.prisma.departmentgroup.findMany(),
      this.prisma.position.findMany(),
    ]);

    const groupMap = new Map(groups.map((g) => [g.id, g.depart_group_name]));
    const positionMap = new Map(positions.map((p) => [p.id, p.position_name]));

    const memberWhere: any = { status: '1' };
    memberWhere.department_id1 = { in: deptIds };

    const members = await this.prisma.member.findMany({
      where: memberWhere,
      select: {
        id: true,
        cid: true,
        member_name: true,
        department_id1: true,
        position_id: true,
        status: true,
      },
      orderBy: { member_name: 'asc' },
    });

    const cids = members.map((m) => m.cid).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { cid: { in: cids } },
      select: { id: true, cid: true, username: true },
    });

    const cidToUserIdMap = new Map(users.map((u) => [u.cid, u.id]));
    const userIdToMemberMap = new Map<number, typeof members[0]>();
    members.forEach((m) => {
      const uId = cidToUserIdMap.get(m.cid);
      if (uId) {
        userIdToMemberMap.set(uId, m);
      }
    });

    const userIds = Array.from(userIdToMemberMap.keys());

    let startDate: Date;
    let endDate: Date;
    if (yearType === 'fiscal') {
      startDate = new Date(`${targetYear - 1}-10-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-09-30T23:59:59.999Z`);
    } else {
      startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);
    }

    const individualIncidentWhere = {
        date_report: {
          gte: startDate,
          lte: endDate,
        },
        ...(userIds.length > 0
          ? {
              OR: [
                { created_by: { in: userIds } },
                ...(deptIds.length > 0
                  ? [{ department_id: { in: deptIds.map((id) => id.toString()) } }]
                  : []),
              ],
            }
          : deptIds.length > 0
          ? { department_id: { in: deptIds.map((id) => id.toString()) } }
          : { department_id: { in: [] } }),
      };
    const incidents = await this.prisma.riskregister.findMany({
      where: await this.scopeIncidentWhere(individualIncidentWhere, user),
      select: {
        id: true,
        created_by: true,
        user_ir: true,
        date_report: true,
        department_id: true,
      },
    });

    const monthsOrder =
      yearType === 'fiscal'
        ? [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const memberStatsMap = new Map<number, any>();

    members.forEach((m) => {
      const deptName = deptMap.get(m.department_id1) || `แผนก ${m.department_id1}`;
      const deptObj = departments.find((d) => d.id === m.department_id1);
      const groupName = deptObj ? groupMap.get(deptObj.depart_group_id || 0) || '-' : '-';
      const posName = positionMap.get(m.position_id) || 'เจ้าหน้าที่';

      const monthlyCounts: Record<number, number> = {};
      monthsOrder.forEach((mNum) => {
        monthlyCounts[mNum] = 0;
      });

      memberStatsMap.set(m.id, {
        member_id: m.id,
        member_name: m.member_name,
        cid: m.cid,
        position_name: posName,
        department_id: m.department_id1,
        department_name: deptName,
        department_group_name: groupName,
        monthly_counts: monthlyCounts,
        total_count: 0,
      });
    });

    let totalIncidents = 0;
    incidents.forEach((inc) => {
      totalIncidents++;
      const rDate = new Date(inc.date_report);
      const mNum = rDate.getMonth() + 1;

      const m = inc.created_by ? userIdToMemberMap.get(inc.created_by) : null;
      if (m && memberStatsMap.has(m.id)) {
        const stat = memberStatsMap.get(m.id);
        if (stat.monthly_counts[mNum] !== undefined) {
          stat.monthly_counts[mNum] += 1;
          stat.total_count += 1;
        }
      }
    });

    const memberStats = Array.from(memberStatsMap.values()).sort(
      (a, b) => b.total_count - a.total_count || a.member_name.localeCompare(b.member_name, 'th')
    );

    const earliestRecord = await this.prisma.riskregister.findFirst({
      orderBy: { date_report: 'asc' },
      select: { date_report: true },
    });

    const yearsList: number[] = [];
    const minYear = earliestRecord?.date_report ? new Date(earliestRecord.date_report).getFullYear() : 2020;
    for (let y = currentYear; y >= Math.min(minYear, 2020); y--) {
      yearsList.push(y);
    }

    return {
      year: targetYear,
      year_type: yearType,
      yearsList,
      monthsOrder,
      summary: {
        totalMembers: members.length,
        totalIncidents,
        activeReportersCount: memberStats.filter((m) => m.total_count > 0).length,
        topReporter: memberStats.length > 0 && memberStats[0].total_count > 0 ? memberStats[0] : null,
      },
      memberStats,
    };
  }

  async getDepartmentMonthlyStats(query?: {
    department_group_id?: number;
    year?: number;
    year_type?: string;
  }, user?: any) {
    const [latestRecord, earliestRecord] = await Promise.all([
      this.prisma.riskregister.findFirst({
        orderBy: { date_report: 'desc' },
        select: { date_report: true },
      }),
      this.prisma.riskregister.findFirst({
        orderBy: { date_report: 'asc' },
        select: { date_report: true },
      }),
    ]);

    const currentYear = new Date().getFullYear();
    const maxYear = latestRecord?.date_report ? new Date(latestRecord.date_report).getFullYear() : currentYear;
    const targetYear = query?.year || maxYear;
    const yearType = query?.year_type || 'fiscal';

    const deptWhere: any = {};
    if (query?.department_group_id) {
      deptWhere.depart_group_id = Number(query.department_group_id);
    }
    const visibleDepartmentIds = await this.getVisibleReportDepartmentIds(user);
    if (visibleDepartmentIds !== null) deptWhere.id = { in: visibleDepartmentIds };

    const [departments, groups] = await Promise.all([
      this.prisma.department.findMany({
        where: deptWhere,
        select: { id: true, depart_name: true, depart_group_id: true },
        orderBy: { depart_name: 'asc' },
      }),
      this.prisma.departmentgroup.findMany(),
    ]);

    const groupMap = new Map(groups.map((g) => [g.id, g.depart_group_name]));
    const totalDepartmentsCount = departments.length;

    let startDate: Date;
    let endDate: Date;
    if (yearType === 'fiscal') {
      startDate = new Date(`${targetYear - 1}-10-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-09-30T23:59:59.999Z`);
    } else {
      startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);
    }

    const deptIds = departments.map((d) => d.id);
    const deptStringIds = deptIds.map((id) => id.toString());

    const departmentIncidentWhere = {
        date_report: {
          gte: startDate,
          lte: endDate,
        },
        department_id: { in: deptStringIds },
      };
    const incidents = await this.prisma.riskregister.findMany({
      where: await this.scopeIncidentWhere(departmentIncidentWhere, user),
      select: {
        id: true,
        date_report: true,
        department_id: true,
      },
    });

    const monthsOrder =
      yearType === 'fiscal'
        ? [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const monthNamesMap: Record<number, string> = {
      1: 'ม.ค.', 2: 'ก.พ.', 3: 'มี.ค.', 4: 'เม.ย.', 5: 'พ.ค.', 6: 'มิ.ย.',
      7: 'ก.ค.', 8: 'ส.ค.', 9: 'ก.ย.', 10: 'ต.ค.', 11: 'พ.ย.', 12: 'ธ.ค.'
    };

    const deptStatsMap = new Map<number, any>();
    departments.forEach((d) => {
      const monthlyCounts: Record<number, number> = {};
      monthsOrder.forEach((mNum) => {
        monthlyCounts[mNum] = 0;
      });

      deptStatsMap.set(d.id, {
        department_id: d.id,
        department_name: d.depart_name,
        department_group_id: d.depart_group_id,
        department_group_name: groupMap.get(d.depart_group_id || 0) || 'ทั่วไป',
        monthly_counts: monthlyCounts,
        total_incidents: 0,
        months_with_reports_count: 0,
      });
    });

    incidents.forEach((inc) => {
      const deptIdNum = Number(inc.department_id);
      const dStat = deptStatsMap.get(deptIdNum);
      if (dStat) {
        const rDate = new Date(inc.date_report);
        const monthNum = rDate.getMonth() + 1;
        if (dStat.monthly_counts[monthNum] !== undefined) {
          dStat.monthly_counts[monthNum] += 1;
          dStat.total_incidents += 1;
        }
      }
    });

    let deptsReportingAtLeastOnceYear = 0;
    const departmentStatsList = Array.from(deptStatsMap.values()).map((dStat) => {
      let activeMonths = 0;
      monthsOrder.forEach((mNum) => {
        if (dStat.monthly_counts[mNum] > 0) {
          activeMonths += 1;
        }
      });
      dStat.months_with_reports_count = activeMonths;
      if (dStat.total_incidents > 0) {
        deptsReportingAtLeastOnceYear += 1;
      }
      return dStat;
    });

    const monthlyKpiSummary = monthsOrder.map((mNum) => {
      let reportingDeptsInMonth = 0;
      let totalIncidentsInMonth = 0;

      departmentStatsList.forEach((dStat) => {
        const cnt = dStat.monthly_counts[mNum] || 0;
        if (cnt > 0) {
          reportingDeptsInMonth += 1;
        }
        totalIncidentsInMonth += cnt;
      });

      const percentage = totalDepartmentsCount > 0
        ? Number(((reportingDeptsInMonth / totalDepartmentsCount) * 100).toFixed(1))
        : 0;

      return {
        monthNumber: mNum,
        monthName: monthNamesMap[mNum],
        reportingDeptCount: reportingDeptsInMonth,
        totalDepartments: totalDepartmentsCount,
        percentage,
        totalIncidents: totalIncidentsInMonth,
      };
    });

    const yearlyKpiPercentage = totalDepartmentsCount > 0
      ? Number(((deptsReportingAtLeastOnceYear / totalDepartmentsCount) * 100).toFixed(1))
      : 0;

    const yearsList: number[] = [];
    const minYear = earliestRecord?.date_report ? new Date(earliestRecord.date_report).getFullYear() : 2020;
    for (let y = currentYear; y >= Math.min(minYear, 2020); y--) {
      yearsList.push(y);
    }

    return {
      summary: {
        totalDepartments: totalDepartmentsCount,
        reportingDepartmentsTotalYear: deptsReportingAtLeastOnceYear,
        kpiYearlyPercentage: yearlyKpiPercentage,
        totalIncidentsYear: incidents.length,
        year: targetYear,
        yearType,
      },
      yearsList,
      monthsOrder,
      monthlyKpiSummary,
      departmentStats: departmentStatsList,
    };
  }

  async getProgramSeverityMatrix(query?: {
    startDate?: string;
    endDate?: string;
    year?: number;
    year_type?: string;
  }, user?: any) {
    const [latestRecord, earliestRecord] = await Promise.all([
      this.prisma.riskregister.findFirst({
        orderBy: { date_report: 'desc' },
        select: { date_report: true },
      }),
      this.prisma.riskregister.findFirst({
        orderBy: { date_report: 'asc' },
        select: { date_report: true },
      }),
    ]);

    const currentYear = new Date().getFullYear();
    const maxYear = latestRecord?.date_report ? new Date(latestRecord.date_report).getFullYear() : currentYear;
    const targetYear = query?.year || maxYear;
    const yearType = query?.year_type || 'fiscal';

    let startDate: Date;
    let endDate: Date;

    if (query?.startDate && query?.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else if (yearType === 'fiscal') {
      startDate = new Date(`${targetYear - 1}-10-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-09-30T23:59:59.999Z`);
    } else {
      startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);
    }

    const [programs, riskstores, incidents, rcaCases, departments] = await Promise.all([
      this.prisma.program.findMany({ select: { program_id: true, program_name: true } }),
      this.prisma.riskstore.findMany({ select: { riskstore_id: true, riskstore_name: true, program_id: true } }),
      this.prisma.riskregister.findMany({
        where: await this.scopeIncidentWhere({
          date_report: {
            gte: startDate,
            lte: endDate,
          },
        }, user),
        select: {
          id: true,
          id_risk: true,
          date_report: true,
          modify_date: true,
          level_id: true,
          program_id: true,
          riskstore_id: true,
          detail: true,
          problem_basic: true,
          edit: true,
          rca_required: true,
          rca_status: true,
          department_id: true,
        },
      }),
      this.prisma.rca_case.findMany({
        select: { id: true, review_date: true, created_at: true },
      }),
      this.prisma.department.findMany({
        select: { id: true, depart_name: true },
      }),
    ]);

    const programMap = new Map<number, string>();
    programs.forEach((p) => programMap.set(p.program_id, p.program_name));

    const riskstoreMap = new Map<number, any>();
    riskstores.forEach((rs) => riskstoreMap.set(rs.riskstore_id, rs));

    const deptMap = new Map<string, string>();
    departments.forEach((d) => deptMap.set(String(d.id), d.depart_name));

    const rcaCaseMap = new Map<string, any>();
    rcaCases.forEach((rc) => rcaCaseMap.set(rc.id, rc));

    const clinicalLevels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const generalLevels = ['1', '2', '3', '4', '5'];
    const allLevels = [...clinicalLevels, ...generalLevels];

    const matrixMap = new Map<number, any>();

    programs.forEach((p) => {
      const counts: Record<string, number> = {};
      allLevels.forEach((lvl) => {
        counts[lvl] = 0;
      });

      matrixMap.set(p.program_id, {
        program_id: p.program_id,
        program_name: p.program_name,
        counts,
        total_clinical: 0,
        total_general: 0,
        total_ghi: 0,
        total_all: 0,
        rca_durations: [] as number[],
      });
    });

    const unassignedCounts: Record<string, number> = {};
    allLevels.forEach((lvl) => {
      unassignedCounts[lvl] = 0;
    });
    matrixMap.set(0, {
      program_id: 0,
      program_name: 'ไม่ระบุโปรแกรม',
      counts: unassignedCounts,
      total_clinical: 0,
      total_general: 0,
      total_ghi: 0,
      total_all: 0,
      rca_durations: [] as number[],
    });

    // Map for Risk Title / Risk Incident Topic
    const riskTitleMap = new Map<number, any>();

    const ghiIncidentsList: any[] = [];

    incidents.forEach((inc) => {
      let progId = inc.program_id || 0;
      if (!progId && inc.riskstore_id) {
        const rs = riskstoreMap.get(inc.riskstore_id);
        if (rs && rs.program_id) {
          progId = rs.program_id;
        }
      }

      let pData = matrixMap.get(progId);
      if (!pData) {
        pData = matrixMap.get(0);
      }

      const lvl = (inc.level_id || '').toUpperCase().trim();

      if (pData.counts[lvl] !== undefined) {
        pData.counts[lvl] += 1;
      }

      if (clinicalLevels.includes(lvl)) {
        pData.total_clinical += 1;
      } else if (generalLevels.includes(lvl)) {
        pData.total_general += 1;
      }
      pData.total_all += 1;

      let rcaDate: Date | null = null;
      if (inc.modify_date) {
        rcaDate = new Date(inc.modify_date);
      }

      let rcaDurationDays: number | null = null;
      if (rcaDate && inc.date_report) {
        const diffMs = new Date(rcaDate).getTime() - new Date(inc.date_report).getTime();
        rcaDurationDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        pData.rca_durations.push(rcaDurationDays);
      }

      const rsInfo = inc.riskstore_id ? riskstoreMap.get(inc.riskstore_id) : undefined;
      const riskTitle = rsInfo?.riskstore_name || inc.detail || 'ไม่ระบุชื่อเรื่องความเสี่ยง';
      const rId = inc.riskstore_id || 0;

      if (!riskTitleMap.has(rId)) {
        const counts: Record<string, number> = {};
        allLevels.forEach((l) => { counts[l] = 0; });
        riskTitleMap.set(rId, {
          riskstore_id: rId,
          risk_title: riskTitle,
          program_name: pData.program_name,
          counts,
          total_clinical: 0,
          total_general: 0,
          total_ghi: 0,
          total_all: 0,
          rca_durations: [] as number[],
          incidents: [] as any[],
        });
      }

      const tData = riskTitleMap.get(rId)!;
      if (tData.counts[lvl] !== undefined) {
        tData.counts[lvl] += 1;
      }
      if (clinicalLevels.includes(lvl)) {
        tData.total_clinical += 1;
      } else if (generalLevels.includes(lvl)) {
        tData.total_general += 1;
      }
      if (['G', 'H', 'I'].includes(lvl)) {
        tData.total_ghi += 1;
      }
      tData.total_all += 1;
      if (rcaDurationDays !== null) {
        tData.rca_durations.push(rcaDurationDays);
      }

      tData.incidents.push({
        id: inc.id,
        id_risk: inc.id_risk,
        date_report: inc.date_report,
        department_name: deptMap.get(String(inc.department_id)) || 'ไม่ระบุหน่วยงาน',
        level_id: lvl,
        detail: inc.detail || 'ไม่มีรายละเอียดเพิ่มเติม',
        review_result: inc.problem_basic || inc.edit || 'ได้รับการทบทวนและกำหนดมาตรการแก้ไขเบื้องต้นเรียบร้อยแล้ว',
        rca_status: inc.rca_status || 'เสร็จสิ้น',
        rca_duration_days: rcaDurationDays,
      });

      if (['G', 'H', 'I'].includes(lvl)) {
        pData.total_ghi += 1;

        ghiIncidentsList.push({
          id: inc.id,
          id_risk: inc.id_risk,
          date_report: inc.date_report,
          program_name: pData.program_name,
          risk_code: '',
          risk_title: riskTitle,
          level_id: lvl,
          rca_status: inc.rca_status || 'COMPLETED',
          rca_date: rcaDate,
          rca_duration_days: rcaDurationDays !== null ? rcaDurationDays : null,
        });
      }
    });

    const matrixList = Array.from(matrixMap.values())
      .filter((p) => p.total_all > 0)
      .map((p) => {
        const avgRcaDays = p.rca_durations.length > 0
          ? Number((p.rca_durations.reduce((a: number, b: number) => a + b, 0) / p.rca_durations.length).toFixed(1))
          : null;
        return {
          program_id: p.program_id,
          program_name: p.program_name,
          counts: p.counts,
          total_clinical: p.total_clinical,
          total_general: p.total_general,
          total_ghi: p.total_ghi,
          total_all: p.total_all,
          avg_rca_days: avgRcaDays,
        };
      })
      .sort((a, b) => b.total_all - a.total_all);

    const riskTitleList = Array.from(riskTitleMap.values())
      .filter((t) => t.total_all > 0)
      .map((t) => {
        const avgRcaDays = t.rca_durations.length > 0
          ? Number((t.rca_durations.reduce((a: number, b: number) => a + b, 0) / t.rca_durations.length).toFixed(1))
          : null;
        return {
          riskstore_id: t.riskstore_id,
          risk_title: t.risk_title,
          program_name: t.program_name,
          counts: t.counts,
          total_clinical: t.total_clinical,
          total_general: t.total_general,
          total_ghi: t.total_ghi,
          total_all: t.total_all,
          avg_rca_days: avgRcaDays,
          incidents: t.incidents,
        };
      })
      .sort((a, b) => b.total_all - a.total_all);

    const totalIncidents = incidents.length;
    const totalGHI = ghiIncidentsList.length;

    const yearsList: number[] = [];
    const minYear = earliestRecord?.date_report ? new Date(earliestRecord.date_report).getFullYear() : 2020;
    for (let y = currentYear; y >= Math.min(minYear, 2020); y--) {
      yearsList.push(y);
    }

    return {
      summary: {
        totalIncidents,
        totalGHI,
        totalClinical: incidents.filter((i) => clinicalLevels.includes((i.level_id || '').toUpperCase())).length,
        totalGeneral: incidents.filter((i) => generalLevels.includes((i.level_id || '').toUpperCase())).length,
        ghiPercentage: totalIncidents > 0 ? Number(((totalGHI / totalIncidents) * 100).toFixed(1)) : 0,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        year: targetYear,
        yearType,
      },
      yearsList,
      ghiIncidentsList,
      matrix: matrixList,
      riskTitleMatrix: riskTitleList,
    };
  }

  async getDepartmentStaffReportingStats(query?: {
    department_group_id?: number;
    year?: number;
    year_type?: string;
  }, user?: any) {
    const [latestRecord, earliestRecord] = await Promise.all([
      this.prisma.riskregister.findFirst({
        orderBy: { date_report: 'desc' },
        select: { date_report: true },
      }),
      this.prisma.riskregister.findFirst({
        orderBy: { date_report: 'asc' },
        select: { date_report: true },
      }),
    ]);

    const currentYear = new Date().getFullYear();
    const maxYear = latestRecord?.date_report ? new Date(latestRecord.date_report).getFullYear() : currentYear;
    const targetYear = query?.year || maxYear;
    const yearType = query?.year_type || 'fiscal';

    const deptWhere: any = {};
    if (query?.department_group_id) {
      deptWhere.depart_group_id = Number(query.department_group_id);
    }
    const visibleDepartmentIds = await this.getVisibleReportDepartmentIds(user);
    if (visibleDepartmentIds !== null) deptWhere.id = { in: visibleDepartmentIds };

    const [departments, groups, members] = await Promise.all([
      this.prisma.department.findMany({
        where: deptWhere,
        select: { id: true, depart_name: true, depart_group_id: true },
        orderBy: { depart_name: 'asc' },
      }),
      this.prisma.departmentgroup.findMany(),
      this.prisma.member.findMany({
        where: { status: '1' },
        select: { id: true, cid: true, department_id1: true },
      }),
    ]);

    const groupMap = new Map(groups.map((g) => [g.id, g.depart_group_name]));

    const deptMembersMap = new Map<number, typeof members>();
    departments.forEach((d) => deptMembersMap.set(d.id, []));
    members.forEach((m) => {
      if (m.department_id1 && deptMembersMap.has(m.department_id1)) {
        deptMembersMap.get(m.department_id1)!.push(m);
      }
    });

    const cids = members.map((m) => m.cid).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { cid: { in: cids } },
      select: { id: true, cid: true },
    });

    const cidToUserIdMap = new Map(users.map((u) => [u.cid, u.id]));
    const userIdToDeptIdMap = new Map<number, number>();
    members.forEach((m) => {
      const uId = cidToUserIdMap.get(m.cid);
      if (uId && m.department_id1) {
        userIdToDeptIdMap.set(uId, m.department_id1);
      }
    });

    let startDate: Date;
    let endDate: Date;
    if (yearType === 'fiscal') {
      startDate = new Date(`${targetYear - 1}-10-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-09-30T23:59:59.999Z`);
    } else {
      startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`);
    }

    const staffIncidentWhere = {
        date_report: {
          gte: startDate,
          lte: endDate,
        },
        department_id: { in: departments.map((department) => String(department.id)) },
      };
    const incidents = await this.prisma.riskregister.findMany({
      where: await this.scopeIncidentWhere(staffIncidentWhere, user),
      select: {
        id: true,
        created_by: true,
        user_ir: true,
        date_report: true,
        department_id: true,
      },
    });

    const monthsOrder =
      yearType === 'fiscal'
        ? [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const monthNamesMap: Record<number, string> = {
      1: 'ม.ค.', 2: 'ก.พ.', 3: 'มี.ค.', 4: 'เม.ย.', 5: 'พ.ค.', 6: 'มิ.ย.',
      7: 'ก.ค.', 8: 'ส.ค.', 9: 'ก.ย.', 10: 'ต.ค.', 11: 'พ.ย.', 12: 'ธ.ค.'
    };

    const standard17Depts = [
      { id: 1, name: 'กลุ่มการแพทย์', keywords: ['องค์กรแพทย์', 'กลุ่มการแพทย์', 'แพทย์'] },
      { id: 2, name: 'กลุ่มการพยาบาล', keywords: ['กลุ่มการพยาบาล'] },
      { id: 3, name: 'งานการพยาบาลผู้ป่วยใน (IPD)', keywords: ['ผู้ป่วยใน', 'ipd'] },
      { id: 4, name: 'งานหน่วยควบคุมการติดเชื้อและงานจ่ายกลาง', keywords: ['จ่ายกลาง', 'ic', 'เครื่องมือแพทย์', 'ติดเชื้อ'] },
      { id: 5, name: 'งานการพยาบาลผู้ป่วยนอก (OPD)', keywords: ['ผู้ป่วยนอก', 'opd', 'ari'] },
      { id: 6, name: 'งานการพยาบาลผู้ป่วยอุบัติเหตุฉุกเฉินและนิติเวช (ER)', keywords: ['อุบัติเหตุ', 'ฉุกเฉิน', 'er', 'ศูนย์เปล'] },
      { id: 7, name: 'กลุ่มงานทันตกรรม', keywords: ['ทันตกรรม', 'dent'] },
      { id: 8, name: 'กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค', keywords: ['เภสัช', 'ห้องยา', 'rx'] },
      { id: 9, name: 'กลุ่มงานบริการด้านปฐมภูมิและองค์รวม', keywords: ['ปฐมภูมิ', 'ส่งเสริม'] },
      { id: 10, name: 'กลุ่มงานสุขภาพจิตและยาเสพติด', keywords: ['สุขภาพจิต', 'ยาเสพติด'] },
      { id: 11, name: 'กลุ่มงานการแพทย์แผนไทยและการแพทย์ทางเลือก', keywords: ['แผนไทย', 'ทางเลือก', 'ttm'] },
      { id: 12, name: 'กลุ่มงานเวชกรรมฟื้นฟู', keywords: ['กายภาพ', 'ฟื้นฟู'] },
      { id: 13, name: 'กลุ่มงานเทคนิคการแพทย์', keywords: ['พยาธิวิทยา', 'lab', 'เทคนิคการแพทย์'] },
      { id: 14, name: 'กลุ่มงานรังสีวิทยา', keywords: ['เอกซเรย์', 'xray', 'รังสี'] },
      { id: 15, name: 'กลุ่มงานโภชนศาสตร์', keywords: ['โภชนา', 'โภชนศาสตร์'] },
      { id: 16, name: 'กลุ่มงานประกันสุขภาพ', keywords: ['ประกัน', 'ศูนย์ประกัน', 'ห้องบัตร', 'บัตร', 'สารสนเทศ', 'เทคโนโลยี', 'ไอที', 'it'] },
      { id: 17, name: 'กลุ่มงานบริหารทั่วไป', keywords: ['บริหาร', 'การเงิน', 'ธุรการ', 'พัสดุ', 'ยานพาหนะ', 'บัญชี'] },
    ];

    const getStandardUnitIndex = (departName: string): number => {
      const lower = (departName || '').toLowerCase();
      if (lower.includes('สารสนเทศ') || lower.includes('เทคโนโลยี') || lower.includes('ไอที') || lower === 'it') {
        return 15; // Unit 16: กลุ่มงานประกันสุขภาพ
      }
      if (lower.includes('แผนไทย') || lower.includes('ทางเลือก') || lower.includes('ttm')) {
        return 10; // Unit 11: กลุ่มงานการแพทย์แผนไทยและการแพทย์ทางเลือก
      }
      if (lower.includes('เทคนิคการแพทย์') || lower.includes('พยาธิวิทยา') || lower.includes('lab')) {
        return 12; // Unit 13: กลุ่มงานเทคนิคการแพทย์
      }
      if (lower.includes('องค์กรแพทย์') || lower.includes('กลุ่มการแพทย์')) {
        return 0; // Unit 1: กลุ่มการแพทย์
      }

      for (let i = 0; i < standard17Depts.length; i++) {
        if (standard17Depts[i].keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
          return i;
        }
      }
      return 16; // Default to 17th: กลุ่มงานบริหารทั่วไป
    };

    // Map department.id -> standard unit index
    const deptIdToStandardIndexMap = new Map<number, number>();
    departments.forEach((d) => {
      deptIdToStandardIndexMap.set(d.id, getStandardUnitIndex(d.depart_name));
    });

    // Structure for 17 Standard Units
    const standardUnitRows = standard17Depts.map((unit) => {
      const monthSets: Record<number, Set<number>> = {};
      monthsOrder.forEach((mNum) => {
        monthSets[mNum] = new Set<number>();
      });

      return {
        unit_id: unit.id,
        department_name: unit.name,
        total_staff: 0,
        monthSets,
        monthly_counts: {} as Record<number, number>,
      };
    });

    // Accumulate total active members for each standard unit
    members.forEach((m) => {
      if (m.department_id1 && deptIdToStandardIndexMap.has(m.department_id1)) {
        const stdIdx = deptIdToStandardIndexMap.get(m.department_id1)!;
        standardUnitRows[stdIdx].total_staff += 1;
      }
    });

    // Accumulate monthly reporting members for each standard unit
    incidents.forEach((inc) => {
      const rDate = new Date(inc.date_report);
      const mNum = rDate.getMonth() + 1;

      let authorDeptId = 0;
      let authorId = inc.created_by || inc.user_ir || 0;

      if (authorId && userIdToDeptIdMap.has(authorId)) {
        authorDeptId = userIdToDeptIdMap.get(authorId)!;
      } else if (inc.department_id) {
        authorDeptId = Number(inc.department_id);
      }

      if (authorDeptId && deptIdToStandardIndexMap.has(authorDeptId)) {
        const stdIdx = deptIdToStandardIndexMap.get(authorDeptId)!;
        if (standardUnitRows[stdIdx].monthSets[mNum]) {
          standardUnitRows[stdIdx].monthSets[mNum].add(authorId || inc.id);
        }
      }
    });

    let totalHospitalStaff = 0;

    const departmentRows = standardUnitRows.map((stdRow) => {
      totalHospitalStaff += stdRow.total_staff;

      const monthlyCounts: Record<number, number> = {};
      monthsOrder.forEach((mNum) => {
        monthlyCounts[mNum] = stdRow.monthSets[mNum] ? stdRow.monthSets[mNum].size : 0;
      });

      return {
        department_id: stdRow.unit_id,
        department_name: stdRow.department_name,
        department_group_id: 0,
        department_group_name: 'หน่วยงานมาตรฐาน',
        total_staff: stdRow.total_staff,
        monthly_counts: monthlyCounts,
      };
    });

    const monthlyStaffTotals: Record<number, number> = {};
    const monthlyStaffPercentages: Record<number, string> = {};

    monthsOrder.forEach((mNum) => {
      let sumReporters = 0;
      departmentRows.forEach((row) => {
        sumReporters += row.monthly_counts[mNum] || 0;
      });
      monthlyStaffTotals[mNum] = sumReporters;
      const pct = totalHospitalStaff > 0 ? ((sumReporters / totalHospitalStaff) * 100).toFixed(2) : '0.00';
      monthlyStaffPercentages[mNum] = pct + '%';
    });

    const yearsList: number[] = [];
    const minYear = earliestRecord?.date_report ? new Date(earliestRecord.date_report).getFullYear() : 2020;
    for (let y = currentYear; y >= Math.min(minYear, 2020); y--) {
      yearsList.push(y);
    }

    return {
      summary: {
        totalHospitalStaff,
        year: targetYear,
        yearType,
      },
      yearsList,
      monthsOrder,
      monthNamesMap,
      departmentRows,
      monthlyStaffTotals,
      monthlyStaffPercentages,
    };
  }
}
