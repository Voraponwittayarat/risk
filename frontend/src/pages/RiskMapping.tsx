import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Filter,
  Link as LinkIcon,
  Save,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";

type ViewMode = "nrls" | "unmapped-local";
type MappingStatus = "all" | "mapped" | "unmapped";
type LocalRiskFilter = "unmapped" | "all";

interface MappingPermissions {
  can_manage_mapping: boolean;
  can_full_edit: boolean;
  can_edit_program: boolean;
  scope_label: string;
}

const defaultMappingPermissions: MappingPermissions = {
  can_manage_mapping: false,
  can_full_edit: false,
  can_edit_program: false,
  scope_label: "",
};

function apiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  return Array.isArray(message)
    ? message.join(", ")
    : String(message || fallback);
}

export default function RiskMapping() {
  const [nrlsRisks, setNrlsRisks] = useState<any[]>([]);
  const [localRisks, setLocalRisks] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("nrls");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<MappingStatus>("all");
  const [filterProgramId, setFilterProgramId] = useState("");

  const [mappingModal, setMappingModal] = useState<any>(null);
  const [selectedLocalIds, setSelectedLocalIds] = useState<number[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | "">("");
  const [modalSearch, setModalSearch] = useState("");
  const [modalProgramId, setModalProgramId] = useState("");
  const [modalLocalFilter, setModalLocalFilter] =
    useState<LocalRiskFilter>("unmapped");
  const [mappingReason, setMappingReason] = useState("");
  const [mappingPermissions, setMappingPermissions] =
    useState<MappingPermissions>(defaultMappingPermissions);
  const [saving, setSaving] = useState(false);

  const [pickerLocalRisk, setPickerLocalRisk] = useState<any>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerProgramId, setPickerProgramId] = useState("");

  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/nrls-riskstore/mapping/context", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNrlsRisks(response.data.nrlsRisks || []);
      setLocalRisks(response.data.localRisks || []);
      setPrograms(response.data.programs || []);
      setMappingPermissions(
        response.data.permissions || defaultMappingPermissions,
      );
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "โหลดข้อมูลไม่สำเร็จ",
        text: apiErrorMessage(err, "กรุณาลองรีเฟรชหน้าอีกครั้ง"),
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const programName = (programId: number | null | undefined) =>
    programs.find((program) => Number(program.program_id) === Number(programId))
      ?.program_name || "ยังไม่ระบุ";

  const activeLocalRisks = localRisks.filter((risk) => risk.active);
  const unmappedLocalRisks = activeLocalRisks.filter((risk) => !risk.nrlsCode);
  const mappedNrlsCount = nrlsRisks.filter((risk) =>
    risk.local_risks?.some((localRisk: any) => localRisk.status !== "0"),
  ).length;

  const openMappingModal = (nrlsRisk: any, additionalLocalId?: number) => {
    setMappingModal(nrlsRisk);
    const mappedIds = (nrlsRisk.local_risks || []).map(
      (localRisk: any) => localRisk.riskstore_id,
    );
    setSelectedLocalIds(
      additionalLocalId && !mappedIds.includes(additionalLocalId)
        ? [...mappedIds, additionalLocalId]
        : mappedIds,
    );
    setSelectedProgramId(nrlsRisk.program_id || "");
    setModalSearch("");
    setModalProgramId("");
    setModalLocalFilter("unmapped");
    setMappingReason("");
  };

  const openNrlsPicker = (localRisk: any) => {
    setPickerLocalRisk(localRisk);
    setPickerSearch("");
    setPickerProgramId("");
  };

  const selectNrlsForLocalRisk = (nrlsRisk: any) => {
    const localRiskId = pickerLocalRisk?.id;
    setPickerLocalRisk(null);
    if (localRiskId) openMappingModal(nrlsRisk, localRiskId);
  };

  const toggleLocalRisk = (id: number) => {
    setSelectedLocalIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  };

  const saveMapping = async () => {
    if (mappingReason.trim().length < 5) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุเหตุผล",
        text: "เหตุผลต้องมีอย่างน้อย 5 ตัวอักษรเพื่อใช้ตรวจสอบย้อนหลัง",
      });
      return;
    }
    try {
      setSaving(true);
      const payload: {
        riskstore_ids: number[];
        reason: string;
        program_id?: number | null;
      } = {
        riskstore_ids: selectedLocalIds,
        reason: mappingReason.trim(),
      };
      if (mappingPermissions.can_edit_program) {
        payload.program_id =
          selectedProgramId === "" ? null : selectedProgramId;
      }
      await axios.patch(
        `/nrls-riskstore/${mappingModal.nrls_code}/mapping`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        showConfirmButton: false,
        timer: 1500,
      });
      setMappingModal(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถบันทึก Mapping ได้",
        text: apiErrorMessage(
          err,
          "กรุณาตรวจสอบสิทธิ์และข้อมูลแล้วลองอีกครั้ง",
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredNrls = nrlsRisks.filter((risk) => {
    const activeMappedRisks = (risk.local_risks || []).filter(
      (localRisk: any) => localRisk.status !== "0",
    );
    const isMapped = activeMappedRisks.length > 0;
    const matchesText =
      !normalizedSearch ||
      risk.nrls_code?.toLowerCase().includes(normalizedSearch) ||
      risk.name?.toLowerCase().includes(normalizedSearch) ||
      activeMappedRisks.some((localRisk: any) =>
        localRisk.riskstore_name?.toLowerCase().includes(normalizedSearch),
      );
    const matchesProgram =
      !filterProgramId || Number(risk.program_id) === Number(filterProgramId);
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "mapped" && isMapped) ||
      (filterStatus === "unmapped" && !isMapped);
    return matchesText && matchesProgram && matchesStatus;
  });

  const filteredUnmappedLocalRisks = unmappedLocalRisks.filter((risk) => {
    const matchesText =
      !normalizedSearch ||
      risk.fullName?.toLowerCase().includes(normalizedSearch) ||
      risk.code?.toLowerCase().includes(normalizedSearch);
    const matchesProgram =
      !filterProgramId || Number(risk.programId) === Number(filterProgramId);
    return matchesText && matchesProgram;
  });

  const normalizedModalSearch = modalSearch.trim().toLowerCase();
  const filteredLocalRisks = activeLocalRisks.filter((risk) => {
    const isSelected = selectedLocalIds.includes(risk.id);
    const matchesText =
      !normalizedModalSearch ||
      risk.fullName?.toLowerCase().includes(normalizedModalSearch) ||
      risk.code?.toLowerCase().includes(normalizedModalSearch);
    const matchesProgram =
      !modalProgramId || Number(risk.programId) === Number(modalProgramId);
    const matchesMappingFilter =
      modalLocalFilter === "all" || isSelected || !risk.nrlsCode;
    return matchesText && matchesProgram && matchesMappingFilter;
  });

  const normalizedPickerSearch = pickerSearch.trim().toLowerCase();
  const filteredPickerNrls = nrlsRisks.filter((risk) => {
    const matchesText =
      !normalizedPickerSearch ||
      risk.nrls_code?.toLowerCase().includes(normalizedPickerSearch) ||
      risk.name?.toLowerCase().includes(normalizedPickerSearch);
    const matchesProgram =
      !pickerProgramId || Number(risk.program_id) === Number(pickerProgramId);
    return matchesText && matchesProgram;
  });

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterProgramId("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <LinkIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Mapping ความเสี่ยง NRLS
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ตรวจสอบมาตรฐาน NRLS และชื่อความเสี่ยงเดิมที่ยังไม่ได้เชื่อมโยง
            </p>
          </div>
        </div>
      </div>

      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          mappingPermissions.can_full_edit
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
        }`}
      >
        <span className="font-bold">ขอบเขตสิทธิ์: </span>
        {mappingPermissions.scope_label || "กำลังตรวจสอบสิทธิ์"}
        {!mappingPermissions.can_full_edit && (
          <span>
            {" "}
            — เพิ่มได้เฉพาะรายการที่ยังไม่ถูก Mapping การถอด/ย้าย Mapping
            และเปลี่ยนโปรแกรมต้องให้ผู้ที่ Admin
            กำหนดสิทธิ์แก้ไขทั้งหมดดำเนินการ
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setViewMode("nrls");
            setFilterStatus("all");
          }}
          className={`rounded-2xl border p-4 text-left transition ${
            viewMode === "nrls"
              ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:ring-indigo-900/40"
              : "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900"
          }`}
        >
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            มาตรฐาน NRLS ทั้งหมด
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {nrlsRisks.length}
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode("nrls");
            setFilterStatus("mapped");
          }}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            NRLS ที่ Mapping แล้ว
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {mappedNrlsCount}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("unmapped-local")}
          className={`rounded-2xl border p-4 text-left transition ${
            viewMode === "unmapped-local"
              ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100 dark:bg-amber-950/30 dark:ring-amber-900/40"
              : "border-slate-200 bg-white hover:border-amber-300 dark:border-slate-700 dark:bg-slate-900"
          }`}
        >
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            ความเสี่ยงเดิมที่ยังไม่ Mapping
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {unmappedLocalRisks.length}
          </p>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setViewMode("nrls");
              setFilterStatus("all");
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              viewMode === "nrls"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            NRLS ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setViewMode("unmapped-local")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              viewMode === "unmapped-local"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            ความเสี่ยงเดิมที่ยังไม่ Mapping ({unmappedLocalRisks.length})
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px_220px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                viewMode === "nrls"
                  ? "ค้นหารหัส NRLS, ชื่อใหม่ หรือชื่อความเสี่ยงเดิม..."
                  : "ค้นหารหัสหรือชื่อความเสี่ยงเดิม..."
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <select
            value={filterProgramId}
            onChange={(event) => setFilterProgramId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">ทุกโปรแกรมความเสี่ยง</option>
            {programs.map((program) => (
              <option key={program.program_id} value={program.program_id}>
                {program.program_id}. {program.program_name}
              </option>
            ))}
          </select>
          {viewMode === "nrls" ? (
            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value as MappingStatus)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">ทุกสถานะ Mapping</option>
              <option value="mapped">Mapped แล้ว</option>
              <option value="unmapped">ยังไม่ Mapping</option>
            </select>
          ) : (
            <div className="flex items-center rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <Filter className="mr-2 h-4 w-4" /> เฉพาะที่ยังไม่ Mapping
            </div>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ล้างตัวกรอง
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          พบ{" "}
          {viewMode === "nrls"
            ? filteredNrls.length
            : filteredUnmappedLocalRisks.length}{" "}
          รายการ
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {loading ? (
          <div className="flex flex-col items-center p-8 text-center text-slate-500">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            กำลังโหลดข้อมูล...
          </div>
        ) : viewMode === "nrls" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="w-24 px-4 py-3 font-semibold">NRLS Code</th>
                  <th className="w-1/3 px-4 py-3 font-semibold">
                    ชื่อความเสี่ยง NRLS
                  </th>
                  <th className="w-24 px-4 py-3 text-center font-semibold">
                    สถานะ
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    ชื่อความเสี่ยงเดิมที่เชื่อมโยง
                  </th>
                  <th className="w-48 px-4 py-3 font-semibold">
                    โปรแกรมความเสี่ยง
                  </th>
                  <th className="w-24 px-4 py-3 text-center font-semibold">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNrls.map((risk) => {
                  const mappedLocalRisks = (risk.local_risks || []).filter(
                    (localRisk: any) => localRisk.status !== "0",
                  );
                  const isMapped = mappedLocalRisks.length > 0;
                  return (
                    <tr
                      key={risk.nrls_code}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                    >
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {risk.nrls_code}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-slate-800 dark:text-slate-200">
                        {risk.name}
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        {isMapped ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            <Check size={12} /> Mapped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertCircle size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {isMapped ? (
                          <div className="flex flex-wrap gap-1.5">
                            {mappedLocalRisks.map((localRisk: any) => (
                              <span
                                key={localRisk.riskstore_id}
                                className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {localRisk.riskstore_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            - ยังไม่ได้เชื่อมโยงข้อมูล -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-300">
                        {risk.program?.program_name || (
                          <span className="italic text-slate-400">
                            ยังไม่ระบุ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        <button
                          type="button"
                          title="ตรวจสอบหรือแก้ไข Mapping"
                          onClick={() => openMappingModal(risk)}
                          className="inline-flex items-center justify-center rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40"
                        >
                          <LinkIcon size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredNrls.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      ไม่พบข้อมูลตามตัวกรอง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-amber-50/60 text-slate-500 dark:border-slate-700 dark:bg-amber-950/20 dark:text-slate-400">
                <tr>
                  <th className="w-36 px-5 py-3 font-semibold">รหัสเดิม</th>
                  <th className="px-5 py-3 font-semibold">
                    ชื่อความเสี่ยงเดิม
                  </th>
                  <th className="w-80 px-5 py-3 font-semibold">โปรแกรมเดิม</th>
                  <th className="w-36 px-5 py-3 text-center font-semibold">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUnmappedLocalRisks.map((risk) => (
                  <tr
                    key={risk.id}
                    className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
                  >
                    <td className="px-5 py-4 align-top font-mono font-bold text-slate-700 dark:text-slate-300">
                      {risk.code}
                    </td>
                    <td className="px-5 py-4 align-top font-medium text-slate-900 dark:text-white">
                      {risk.name}
                    </td>
                    <td className="px-5 py-4 align-top text-slate-600 dark:text-slate-300">
                      {programName(risk.programId)}
                    </td>
                    <td className="px-5 py-4 text-center align-top">
                      <button
                        type="button"
                        onClick={() => openNrlsPicker(risk)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
                      >
                        เลือก NRLS <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUnmappedLocalRisks.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      ไม่พบความเสี่ยงเดิมที่ยังไม่ Mapping ตามตัวกรอง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pickerLocalRisk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  เลือก NRLS ที่ต้องการเชื่อมโยง
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  ชื่อเดิม: {pickerLocalRisk.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerLocalRisk(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(0,1fr)_280px] dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="ค้นหารหัสหรือชื่อ NRLS..."
                  value={pickerSearch}
                  onChange={(event) => setPickerSearch(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <select
                value={pickerProgramId}
                onChange={(event) => setPickerProgramId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">ทุกโปรแกรม NRLS</option>
                {programs.map((program) => (
                  <option key={program.program_id} value={program.program_id}>
                    {program.program_id}. {program.program_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {filteredPickerNrls.map((risk) => {
                const mappingCount = (risk.local_risks || []).filter(
                  (localRisk: any) => localRisk.status !== "0",
                ).length;
                return (
                  <button
                    type="button"
                    key={risk.nrls_code}
                    onClick={() => selectNrlsForLocalRisk(risk)}
                    className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-950/20"
                  >
                    <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {risk.nrls_code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {risk.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {risk.program?.program_name || "ยังไม่ระบุโปรแกรม"} ·
                        ผูกชื่อเดิมแล้ว {mappingCount} รายการ
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-indigo-500" />
                  </button>
                );
              })}
              {filteredPickerNrls.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500">
                  ไม่พบ NRLS ที่ค้นหา
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  ตรวจสอบ Mapping บริบทโรงพยาบาล
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  NRLS: {mappingModal.nrls_code} - {mappingModal.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMappingModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  โปรแกรมความเสี่ยงสำหรับ NRLS นี้
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(event) =>
                    setSelectedProgramId(
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  disabled={!mappingPermissions.can_edit_program}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- ไม่ระบุโปรแกรม --</option>
                  {programs.map((program) => (
                    <option key={program.program_id} value={program.program_id}>
                      {program.program_id}. {program.program_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_210px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อความเสี่ยงเดิม..."
                    value={modalSearch}
                    onChange={(event) => setModalSearch(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <select
                  value={modalProgramId}
                  onChange={(event) => setModalProgramId(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">ทุกโปรแกรมเดิม</option>
                  {programs.map((program) => (
                    <option key={program.program_id} value={program.program_id}>
                      {program.program_id}. {program.program_name}
                    </option>
                  ))}
                </select>
                <select
                  value={modalLocalFilter}
                  onChange={(event) =>
                    setModalLocalFilter(event.target.value as LocalRiskFilter)
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="unmapped">ที่เลือก + ยังไม่ Mapping</option>
                  <option value="all">ชื่อความเสี่ยงเดิมทั้งหมด</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เลือกอยู่ {selectedLocalIds.length} รายการ · แสดง{" "}
                {filteredLocalRisks.length} รายการ
              </p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {filteredLocalRisks.map((localRisk) => {
                const isSelected = selectedLocalIds.includes(localRisk.id);
                const mappedToOther =
                  localRisk.nrlsCode &&
                  localRisk.nrlsCode !== mappingModal.nrls_code;
                const isLocked =
                  !mappingPermissions.can_full_edit &&
                  Boolean(localRisk.nrlsCode);
                return (
                  <label
                    key={localRisk.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isLocked}
                      onChange={() => toggleLocalRisk(localRisk.id)}
                      className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}
                      >
                        {localRisk.fullName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        โปรแกรมเดิม: {programName(localRisk.programId)}
                      </p>
                      {mappedToOther && !isSelected && (
                        <p className="mt-1 text-xs font-medium text-amber-600">
                          ปัจจุบัน Mapping กับ {localRisk.nrlsCode}
                          {mappingPermissions.can_full_edit
                            ? " — หากเลือก รายการจะย้ายมาที่ NRLS นี้"
                            : " — ต้องให้ผู้ที่ Admin กำหนดสิทธิ์แก้ไขทั้งหมดเป็นผู้ย้าย"}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
              {filteredLocalRisks.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500">
                  ไม่พบชื่อความเสี่ยงเดิมตามตัวกรอง
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                เหตุผลการเพิ่มหรือแก้ไข Mapping{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={mappingReason}
                onChange={(event) => setMappingReason(event.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="เช่น ชื่อความเสี่ยงเดิมมีความหมายตรงกับ NRLS ข้อนี้"
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                อย่างน้อย 5 ตัวอักษร · บันทึกในประวัติการตรวจสอบ
              </p>
            </div>
            <div className="flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setMappingModal(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={saving || mappingReason.trim().length < 5}
                onClick={saveMapping}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />{" "}
                {saving ? "กำลังบันทึก..." : "บันทึก Mapping"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
