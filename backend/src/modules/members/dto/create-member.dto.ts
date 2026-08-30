export class CreateMemberDto {
  cid: string;
  name: string;
  departmentId: number;
  departmentId2?: number;
  positionId: number;
  teamId?: number;
  role?: string;
  rmScope?: string | null;
}
