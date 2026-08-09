import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  risks: any[];
  locations: any[];
  onApply: (extractedData: any) => void;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  extractedData?: ExtractedJSON;
}

interface ExtractedJSON {
  date_report: string | null;
  time_report: string | null;
  duration_name: string | null;
  location_name: string | null;
  location_id: string | null;
  riskstore_name: string | null;
  risk_id: string | null;
  level_id: string | null;
  affected: string[] | null;
  detail: string | null;
  clarification_question: string | null;
}

export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({
  isOpen,
  onClose,
  risks,
  locations,
  onApply,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);

  // Keep track of accumulated extracted values during the conversation
  const [currentExtraction, setCurrentExtraction] = useState<ExtractedJSON>({
    date_report: null,
    time_report: null,
    duration_name: null,
    location_name: null,
    location_id: null,
    riskstore_name: null,
    risk_id: null,
    level_id: null,
    affected: null,
    detail: null,
    clarification_question: null,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          {
            sender: 'bot',
            text: 'สวัสดีค่ะพี่ๆ! หนูคือ "น้อง AI" ผู้ช่วยสกัดข้อมูลรายงานความเสี่ยงอัจฉริยะ 🏥✨\n\nพี่ๆ สามารถพิมพ์เล่าเหตุการณ์ความเสี่ยงด้วยภาษาพูดปกติได้เลยค่ะ เช่น "เมื่อเช้านี้ประมาณ 8.30 น. คนไข้ห้อง 402 ตกเตียงตอนเอื้อมหยิบแก้วน้ำ มีแผลถลอกเล็กน้อยที่เข่า"\n\nเดี๋ยวหนูจะทำการประเมินความรุนแรง ค้นหาหัวข้อความเสี่ยงที่ตรงกัน และกรอกลงฟอร์มให้แบบอัตโนมัติเลยค่ะ! พิมพ์คุยกับหนูได้เลยนะคะ 😊',
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      }, 800);
    }
  }, [isOpen]);

  // Calculate completeness progress
  useEffect(() => {
    let score = 0;
    if (currentExtraction.date_report) score += 25;
    if (currentExtraction.time_report) score += 25;
    if (currentExtraction.location_id) score += 25;
    if (currentExtraction.risk_id) score += 25;
    setProgress(score);
  }, [currentExtraction]);

  if (!isOpen) return null;

  // Simple rule-based NLP parser simulating the System Prompt
  const parseNaturalLanguage = (text: string, current: ExtractedJSON): ExtractedJSON => {
    const updated = { ...current };

    // 1. Date Extraction
    if (text.includes('เมื่อวาน') || text.includes('เมื่อวานนี้')) {
      updated.date_report = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    } else {
      // Default to today if not already set (เมื่อเช้า, วันนี้, or no prior date)
      if (!updated.date_report || text.includes('วันนี้') || text.includes('เมื่อเช้า') || text.includes('เมื่อกี้')) {
        updated.date_report = format(new Date(), 'yyyy-MM-dd');
      }
    }

    // 2. Time Extraction — Thai word mapping
    const thaiHourMap: Record<string, string> = {
      'ตีหนึ่ง': '01', 'ตีสอง': '02', 'ตีสาม': '03', 'ตีสี่': '04', 'ตีห้า': '05',
      'หกโมงเช้า': '06', 'เจ็ดโมงเช้า': '07', 'แปดโมงเช้า': '08', 'เก้าโมงเช้า': '09',
      'สิบโมงเช้า': '10', 'สิบเอ็ดโมง': '11', 'เที่ยง': '12',
      'บ่ายโมง': '13', 'บ่ายสอง': '14', 'บ่ายสาม': '15', 'บ่ายสี่': '16',
      'ห้าโมงเย็น': '17', 'หกโมงเย็น': '18', 'เจ็ดโมงเย็น': '19',
      'แปดโมงเย็น': '20', 'เก้าโมงเย็น': '21', 'สิบโมงคืน': '22', 'สิบเอ็ดโมงคืน': '23',
      'แปดโมง': '08', 'เก้าโมง': '09', 'สิบโมง': '10',
      'เจ็ดโมง': '07', 'หกโมง': '06',
    };
    const thaiMinMap: Record<string, string> = {
      'ครึ่ง': '30', 'สิบห้า': '15', 'สี่สิบห้า': '45',
    };

    // Try digit-based time first (8.30, 08:30, 21.00)
    const timeRegex = /(\d{1,2})[.:](\d{2})/g;
    const numMatch = timeRegex.exec(text);
    if (numMatch) {
      const hours = numMatch[1].padStart(2, '0');
      const minutes = numMatch[2];
      updated.time_report = `${hours}:${minutes}`;
      const hr = parseInt(hours, 10);
      updated.duration_name = hr >= 8 && hr < 16 ? 'เช้า' : hr >= 16 ? 'บ่าย' : 'ดึก';
    } else {
      // Try Thai word time mapping
      let foundThaiHour = '';
      for (const [word, hr] of Object.entries(thaiHourMap)) {
        if (text.includes(word)) { foundThaiHour = hr; break; }
      }
      let foundThaiMin = '00';
      for (const [word, mn] of Object.entries(thaiMinMap)) {
        if (text.includes(word)) { foundThaiMin = mn; break; }
      }
      if (foundThaiHour) {
        updated.time_report = `${foundThaiHour}:${foundThaiMin}`;
        const hr = parseInt(foundThaiHour, 10);
        updated.duration_name = hr >= 8 && hr < 16 ? 'เช้า' : hr >= 16 ? 'บ่าย' : 'ดึก';
      } else if (text.includes('เวรเช้า') || text.includes('ตอนเช้า') || text.includes('เมื่อเช้า')) {
        updated.duration_name = 'เช้า';
        if (!updated.time_report) updated.time_report = '08:00';
      } else if (text.includes('เวรบ่าย') || text.includes('ตอนบ่าย') || text.includes('ตอนเย็น')) {
        updated.duration_name = 'บ่าย';
        if (!updated.time_report) updated.time_report = '13:00';
      } else if (text.includes('เวรดึก') || text.includes('ตอนดึก') || text.includes('กลางคืน')) {
        updated.duration_name = 'ดึก';
        if (!updated.time_report) updated.time_report = '01:00';
      } else if (!updated.time_report && updated.duration_name === 'เช้า') {
        updated.time_report = '08:00'; // already know shift, apply safe default
      } else if (!updated.time_report && updated.duration_name === 'บ่าย') {
        updated.time_report = '13:00';
      } else if (!updated.time_report && updated.duration_name === 'ดึก') {
        updated.time_report = '01:00';
      }
    }

    // 4. Location Matching (from database locations master)
    for (const loc of locations) {
      const cleanLocName = loc.name.toLowerCase();
      if (text.toLowerCase().includes(cleanLocName) || 
          (cleanLocName.includes('opd') && (text.includes('ผู้ป่วยนอก') || text.toLowerCase().includes('opd'))) ||
          (cleanLocName.includes('er') && (text.includes('ฉุกเฉิน') || text.toLowerCase().includes('er'))) ||
          (cleanLocName.includes('ipd') && (text.includes('ผู้ป่วยใน') || text.toLowerCase().includes('ipd')))) {
        updated.location_name = loc.name;
        updated.location_id = String(loc.id);
        break;
      }
    }

    // Fallback location parsing if not matching exact database names
    if (!updated.location_id) {
      const locationsKeywords = ['ห้อง 402', 'ห้อง 501', 'ตึกสงฆ์', 'ห้องจ่ายยา', 'ห้องตรวจ', 'ห้องน้ำ', 'วอร์ด', 'ICU', 'LR', 'OR'];
      for (const kw of locationsKeywords) {
        if (text.includes(kw)) {
          // Find closest database location mapping or set temporary text
          const matched = locations.find(l => l.name.toLowerCase().includes(kw.toLowerCase()));
          if (matched) {
            updated.location_name = matched.name;
            updated.location_id = String(matched.id);
          } else {
            updated.location_name = kw;
          }
          break;
        }
      }
    }

    // 5. Risk Topic Matching (from database risks master)
    let bestRiskScore = 0;
    for (const r of risks) {
      const riskName = r.risk_name.toLowerCase();
      let score = 0;
      if (text.includes('ตกเตียง') && (riskName.includes('ตกเตียง') || riskName.includes('หกล้ม'))) score += 10;
      if (text.includes('หกล้ม') && (riskName.includes('หกล้ม') || riskName.includes('ล้ม'))) score += 10;
      if (text.includes('จ่ายยาผิด') && (riskName.includes('คลาดเคลื่อนทางยา') || riskName.includes('จ่ายยา'))) score += 10;
      if (text.includes('แพ้ยา') && riskName.includes('แพ้ยา')) score += 10;
      if (text.includes('ระบุตัวผิด') && riskName.includes('ระบุตัว')) score += 10;
      if (text.includes('สลับตัว') && riskName.includes('ระบุตัว')) score += 5;
      if (text.includes('ชำรุด') && (riskName.includes('ชำรุด') || riskName.includes('อุปกรณ์'))) score += 10;
      if (text.includes('เข็มตำ') && riskName.includes('เข็มตำ')) score += 10;

      if (score > bestRiskScore) {
        bestRiskScore = score;
        updated.riskstore_name = r.risk_name;
        updated.risk_id = String(r.id);
      }
    }

    // Fallback risk detection
    if (!updated.risk_id) {
      if (text.includes('ตกเตียง') || text.includes('หกล้ม') || text.includes('ลื่นล้ม')) {
        const fallback = risks.find(r => r.risk_name.includes('หกล้ม') || r.risk_name.includes('ตกเตียง'));
        if (fallback) {
          updated.riskstore_name = fallback.risk_name;
          updated.risk_id = String(fallback.id);
        }
      } else if (text.includes('ยา') && (text.includes('ผิด') || text.includes('คลาดเคลื่อน'))) {
        const fallback = risks.find(r => r.risk_name.includes('คลาดเคลื่อน') || r.risk_name.includes('จ่ายยา'));
        if (fallback) {
          updated.riskstore_name = fallback.risk_name;
          updated.risk_id = String(fallback.id);
        }
      }
    }

    // 6. Severity Level ID
    if (text.includes('เสียชีวิต') || text.includes('ตาย')) {
      updated.level_id = 'I';
    } else if (text.includes('cpr') || text.includes('กู้ชีพ') || text.includes('วิกฤต')) {
      updated.level_id = 'H';
    } else if (text.includes('พิการ') || text.includes('ถาวร')) {
      updated.level_id = 'G';
    } else if (text.includes('แผลถลอก') || text.includes('ฟกช้ำ') || text.includes('บาดเจ็บเล็กน้อย') || text.includes('ทำแผล')) {
      updated.level_id = 'C';
    } else if (text.includes('ไม่ได้รับบาดเจ็บ') || text.includes('ปลอดภัยดี') || text.includes('ไม่เกิดอันตราย')) {
      updated.level_id = 'B';
    } else if (!updated.level_id) {
      updated.level_id = 'A'; // default start level
    }

    // 7. Affected Persons
    const affectedList: string[] = [];
    if (text.includes('คนไข้') || text.includes('ผู้ป่วย') || text.includes('ผู้รับบริการ')) affectedList.push('ผู้ป่วย');
    if (text.includes('พยาบาล') || text.includes('หมอ') || text.includes('เจ้าหน้าที่') || text.includes('เภสัช')) affectedList.push('เจ้าหน้าที่');
    if (text.includes('ญาติ')) affectedList.push('ญาติ');
    if (affectedList.length > 0) {
      updated.affected = affectedList;
    } else if (!updated.affected) {
      updated.affected = ['ผู้ป่วย']; // default
    }

    // 8. Detail construction (professional clinical summary)
    if (!updated.detail) {
      updated.detail = text;
    } else if (text !== current.detail) {
      // Append additional answers to clarify detail
      updated.detail = `${updated.detail}\nข้อมูลเพิ่มเติม: ${text}`;
    }

    // 9. Check missing fields — separate each case for clear UX
    if (!updated.date_report) {
      updated.clarification_question = 'เหตุการณ์นี้เกิดขึ้นวันไหนคะ? (เช่น "วันนี้" "เมื่อวาน" หรือ "วันที่ 9 สิงหาคม")';
    } else if (!updated.time_report) {
      updated.clarification_question = 'ขอทราบเวลาที่เกิดเหตุด้วยนะคะ? (เช่น "09.30 น." "แปดโมงเช้า" "เวรเช้า" "บ่ายสอง")';
    } else if (!updated.risk_id) {
      updated.clarification_question = 'ช่วยบอกประเภทของเหตุการณ์ด้วยได้ไหมคะ? (เช่น ตกเตียง/หกล้ม, จ่ายยาผิด/ยาคลาดเคลื่อน, เครื่องมือชำรุด, สลับตัวผู้ป่วย)';
    } else if (!updated.location_id) {
      updated.clarification_question = 'เหตุการณ์นี้เกิดที่จุดไหนของโรงพยาบาลคะ? (เช่น IPD ผู้ป่วยใน, OPD ผู้ป่วยนอก, ER ห้องฉุกเฉิน, ห้องผ่าตัด OR, หรือ ICU)';
    } else {
      updated.clarification_question = null;
    }

    return updated;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      // Analyze current conversation
      const nextExtraction = parseNaturalLanguage(inputValue, currentExtraction);
      setCurrentExtraction(nextExtraction);

      let replyText = '';
      if (nextExtraction.clarification_question) {
        replyText = `หนูได้รับข้อมูลเพิ่มแล้วค่ะ! 🔍\n\n${nextExtraction.clarification_question}`;
      } else {
        replyText = `🎉 ยอดเยี่ยมค่ะ! หนูวิเคราะห์สกัดข้อมูลได้ครบถ้วนและพร้อมกรอกลงฟอร์มแล้วค่ะ รบกวนพี่ๆ ตรวจทานความถูกต้องเบื้องต้นดังนี้นะคะ:\n\n` +
          `📅 **วันที่เกิดเหตุ**: ${nextExtraction.date_report}\n` +
          `⏰ **เวลาเกิดเหตุ**: ${nextExtraction.time_report} น. (เวร${nextExtraction.duration_name || 'เช้า'})\n` +
          `📍 **สถานที่**: ${nextExtraction.location_name || 'ไม่ระบุ'}\n` +
          `⚠️ **ชื่อความเสี่ยง**: ${nextExtraction.riskstore_name || 'ไม่พบการจัดประเภทหลัก'}\n` +
          `🚨 **ระดับความรุนแรง**: ระดับ ${nextExtraction.level_id}\n` +
          `👥 **ผู้ได้รับผลกระทบ**: ${nextExtraction.affected?.join(', ')}\n` +
          `📝 **รายละเอียดสรุป**: "${nextExtraction.detail}"\n\n` +
          `หากข้อมูลถูกต้องครบถ้วนแล้ว สามารถกดปุ่ม **"นำข้อมูลกรอกลงแบบฟอร์ม"** ด้านล่างได้ทันทีเลยค่ะ!`;
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: replyText,
          timestamp: new Date(),
          extractedData: nextExtraction,
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const handleApplyToForm = () => {
    onApply(currentExtraction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-[80vh] rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-900/50 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <Bot className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                น้อง AI ช่วยเขียนรายงานอุบัติการณ์
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </h3>
              <p className="text-[10px] text-purple-100 opacity-90">ระบบวิเคราะห์ข้อมูลอัตโนมัติอัจฉริยะ (Offline NLP Engine)</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar (Completeness) */}
        <div className="px-5 py-2 bg-purple-50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30 flex items-center justify-between text-xs font-semibold shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">ความครบถ้วนของข้อมูลฟอร์ม:</span>
            <span className={progress === 100 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-purple-700 dark:text-purple-400'}>
              {progress}%
            </span>
          </div>
          <div className="w-32 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                progress <= 25 ? 'bg-red-500' : 
                progress <= 50 ? 'bg-amber-500' : 
                progress <= 75 ? 'bg-indigo-500' : 
                'bg-emerald-500'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/10">
          {messages.map((msg, index) => (
            <div 
              key={index}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'bot' && (
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm border ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white border-primary/20 rounded-tr-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-850 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-850 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                <span className="text-xs text-slate-400 font-semibold">น้อง AI กำลังสกัดข้อมูล...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Action Panel / Extracted Summary if complete */}
        {progress >= 50 && (
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>ข้อมูลเบื้องต้นพร้อมนำเข้าหน้ารายงานแล้ว</span>
            </div>
            <button
              type="button"
              onClick={handleApplyToForm}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              นำข้อมูลกรอกลงแบบฟอร์ม
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="เล่าเหตุการณ์ความเสี่ยงที่เกิดขึ้นที่นี่..."
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all text-slate-800 dark:text-white disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={isTyping || !inputValue.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="ส่ง"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
