import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { deidentifyIncidentText } from '../utils/deidentifyIncidentText';

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

interface RiskSuggestion {
  nrls_code: string;
  name: string;
  group: string | null;
  program_id: number | null;
  local_risk_id: number | null;
  local_risk_name: string | null;
  confidence: number;
  reason: string;
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
  severity: string | null;
  affected: string[] | null;
  detail: string | null;
  risk_suggestions?: RiskSuggestion[];
  reply_message?: string;
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
  const [selectedRiskCode, setSelectedRiskCode] = useState<string | null>(null);
  // Full chat history for Gemini multi-turn context
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);

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
    severity: null,
    affected: null,
    detail: null,
    risk_suggestions: [],
    reply_message: undefined,
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
  }, [isOpen, messages.length]);

  // Calculate completeness progress
  useEffect(() => {
    const fields = [
      currentExtraction.date_report,
      currentExtraction.time_report,
      currentExtraction.duration_name,
      currentExtraction.location_id,
      currentExtraction.detail,
      selectedRiskCode,
      currentExtraction.level_id,
    ];
    setProgress(Math.round(fields.filter(Boolean).length * 100 / fields.length));
  }, [currentExtraction, selectedRiskCode]);

  if (!isOpen) return null;

  // Simple rule-based NLP parser simulating the System Prompt
  const parseNaturalLanguage = (text: string, current: ExtractedJSON): ExtractedJSON => {
    const updated = { ...current };

    // 1. Date Extraction
    if (text.includes('เมื่อวาน') || text.includes('เมื่อวานนี้')) {
      updated.date_report = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    } else if (text.includes('วันนี้') || text.includes('เมื่อเช้า') || text.includes('เมื่อกี้')) {
      updated.date_report = format(new Date(), 'yyyy-MM-dd');
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
    const timeRegex = /(?<![.\d])(\d{1,2})[.:](\d{2})(?![.:\d])/;
    const numMatch = timeRegex.exec(text);
    if (numMatch && Number(numMatch[1]) <= 23 && Number(numMatch[2]) <= 59) {
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
      } else if (text.includes('เวรบ่าย') || text.includes('ตอนบ่าย') || text.includes('ตอนเย็น')) {
        updated.duration_name = 'บ่าย';
      } else if (text.includes('เวรดึก') || text.includes('ตอนดึก') || text.includes('กลางคืน')) {
        updated.duration_name = 'ดึก';
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
    let matchedRisk: any = null;
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
        matchedRisk = r;
      }
    }

    // Fallback risk detection
    if (!updated.risk_id) {
      if (text.includes('ตกเตียง') || text.includes('หกล้ม') || text.includes('ลื่นล้ม')) {
        const fallback = risks.find(r => r.risk_name.includes('หกล้ม') || r.risk_name.includes('ตกเตียง'));
        if (fallback) {
          updated.riskstore_name = fallback.risk_name;
          updated.risk_id = String(fallback.id);
          matchedRisk = fallback;
        }
      } else if (text.includes('ยา') && (text.includes('ผิด') || text.includes('คลาดเคลื่อน'))) {
        const fallback = risks.find(r => r.risk_name.includes('คลาดเคลื่อน') || r.risk_name.includes('จ่ายยา'));
        if (fallback) {
          updated.riskstore_name = fallback.risk_name;
          updated.risk_id = String(fallback.id);
          matchedRisk = fallback;
        }
      }
    }

    if (!matchedRisk && updated.risk_id) {
      matchedRisk = risks.find((risk) => String(risk.id) === String(updated.risk_id));
    }
    if (matchedRisk?.nrls_code) {
      updated.risk_suggestions = [{
        nrls_code: matchedRisk.nrls_code,
        name: matchedRisk.risk_name,
        group: null,
        program_id: matchedRisk.program_id || null,
        local_risk_id: Number(matchedRisk.id),
        local_risk_name: matchedRisk.riskstore_full || matchedRisk.risk_name,
        confidence: 60,
        reason: 'จับคู่เบื้องต้นจากคำสำคัญกับรายการความเสี่ยงเดิมของโรงพยาบาล',
      }];
    }

    // A keyword alone cannot establish the NRLS severity. Leave this for the reporter.

    // 7. Affected Persons
    const affectedList: string[] = [];
    if (text.includes('คนไข้') || text.includes('ผู้ป่วย') || text.includes('ผู้รับบริการ')) affectedList.push('ผู้ป่วย');
    if (text.includes('พยาบาล') || text.includes('หมอ') || text.includes('เจ้าหน้าที่') || text.includes('เภสัช')) affectedList.push('เจ้าหน้าที่');
    if (text.includes('ญาติ')) affectedList.push('ญาติ');
    if (affectedList.length > 0) {
      updated.affected = affectedList;
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue;
    const userMsg: Message = { sender: 'user', text: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    const newHistory = [...chatHistory, { role: 'user', text: userText }];
    setChatHistory(newHistory);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/incidents/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newHistory.map((message) => ({
            ...message,
            text: deidentifyIncidentText(message.text),
          })),
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody?.message || 'ไม่สามารถเชื่อมต่อผู้ช่วย AI ได้');
      }
      const aiData: ExtractedJSON = await res.json();
      if (!aiData || typeof aiData !== 'object' || Array.isArray(aiData)) {
        throw new Error('AI returned an invalid response');
      }

      // Match location_id from master data using location_name returned by AI
      if (aiData.location_name) {
        const locMatch = locations.find(l =>
          l.name.toLowerCase().includes(aiData.location_name!.toLowerCase()) ||
          aiData.location_name!.toLowerCase().includes(l.name.toLowerCase())
        );
        if (locMatch) { aiData.location_id = String(locMatch.id); aiData.location_name = locMatch.name; }
      }
      if (!locations.some(location => String(location.id) === String(aiData.location_id))) {
        aiData.location_id = null;
      }

      // Match risk_id from master data using riskstore_name returned by AI
      if (aiData.riskstore_name && !aiData.risk_suggestions?.length) {
        const riskMatch = risks.find(r =>
          r.risk_name.toLowerCase().includes(aiData.riskstore_name!.toLowerCase()) ||
          aiData.riskstore_name!.toLowerCase().includes(r.risk_name.toLowerCase())
        );
        if (riskMatch) { aiData.risk_id = String(riskMatch.id); aiData.riskstore_name = riskMatch.risk_name; }
      }
      if (!risks.some(risk => String(risk.id) === String(aiData.risk_id))) {
        aiData.risk_id = null;
      }

      // Merge with current extraction (accumulate)
      const nextSuggestions = aiData.risk_suggestions?.length
        ? aiData.risk_suggestions
        : (currentExtraction.risk_suggestions || []);
      const merged: ExtractedJSON = {
        date_report: aiData.date_report || currentExtraction.date_report,
        time_report: aiData.time_report || currentExtraction.time_report,
        duration_name: aiData.duration_name || currentExtraction.duration_name,
        location_name: aiData.location_name || currentExtraction.location_name,
        location_id: aiData.location_id || currentExtraction.location_id,
        riskstore_name: aiData.riskstore_name || currentExtraction.riskstore_name,
        risk_id: aiData.risk_id || currentExtraction.risk_id,
        level_id: aiData.level_id || currentExtraction.level_id,
        severity: aiData.severity || currentExtraction.severity,
        affected: aiData.affected || currentExtraction.affected,
        detail: aiData.detail || currentExtraction.detail,
        risk_suggestions: nextSuggestions,
        reply_message: aiData.reply_message,
        clarification_question: aiData.clarification_question,
      };
      setCurrentExtraction(merged);
      setSelectedRiskCode((previous) => (
        previous && nextSuggestions.some((suggestion) => suggestion.nrls_code === previous)
          ? previous
          : null
      ));

      let replyText = '';
      if (merged.reply_message) {
        replyText = merged.reply_message;
        
        // If data is complete and it's summarizing, add the final call to action
        if (!merged.clarification_question) {
          replyText += `\n\nรบกวนตรวจทานความถูกต้อง:\n` +
            `📅 วันที่: ${merged.date_report}\n` +
            `⏰ เวลา: ${merged.time_report} น. (เวร${merged.duration_name || ''})\n` +
            `📍 สถานที่: ${merged.location_name || 'ไม่ระบุ'}\n` +
            `⚠️ ชื่อความเสี่ยง: ${merged.riskstore_name || 'ไม่ระบุ'}\n` +
            `🚨 ระดับ: ${merged.level_id || '-'} (ผลกระทบ: ${merged.severity || '-'})\n` +
            `👥 ผู้ได้รับผลกระทบ: ${merged.affected?.join(', ') || '-'}\n` +
            `📝 รายละเอียด: "${merged.detail}"\n\n` +
            `หากข้อมูลถูกต้อง กดปุ่ม **"นำข้อมูลกรอกลงแบบฟอร์ม"** ได้เลยค่ะ!`;
        }
      } else if (merged.clarification_question) {
        replyText = merged.clarification_question;
      } else {
        replyText =
          `🎉 ยอดเยี่ยมค่ะ! สกัดข้อมูลครบถ้วนแล้ว รบกวนตรวจทานก่อนกรอกลงฟอร์มนะคะ:\n\n` +
          `📅 วันที่: ${merged.date_report}\n` +
          `⏰ เวลา: ${merged.time_report} น. (เวร${merged.duration_name || ''})\n` +
          `📍 สถานที่: ${merged.location_name || 'ไม่ระบุ'}\n` +
          `⚠️ ชื่อความเสี่ยง: ${merged.riskstore_name || 'ไม่ระบุ'}\n` +
          `🚨 ระดับ: ${merged.level_id || '-'} (ผลกระทบ: ${merged.severity || '-'})\n` +
          `👥 ผู้ได้รับผลกระทบ: ${merged.affected?.join(', ') || '-'}\n` +
          `📝 รายละเอียด: "${merged.detail}"\n\n` +
          `หากข้อมูลถูกต้อง กดปุ่ม **"นำข้อมูลกรอกลงแบบฟอร์ม"** ได้เลยค่ะ!`;
      }

      const botResponse = { role: 'model', text: replyText };
      setChatHistory(prev => [...prev, botResponse]);
      setMessages(prev => [...prev, { sender: 'bot', text: replyText, timestamp: new Date(), extractedData: merged }]);

    } catch (err) {
      // Fallback to rule-based if API fails
      const nextExtraction = parseNaturalLanguage(userText, currentExtraction);
      setCurrentExtraction(nextExtraction);
      const unavailableReason = err instanceof Error && err.message.toLowerCase().includes('disabled')
        ? 'โรงพยาบาลยังไม่ได้เปิดใช้งานบริการ AI ภายนอก'
        : 'ไม่สามารถเชื่อมต่อบริการ AI ได้ชั่วคราว';
      const fallbackText = nextExtraction.clarification_question
        ? `${unavailableReason} จึงใช้การช่วยกรอกแบบพื้นฐาน: ${nextExtraction.clarification_question}`
        : `${unavailableReason} จึงใช้การช่วยกรอกแบบพื้นฐาน กรุณาตรวจทานข้อความ หัวข้อความเสี่ยง และเลือกระดับความรุนแรงเองก่อนส่งค่ะ`;
      setChatHistory(prev => [...prev, { role: 'model', text: fallbackText }]);
      setMessages(prev => [...prev, { sender: 'bot', text: fallbackText, timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApplyToForm = () => {
    const selectedSuggestion = currentExtraction.risk_suggestions?.find(
      (suggestion) => suggestion.nrls_code === selectedRiskCode,
    );
    onApply({
      ...currentExtraction,
      nrls_code: selectedSuggestion?.nrls_code || null,
      nrls_name: selectedSuggestion?.name || null,
      risk_id: selectedSuggestion?.local_risk_id ? String(selectedSuggestion.local_risk_id) : null,
      riskstore_name: selectedSuggestion?.local_risk_name || selectedSuggestion?.name || null,
      program_id: selectedSuggestion?.program_id || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-[86vh] rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-900/50 flex flex-col overflow-hidden">
        
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
              <p className="text-[10px] text-purple-100 opacity-90">ช่วยเรียบเรียงและเสนอหัวข้อความเสี่ยง · โปรดตรวจทานก่อนใช้</p>
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

          {(currentExtraction.detail || Boolean(currentExtraction.risk_suggestions?.length)) && (
            <div className="ml-10 space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
              {currentExtraction.detail && (
                <div>
                  <div className="mb-1 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                    ข้อความที่ AI เรียบเรียง (แก้ไขต่อในแบบฟอร์มได้)
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {currentExtraction.detail}
                  </p>
                </div>
              )}

              {Boolean(currentExtraction.risk_suggestions?.length) && (
                <div className="space-y-2 border-t border-indigo-200 pt-3 dark:border-indigo-900">
                  <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                    หัวข้อความเสี่ยงที่แนะนำ — กรุณาเลือก 1 รายการ
                  </div>
                  {currentExtraction.risk_suggestions?.map((suggestion) => {
                    const selected = selectedRiskCode === suggestion.nrls_code;
                    return (
                      <button
                        type="button"
                        key={suggestion.nrls_code}
                        onClick={() => setSelectedRiskCode(suggestion.nrls_code)}
                        className={`w-full rounded-xl border p-3 text-left transition ${selected
                          ? 'border-indigo-500 bg-white ring-2 ring-indigo-200 dark:bg-slate-900 dark:ring-indigo-900'
                          : 'border-slate-200 bg-white/70 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${selected ? 'border-indigo-600 bg-indigo-600 ring-2 ring-white' : 'border-slate-400'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                              {suggestion.nrls_code} · {suggestion.name}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                              ความสอดคล้อง {suggestion.confidence}% — {suggestion.reason}
                            </span>
                            {suggestion.local_risk_name && (
                              <span className="mt-1 block text-[11px] text-indigo-600 dark:text-indigo-400">
                                เชื่อมกับรายการของโรงพยาบาล: {suggestion.local_risk_name}
                              </span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedRiskCode(null)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${selectedRiskCode === null
                      ? 'border-slate-500 bg-slate-100 font-semibold dark:bg-slate-800'
                      : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    ยังไม่เลือก — จะค้นหาและเลือกเองในแบบฟอร์ม
                  </button>
                </div>
              )}
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                AI เป็นผู้ช่วยร่างข้อมูล ผู้รายงานต้องตรวจสอบข้อเท็จจริง ระดับความรุนแรง และหัวข้อความเสี่ยงก่อนส่ง
              </p>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Action Panel / Extracted Summary if complete */}
        {(currentExtraction.detail || selectedRiskCode) && (
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{selectedRiskCode ? `เลือก ${selectedRiskCode} แล้ว` : 'พร้อมนำข้อความไปกรอก โดยยังไม่เลือกหัวข้อความเสี่ยง'}</span>
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
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          ระบบปกปิดชื่อ, HN, AN, VN, เลขบัตร, เบอร์โทร และอีเมลก่อนส่งให้ AI อีกชั้น — เพื่อความปลอดภัย กรุณาไม่พิมพ์ข้อมูลเหล่านี้หากไม่จำเป็น
        </div>
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
