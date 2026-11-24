"use client";
// Printable payslip. Use the browser's "Print → Save as PDF" to download it.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PrinterIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Notice, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { OVERTIME_RATE, computePay, formatMoney } from "@/lib/hr";

export default function PayslipPage() {
  const { employeeId, payslipId } = useParams();
  const [data, setData] = useState(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/data")
      .then((list) => {
        const emp = list.find((e) => e.id === Number(employeeId));
        const slip = emp?.payroll?.payslips?.find((p) => String(p.id) === String(payslipId));
        setData(emp && slip ? { emp, slip } : null);
      })
      .catch((e) => setError(e.message));
  }, [employeeId, payslipId]);

  if (error) return <div className="p-6"><Notice notice={{ type: "error", text: error }} /></div>;
  if (data === undefined) return <Spinner />;
  if (data === null) return <p className="text-center mt-10 text-red-500">Payslip not found.</p>;

  const { emp, slip } = data;
  // Payslips store a snapshot; fall back to current values for very old ones.
  const pay = slip.gross !== undefined ? slip : computePay(emp.payroll);
  const p = emp.profile || {};

  return (
    <div className="p-6">
      <div className="no-print flex justify-between mb-4 max-w-3xl mx-auto">
        <Link href="/auth/payroll" className="flex items-center gap-1 text-blue-600 hover:underline">
          <ArrowLeftIcon className="w-4 h-4" /> Back to payroll
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          <PrinterIcon className="w-5 h-5" /> Print / Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white border rounded-xl p-8 shadow-sm print:shadow-none print:border-0">
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">B</div>
              <span className="text-xl font-bold">Berbou HRM</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Payslip</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{slip.month} {slip.year}</p>
            {slip.generated_at && (
              <p className="text-xs text-gray-500">Issued {new Date(slip.generated_at).toLocaleDateString("fr-FR")}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="font-semibold">{p.first_name} {p.last_name}</p>
            <p className="text-gray-600">{p.job_title}</p>
            <p className="text-gray-600">{p.department}</p>
          </div>
          <div className="text-right text-gray-600">
            <p>Employee ID: {emp.id}</p>
            <p>Contract: {p.contract}</p>
            <p>Hired: {p.hire_date}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Base</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">Base salary</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">{formatMoney(pay.salary)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Overtime</td>
              <td className="py-2 text-right">{pay.overtimeHours} h</td>
              <td className="py-2 text-right">{formatMoney(pay.hourlyRate * OVERTIME_RATE)}/h</td>
              <td className="py-2 text-right">{formatMoney(pay.overtimePay)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Bonuses</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">—</td>
              <td className="py-2 text-right">{formatMoney(pay.bonuses)}</td>
            </tr>
            <tr className="border-b font-semibold">
              <td className="py-2" colSpan={3}>Gross pay</td>
              <td className="py-2 text-right">{formatMoney(pay.gross)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2" colSpan={3}>Deductions</td>
              <td className="py-2 text-right">− {formatMoney(pay.deductions)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="text-lg font-bold">
              <td className="pt-4" colSpan={3}>Net pay</td>
              <td className="pt-4 text-right text-blue-700">{formatMoney(pay.net)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 text-xs text-gray-400">
          Simplified payslip generated by Berbou HRM. Overtime is paid at {OVERTIME_RATE * 100} % of the hourly rate
          (monthly salary ÷ 151.67 h).
        </p>
      </div>
    </div>
  );
}
