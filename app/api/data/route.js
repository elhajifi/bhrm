import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data.json");

export async function GET() {
    const data = await fs.readFile(filePath, "utf-8");
    return new Response(data, { status: 200 });
}

export async function POST(req) {
    const body = await req.json();

    // Validate required fields
    if (!body.profile || !body.profile.first_name || !body.profile.last_name) {
        return new Response(JSON.stringify({ error: "Invalid employee data" }), { status: 400 });
    }

    // Read existing employees
    const data = await fs.readFile(filePath, "utf-8");
    const employees = JSON.parse(data);

    // Create new employee
    const newEmployee = {
        id: Date.now(),
        profile: {
            first_name: body.profile.first_name,
            last_name: body.profile.last_name,
            contract: body.profile.contract || "CDI",
            job_title: body.profile.job_title || "",
            hire_date: body.profile.hire_date || new Date().toISOString().split("T")[0],
            current_projects: body.profile.current_projects || [],
            work_days_per_year: body.profile.work_days_per_year || 220,
        },
        attendance_leave: {
            leave_balance: body.attendance_leave?.leave_balance || 0,
            leave_requests: [],
            history_of_leaves: [],
        },
        payroll: {
            salary_amount: body.payroll?.salary_amount || 0,
            payslips: [],
            overtime_hours: 0,
            bonuses: 0,
            deductions: 0,
        },
        documents: {
            contracts: [],
            certificates: [],
            id_documents: [],
        },
    };

    // Add to list
    employees.push(newEmployee);

    // Save back to file
    await fs.writeFile(filePath, JSON.stringify(employees, null, 2));

    return new Response(JSON.stringify(newEmployee), { status: 201 });
}

export async function PUT(req) {
  const body = await req.json();

  if (!body.id) {
    return new Response(JSON.stringify({ error: "Employee ID required" }), { status: 400 });
  }

  // Read existing employees
  const data = await fs.readFile(filePath, "utf-8");
  const employees = JSON.parse(data);

  // Find employee
  const index = employees.findIndex((e) => e.id === body.id);
  if (index === -1) {
    return new Response(JSON.stringify({ error: "Employee not found" }), { status: 404 });
  }

  const employee = employees[index];

  // Merge profile updates
  if (body.profile) {
    employee.profile = { ...employee.profile, ...body.profile };
  }

  // Merge attendance_leave updates
  if (body.attendance_leave) {
    // Replace leave_requests entirely if provided (allow deletion)
    if (body.attendance_leave.leave_requests) {
      employee.attendance_leave.leave_requests = body.attendance_leave.leave_requests;
    }

    // Replace history_of_leaves entirely if provided
    if (body.attendance_leave.history_of_leaves) {
      employee.attendance_leave.history_of_leaves = body.attendance_leave.history_of_leaves;
    }

    // Update leave_balance if provided
    if (body.attendance_leave.leave_balance !== undefined) {
      employee.attendance_leave.leave_balance = body.attendance_leave.leave_balance;
    }
  }

  // Merge payroll updates
  if (body.payroll) {
    employee.payroll = { ...employee.payroll, ...body.payroll };
  }

  // Merge documents updates
  if (body.documents) {
    employee.documents = { ...employee.documents, ...body.documents };
  }

  // Save back to file
  employees[index] = employee;
  await fs.writeFile(filePath, JSON.stringify(employees, null, 2));

  return new Response(JSON.stringify(employee), { status: 200 });
}


export async function DELETE(req) {
  const { id } = await req.json();

  if (!id) {
    return new Response(JSON.stringify({ error: "Employee ID required" }), { status: 400 });
  }

  const data = await fs.readFile(filePath, "utf-8");
  const employees = JSON.parse(data);

  const updatedEmployees = employees.filter((e) => e.id !== id);

  if (updatedEmployees.length === employees.length) {
    return new Response(JSON.stringify({ error: "Employee not found" }), { status: 404 });
  }

  await fs.writeFile(filePath, JSON.stringify(updatedEmployees, null, 2));

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
