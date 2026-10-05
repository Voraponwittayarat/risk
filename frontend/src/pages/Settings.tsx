import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import {
  BellRing,
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  ListChecks,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../contexts/AuthContext";

interface SettingsLink {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
}

const peopleLinks: SettingsLink[] = [
  {
    to: "/personnel",
    title: "ข้อมูลบุคลากร",
    description: "เตรียมรายชื่อ สังกัด ตำแหน่ง และสิทธิ์เบื้องต้นก่อนลงทะเบียน",
    icon: UsersRound,
    iconClassName: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    to: "/users",
    title: "บัญชีผู้ใช้งาน",
    description: "ดูบัญชีที่ลงทะเบียนแล้วและจัดการสิทธิ์การเข้าใช้งาน",
    icon: KeyRound,
    iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
];

const referenceLinks: SettingsLink[] = [
  {
    to: "/risk-topics",
    title: "ชื่อความเสี่ยง",
    description: "จัดการหัวข้อความเสี่ยงที่ใช้บันทึกเหตุการณ์",
    icon: ListChecks,
    iconClassName: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  {
    to: "/nrls-topics",
    title: "ชื่อความเสี่ยง NRLS",
    description: "จัดการหัวข้อตามมาตรฐาน NRLS",
    icon: BookOpen,
    iconClassName: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  },
  {
    to: "/programs",
    title: "โปรแกรมความเสี่ยง",
    description: "กำหนดโปรแกรมสำหรับจัดกลุ่มและติดตามความเสี่ยง",
    icon: ShieldCheck,
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
];

function SettingsCategory({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4" aria-label={title}>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">{label}</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SettingsLinkCard({ item }: { item: SettingsLink }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconClassName}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-slate-900 dark:text-white">{item.title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</span>
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
    </Link>
  );
}

export default function Settings() {
  const { isAdmin, user } = useAuth();
  const canManageManuals = isAdmin || (user?.role === 'rm_committee' && user?.rmScope === 'hospital');
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [rcaAppointmentsEnabled, setRcaAppointmentsEnabled] = useState(true);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [settingsLoadError, setSettingsLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    axios
      .get("/incidents/telegram/settings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setTelegramToken(res.data.botToken || "");
        setTelegramChatId(res.data.chatId || "");
        setRcaAppointmentsEnabled(res.data.rcaAppointmentsEnabled !== false);
        setSettingsLoadError(false);
      })
      .catch(() => setSettingsLoadError(true));
  }, [isAdmin]);

  const handleSaveTelegramSettings = async () => {
    setIsSaving(true);
    try {
      await axios.post(
        "/incidents/telegram/settings",
        { botToken: telegramToken, chatId: telegramChatId, rcaAppointmentsEnabled },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      setSettingsLoadError(false);
      Swal.fire("สำเร็จ", "บันทึกการตั้งค่า Telegram สำเร็จ", "success");
    } catch (err) {
      Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า", "error");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSummary = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการส่งแจ้งเตือน",
      text: "คุณต้องการส่งข้อความสรุปยอดค้างไปยัง Telegram ทันทีหรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ใช่, ส่งเลย",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    setIsSending(true);
    try {
      await axios.post(
        "/incidents/telegram/trigger-summary",
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      );
      Swal.fire("สำเร็จ", "ส่งแจ้งเตือนสำเร็จแล้ว", "success");
    } catch (err) {
      Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการส่งแจ้งเตือน", "error");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Settings2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ตั้งค่าระบบ</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              เลือกหมวดที่ต้องการจัดการ ข้อมูลบุคลากรและบัญชีผู้ใช้แยกกันเพื่อให้ค้นหาได้ง่าย
            </p>
          </div>
        </div>
      </header>

      <SettingsCategory label="คู่มือ" title="คู่มือการใช้งาน" description="คู่มือ PDF สำหรับผู้ปฏิบัติงานทั่วไปและผู้บริหารความเสี่ยง">
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsLinkCard item={{to:'/manuals',title:'เปิดอ่านคู่มือ',description:'เลือกคู่มือตามหน้าที่ เปิดอ่านหรือดาวน์โหลด PDF',icon:BookOpen,iconClassName:'bg-teal-100 text-teal-700'}}/>
          {canManageManuals && <SettingsLinkCard item={{to:'/settings/manuals',title:'อัปโหลด / อัปเดตคู่มือ PDF',description:'เผยแพร่คู่มือฉบับใหม่แยกตามกลุ่มผู้อ่าน',icon:BookOpen,iconClassName:'bg-blue-100 text-blue-700'}}/>}
        </div>
      </SettingsCategory>
      {isAdmin ? (
        <>
          <SettingsCategory
            label="01 · ผู้ใช้งาน"
            title="บุคลากรและสิทธิ์"
            description="จัดเตรียมข้อมูลก่อนลงทะเบียน และจัดการบัญชีที่เข้าใช้งานระบบแล้ว"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {peopleLinks.map((item) => <SettingsLinkCard key={item.to} item={item} />)}
            </div>
          </SettingsCategory>

          <SettingsCategory
            label="02 · ข้อมูลอ้างอิง"
            title="ข้อมูลพื้นฐานความเสี่ยง"
            description="หัวข้อและโปรแกรมที่ใช้เป็นตัวเลือกในงานบันทึกและติดตามความเสี่ยง"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {referenceLinks.map((item) => <SettingsLinkCard key={item.to} item={item} />)}
            </div>
          </SettingsCategory>

          <SettingsCategory
            label="03 · การสื่อสาร"
            title="การแจ้งเตือน"
            description="ตั้งค่าช่องทางส่งข้อความและกำหนดรายการแจ้งเตือนอัตโนมัติ"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <SettingsLinkCard item={{
                to: "/telegram-settings",
                title: "แจ้งเตือนรายหน่วยงาน",
                description: "จัดการผู้รับและรูปแบบข้อความ Telegram ของแต่ละหน่วยงาน",
                icon: Send,
                iconClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
              }} />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <BellRing className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Telegram สรุปยอดค้าง</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ส่งอัตโนมัติทุกวันศุกร์ 08:00 น. หรือส่งด้วยตัวเอง</p>
                  </div>
                </div>

                {settingsLoadError && (
                  <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    โหลดการตั้งค่า Telegram ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่ก่อนบันทึก
                  </p>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Bot Token
                    <span className="relative mt-2 block">
                      <input
                        type={showTelegramToken ? "text" : "password"}
                        value={telegramToken}
                        onChange={(event) => setTelegramToken(event.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-11 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTelegramToken((current) => !current)}
                        aria-label={showTelegramToken ? "ซ่อน Bot Token" : "แสดง Bot Token"}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-blue-600"
                      >
                        {showTelegramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Chat ID
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(event) => setTelegramChatId(event.target.value)}
                      placeholder="ใส่เครื่องหมายลบด้านหน้าหากเป็นกลุ่ม"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={rcaAppointmentsEnabled}
                    onChange={(event) => setRcaAppointmentsEnabled(event.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>แจ้งนัดทบทวนศูนย์ RCA ด้วย Bot และกลุ่มเดียวกับการแจ้งความเสี่ยงระดับ E/3 ขึ้นไป</span>
                </label>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSaveTelegramSettings}
                    disabled={isSaving || settingsLoadError}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                  </button>
                  <button
                    type="button"
                    onClick={handleTriggerSummary}
                    disabled={isSending}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? "กำลังส่ง..." : "ส่งสรุปยอดค้างตอนนี้"}
                  </button>
                </div>
              </div>
            </div>
          </SettingsCategory>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          การจัดการบุคลากร บัญชี และข้อมูลอ้างอิงเป็นสิทธิ์ของผู้ดูแลระบบ หากต้องการแก้ไข กรุณาติดต่อผู้ดูแลระบบ
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          การเข้าถึงระบบ
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          ระบบใช้สิทธิ์จริงจากบัญชีผู้ใช้ รองรับผู้ดูแลระบบ คณะกรรมการ RM หัวหน้าหน่วยงาน และเจ้าหน้าที่
          บัญชีที่ถูกระงับจะเข้าสู่ระบบไม่ได้
        </p>
      </div>
    </div>
  );
}
