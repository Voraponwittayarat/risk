import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  RefreshCw,
  ShieldAlert,
  Activity,
  Clock,
  Search,
} from "lucide-react";

interface Priority {
  code: string;
  name: string;
  count: number;
  previous: number;
  delta: number;
  percent: number | null;
  severe: number;
  repeatDepartments: number;
}
interface Followup {
  id: number;
  title: string;
  owner: string | null;
  count: number | null;
  reasons: string[];
  nextReview: string | null;
  assessed: boolean;
}
interface DecisionData {
  generatedAt: string;
  scope: string;
  period: {
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  summary: {
    total: number;
    severe: number;
    nearMiss: number;
    unsafeConditions: number;
    unclassified: number;
    rising: number;
    repeated: number;
  };
  proactive: { count: number; total: number };
  priorities: Priority[];
  departments: {
    id: string;
    name: string;
    total: number;
    severe: number;
    rca: number;
  }[];
  backlog: {
    rca: number;
    overdueRca: number;
    capa: number;
    overdueCapa: number;
    rcaItems: { id: number; code: string | null; due: string | null }[];
    capaItems: {
      id: number;
      incidentId: number;
      code: string;
      status: string;
      due: string | null;
    }[];
  };
  effectiveness: {
    total: number;
    effective: number;
    partial: number;
    ineffective: number;
    unassessed: number;
    overdue: number;
  };
  followup: Followup[];
}
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "ยังไม่กำหนด";
const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800";
const empty = (
  <p className="py-6 text-sm text-slate-500">
    ไม่พบรายการตามเงื่อนไขและสิทธิ์ที่เลือก
  </p>
);

export default function RiskDecisionSupport({
  departments,
  onOpenRisk,
  department,
  onDepartmentChange,
  refreshKey,
}: {
  departments: { id: number; depart_name: string }[];
  onOpenRisk: (id: number) => void;
  department: string;
  onDepartmentChange: (value: string) => void;
  refreshKey: number;
}) {
  const [days, setDays] = useState("30");
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DecisionData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);
    axios
      .get<DecisionData>("/incidents/reports/decision-support", {
        params: { days, department_id: department },
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      })
      .then((res) => {
        if (!controller.signal.aborted) setData(res.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, department, revision, refreshKey]);
  const priorities =
    data?.priorities.filter(
      (p) =>
        (view === "all" ||
          (view === "rising" ? p.delta > 0 : p.repeatDepartments > 0)) &&
        `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase()),
    ) || [];
  return (
    <section
      className="no-print space-y-5 text-slate-800 dark:text-slate-100"
      aria-label="ประเด็นเพื่อการตัดสินใจ"
    >
      <div className="rounded-2xl bg-slate-900 p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-teal-300">
              RISK ANALYTICS · DECISION SUPPORT
            </p>
            <h2 className="text-2xl font-bold">
              ประเด็นที่ทีม RM ต้องตัดสินใจ
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              จัดลำดับการทบทวน สนับสนุนหน่วยงาน และติดตามผลมาตรการ
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRevision((n) => n + 1)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-500 px-3 py-2 disabled:opacity-50"
          >
            <RefreshCw size={16} /> อัปเดตข้อมูล
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-4">
          <label className="text-sm">
            ช่วงวิเคราะห์ Incident
            <select
              className="ml-2 rounded-lg bg-slate-800 p-2"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            >
              <option value="30">30 วัน</option>
              <option value="90">90 วัน</option>
              <option value="180">180 วัน</option>
            </select>
          </label>
          <label className="text-sm">
            หน่วยงาน
            <select
              className="ml-2 max-w-full rounded-lg bg-slate-800 p-2"
              value={department}
              onChange={(e) => onDepartmentChange(e.target.value)}
            >
              <option value="all">ทุกหน่วยงานตามสิทธิ์</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.depart_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {data && (
          <p className="mt-4 text-xs leading-6 text-slate-300">
            {data.scope} · {date(data.period.start)} – {date(data.period.end)}{" "}
            เทียบ {date(data.period.previousStart)} –{" "}
            {date(data.period.previousEnd)}
            <br />
            อัปเดต {new Date(data.generatedAt).toLocaleString("th-TH")} ·
            รวมวันนี้ซึ่งยังรายงานไม่ครบวัน
          </p>
        )}
      </div>
      {loading && (
        <div role="status" className={panel}>
          กำลังรวบรวมสัญญาณและงานติดตาม…
        </div>
      )}
      {error && (
        <div role="alert" className={`${panel} text-red-700`}>
          โหลดข้อมูลไม่สำเร็จ กรุณากดอัปเดตข้อมูลเพื่อลองใหม่
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "รายงานความรุนแรงสูง",
                value: data.summary.severe,
                detail: "ระดับ G–I และ 4–5 · ทบทวนผลกระทบก่อน",
                icon: ShieldAlert,
              },
              {
                title: "รหัสที่มีรายงานเพิ่มขึ้น",
                value: data.summary.rising,
                detail: "เทียบช่วงก่อนหน้าที่มีจำนวนวันเท่ากัน",
                icon: Activity,
              },
              {
                title: "สัญญาณเกิดซ้ำ",
                value: data.summary.repeated,
                detail: "รหัส NRLS เดียวกัน ≥ 2 ครั้งในหน่วยงานเดียว",
                icon: RefreshCw,
              },
              {
                title: "งานเกินกำหนด",
                value: data.backlog.overdueRca + data.backlog.overdueCapa,
                detail: `RCA ${data.backlog.overdueRca} · CAPA ลงมือทำ ${data.backlog.overdueCapa}`,
                icon: Clock,
              },
            ].map((card) => (
              <div key={card.title} className={panel}>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  {card.title}
                  <card.icon size={18} />
                </div>
                <p className="my-3 text-3xl font-bold">
                  {card.value.toLocaleString("th-TH")}
                </p>
                <p className="text-xs leading-5 text-slate-500">
                  {card.detail}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            รายงานทั้งหมด {data.summary.total} รายการ · ยังไม่ยืนยันรหัส NRLS{" "}
            {data.summary.unclassified} รายการ
            (ไม่นำมาจัดอันดับรหัสหรือประเมินซ้ำ)
            จำนวนรายงานขึ้นกับวัฒนธรรมการรายงานและปริมาณบริการ
            จึงใช้เป็นสัญญาณเพื่อทบทวน
            ไม่ใช่อัตราความเสี่ยงหรือการจัดอันดับผลงานหน่วยงาน
          </div>
          <div className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">
                  01 · ความเสี่ยงสำคัญ / เพิ่มขึ้น / เกิดซ้ำ
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  เรียงตามจำนวนระดับรุนแรงสูง → จำนวนที่เพิ่ม → จำนวนรายงาน
                  ไม่ใช่คะแนน Risk Matrix
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="signal-view">
                  สัญญาณที่ต้องการ
                </label>
                <select
                  id="signal-view"
                  className="rounded-lg border border-slate-300 p-2 dark:bg-slate-900"
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="rising">เพิ่มขึ้น</option>
                  <option value="repeat">เกิดซ้ำ</option>
                </select>
                <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-2">
                  <Search size={16} />
                  <input
                    aria-label="ค้นหารหัสหรือชื่อความเสี่ยง"
                    className="w-44 bg-transparent py-2"
                    placeholder="ค้นหารหัส / ความเสี่ยง"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="mt-4 max-h-96 overflow-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <tr>
                    {[
                      "ความเสี่ยง",
                      "ก่อน → ปัจจุบัน",
                      "การเปลี่ยนแปลง",
                      "รุนแรงสูง",
                      "หน่วยงานที่ซ้ำ",
                    ].map((t) => (
                      <th key={t} className="p-3">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priorities.map((p) => (
                    <tr
                      key={p.code}
                      className="border-b border-slate-100 dark:border-slate-700"
                    >
                      <td className="max-w-sm p-3">
                        <span className="font-semibold text-teal-700 dark:text-teal-300">
                          {p.code}
                        </span>
                        <p className="mt-1">{p.name}</p>
                      </td>
                      <td className="p-3 tabular-nums">
                        {p.previous} → <strong>{p.count}</strong>
                      </td>
                      <td className="p-3">
                        {p.delta > 0 ? "+" : ""}
                        {p.delta}
                        <p className="text-xs text-slate-500">
                          {p.percent === null
                            ? p.count
                              ? "ช่วงก่อนเป็น 0 · ไม่คำนวณ %"
                              : "ไม่มีรายงานทั้งสองช่วง"
                            : `${p.percent > 0 ? "+" : ""}${p.percent}%`}
                        </p>
                      </td>
                      <td className="p-3">{p.severe}</td>
                      <td className="p-3">{p.repeatDepartments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!priorities.length && empty}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              สัญญาณซ้ำต้องทบทวนบริบทและสาเหตุร่วมเพิ่มเติม
              ไม่ได้ยืนยันว่าเกิดจากสาเหตุเดิม
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={panel}>
              <h3 className="font-bold">
                02 · หน่วยงานที่ควรได้รับการสนับสนุน
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                พิจารณาความรุนแรงและภาระ RCA ค้าง เพื่อจัดสรรทีมและทรัพยากร
              </p>
              <div className="mt-3 max-h-72 overflow-auto">
                {data.departments.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm dark:border-slate-700"
                  >
                    <span>{d.name}</span>
                    <span className="shrink-0 text-right">
                      รุนแรงสูง <strong>{d.severe}</strong> · RCA ค้าง{" "}
                      <strong>{d.rca}</strong>
                      <small className="block text-slate-500">
                        รายงานช่วงนี้ {d.total}
                      </small>
                    </span>
                  </div>
                ))}
                {!data.departments.length && empty}
              </div>
            </div>
            <div className={panel}>
              <h3 className="font-bold">
                03 · Near Miss และการค้นหาความเสี่ยงเชิงรุก
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>Near Miss · ระดับ B</dt>
                  <dd className="font-bold">
                    {data.summary.nearMiss} / {data.summary.total} รายงาน (
                    {data.summary.total
                      ? (
                          (data.summary.nearMiss / data.summary.total) *
                          100
                        ).toFixed(1)
                      : "0.0"}
                    %)
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>สภาพเสี่ยง · ระดับ A</dt>
                  <dd className="font-bold">
                    {data.summary.unsafeConditions} รายงาน
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>ทะเบียนจากแหล่งค้นหาเชิงรุก</dt>
                  <dd className="font-bold">
                    {data.proactive.count} / {data.proactive.total}{" "}
                    เรื่องที่ยังเปิด
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-6 text-slate-500">
                ทะเบียนเชิงรุกนับเฉพาะแหล่งที่ระบุ FMEA, Safety Walkround หรือ
                Proactive Risk Assessment ทุกช่วงเวลา
                ข้อมูลแหล่งอื่นยังไม่ยืนยันว่าเป็นเชิงรุก จำนวน 0
                อาจเกิดจากยังไม่บันทึกแหล่งที่มา
              </p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={panel}>
              <h3 className="font-bold">04 · RCA / CAPA ที่ยังค้าง</h3>
              <p className="mt-1 text-xs text-slate-500">
                ทุกช่วงเวลา ณ วันนี้ · ไม่ตัดงานเก่าออกตามช่วง Incident
              </p>
              <div className="my-4 flex gap-6">
                <p>
                  RCA <strong>{data.backlog.rca}</strong>
                </p>
                <p>
                  CAPA <strong>{data.backlog.capa}</strong>
                </p>
              </div>
              <div className="max-h-72 overflow-auto text-sm">
                {data.backlog.rcaItems.map((i) => (
                  <Link
                    key={i.id}
                    to={`/incidents/${i.id}`}
                    className="flex justify-between gap-3 border-b border-slate-100 py-3 text-indigo-700 dark:text-indigo-300"
                  >
                    <span>
                      RCA · Incident #{i.id} · {i.code || "รอจัดหมวด"}
                    </span>
                    <span>
                      {date(i.due)}{" "}
                      <ArrowUpRight className="inline" size={14} />
                    </span>
                  </Link>
                ))}
                {data.backlog.capaItems.map((c) => (
                  <div key={c.id} className="border-b border-slate-100 py-3">
                    <Link
                      className="text-indigo-700 dark:text-indigo-300"
                      to={`/incidents/${c.incidentId}`}
                    >
                      CAPA #{c.id} · {c.code} ↗
                    </Link>
                    <p className="text-xs text-slate-500">
                      {c.status} · กำหนดลงมือทำ {date(c.due)}
                    </p>
                  </div>
                ))}
                {!data.backlog.rca && !data.backlog.capa && empty}
              </div>
            </div>
            <div className={panel}>
              <h3 className="font-bold">05 · มาตรการได้ผลหรือไม่</h3>
              <p className="mt-1 text-xs text-slate-500">
                สถานะประสิทธิผลล่าสุดของ CAPA ทุกช่วงเวลา · ไม่รวมยกเลิก
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ["ได้ผล", data.effectiveness.effective],
                  ["ได้ผลบางส่วน", data.effectiveness.partial],
                  ["ไม่ได้ผล", data.effectiveness.ineffective],
                  ["ยังไม่มีผลประเมิน", data.effectiveness.unassessed],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm">
                เกินกำหนดประเมินผล <strong>{data.effectiveness.overdue}</strong>{" "}
                มาตรการ
              </p>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                การปิด Incident หรือไม่มีรายงานใหม่ไม่ยืนยันประสิทธิผล
                ควรตรวจหลักฐาน ค่าตั้งต้น เป้าหมาย และระยะติดตามใน CAPA
                ก่อนตัดสินใจ
              </p>
            </div>
          </div>
          <div className={panel}>
            <h3 className="font-bold">
              06 · ยังต้องติดตาม แม้ไม่มี Incident ใหม่
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              ทะเบียนที่ยังเปิด: Never Event, ความเสี่ยงสูง หรือขาดการทบทวน ·
              ทุกช่วงเวลา
            </p>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto">
              {data.followup.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div>
                    <h4 className="font-semibold">{r.title}</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      ผู้รับผิดชอบ: {r.owner || "ยังไม่ระบุ"} · ทบทวน{" "}
                      {date(r.nextReview)} ·{" "}
                      {r.count === null
                        ? "ยังเชื่อม Incident ไม่ได้ (ตรวจรหัส/ขอบเขตกลุ่ม)"
                        : `Incident ยืนยันรหัสในช่วงนี้ ${r.count}`}
                    </p>
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      {r.reasons.join(" · ")}
                      {!r.assessed && " · ใช้ระดับตั้งต้น (ยังไม่ทบทวน)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 dark:text-indigo-300"
                    onClick={() => onOpenRisk(r.id)}
                  >
                    เปิดทะเบียนเพื่อทบทวน →
                  </button>
                </div>
              ))}
              {!data.followup.length && empty}
            </div>
          </div>
          <details className={`${panel} text-sm`}>
            <summary className="cursor-pointer font-semibold">
              นิยามและข้อจำกัดของการวิเคราะห์
            </summary>
            <p className="mt-3 leading-7 text-slate-500">
              ใช้วันที่รายงาน (date_report) และวันตามเวลาไทย
              เปรียบเทียบจำนวนวันเท่ากัน รหัสความเสี่ยงและสัญญาณซ้ำใช้เฉพาะ NRLS
              ที่ยืนยันแล้ว จึงอาจครอบคลุมข้อมูลเก่าไม่ครบ ความรุนแรงสูงใช้ G–I
              และ 4–5 ตามกลุ่มระดับของระบบ
              ไม่มีตัวหารปริมาณบริการจึงยังสรุปอัตราหรือแนวโน้มทางสถิติไม่ได้
              ข้อมูลหน่วยงานหมายถึงหน่วยงานของรายงาน
              ยังไม่มีการจัดกลุ่มกระบวนการที่เป็นมาตรฐาน ผลรวม RCA และ CAPA
              เป็นจำนวนงานและอาจเกี่ยวกับ Incident เดียวกัน
              ตัวกรองหน่วยงานใช้ร่วมกับทะเบียนด้านล่าง ช่วงวันใช้เฉพาะการวิเคราะห์ Incident
            </p>
          </details>
        </>
      )}
    </section>
  );
}
