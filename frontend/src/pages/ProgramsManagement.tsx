import React, { useState, useEffect } from "react";
import { Search, BookOpen, Edit, X, Save, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";

interface Program {
  program_id: number;
  program_name: string;
}

const ProgramsManagement: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchPrograms();
  }, [token]);

  const fetchPrograms = async () => {
    try {
      const response = await fetch("/programs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch programs");
      const data = await response.json();
      setPrograms(data);
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = programs.filter(
    (p) =>
      p.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.program_id.toString().includes(searchTerm)
  );

  const startEditing = (program: Program) => {
    setEditingId(program.program_id);
    setEditName(program.program_name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSave = async (id: number) => {
    try {
      const response = await fetch(`/programs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          program_name: editName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update program");
      }

      await fetchPrograms();
      setEditingId(null);
      
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: 'อัปเดตข้อมูลโปรแกรมความเสี่ยงเรียบร้อยแล้ว',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error updating program:", error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูลได้',
      });
    }
  };

  const handleAdd = async () => {
    const { value: programName } = await Swal.fire({
      title: 'เพิ่มโปรแกรมความเสี่ยงใหม่',
      input: 'text',
      inputLabel: 'ชื่อโปรแกรมความเสี่ยง',
      inputPlaceholder: 'กรอกชื่อโปรแกรมความเสี่ยง',
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => {
        if (!value) {
          return 'กรุณากรอกชื่อโปรแกรมความเสี่ยง!'
        }
      }
    });

    if (programName) {
      try {
        const response = await fetch("/programs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            program_name: programName,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create program");
        }

        await fetchPrograms();
        
        Swal.fire({
          icon: 'success',
          title: 'เพิ่มสำเร็จ',
          text: 'เพิ่มโปรแกรมความเสี่ยงใหม่เรียบร้อยแล้ว',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error("Error creating program:", error);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถเพิ่มข้อมูลได้',
        });
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-600" />
          จัดการโปรแกรมความเสี่ยง (Risk Programs)
        </h1>
        {isAdmin && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            เพิ่มโปรแกรมใหม่
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="ค้นหาตามรหัส หรือ ชื่อโปรแกรม..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-10">กำลังโหลดข้อมูล...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    รหัส
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อโปรแกรมความเสี่ยง
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      จัดการ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPrograms.map((program) => (
                  <tr key={program.program_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {program.program_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {editingId === program.program_id ? (
                        <input
                          type="text"
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        program.program_name
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === program.program_id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSave(program.program_id)}
                              className="text-green-600 hover:text-green-900 bg-green-50 p-1 rounded"
                              title="บันทึก"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-red-600 hover:text-red-900 bg-red-50 p-1 rounded"
                              title="ยกเลิก"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(program)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1 rounded"
                            title="แก้ไข"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filteredPrograms.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramsManagement;
