import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { calculateEmployeePayroll } from '../services/hrm/payroll-calculator.js';
import { createPayrollJournalEntry } from '../services/hrm/journal-service.js';
import { markAttendance } from '../services/hrm/attendance-service.js';
import {
  updateLeaveBalanceOnApproval,
  getEmployeeLeaveBalances,
} from '../services/hrm/leave-service.js';

const router = Router();

// All routes require authentication, tenant context, and HRM module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('hrm'));

/**
 * GET /api/hrm/employees
 * Get all employees (with optional filters)
 */
router.get('/employees', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, department } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (status) {
      where.status = status as string;
    }

    if (department) {
      where.department = department as string;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/hrm/employees
 * Create a new employee
 */
router.post('/employees', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      address,
      position,
      department,
      hireDate,
      salary,
    } = req.body;

    if (!employeeNumber || !firstName || !lastName || !position) {
      res.status(400).json({
        error: 'Missing required fields: employeeNumber, firstName, lastName, position',
      });
      return;
    }

    // Check if employee number already exists
    const existing = await prisma.employee.findUnique({
      where: {
        cooperativeId_employeeNumber: {
          cooperativeId: tenantId,
          employeeNumber,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Employee number already exists' });
      return;
    }

    const employee = await prisma.employee.create({
      data: {
        employeeNumber,
        cooperativeId: tenantId,
        firstName,
        lastName,
        email,
        phone,
        address,
        position,
        department,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        salary: salary ? parseFloat(salary) : null,
        status: 'active',
      },
    });

    res.status(201).json({ employee });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/hrm/employees/:id
 * Get a specific employee
 */
router.get('/employees/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        _count: {
          select: {
            payrollLogs: true,
            attendanceLogs: true,
          },
        },
      },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    res.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/hrm/payroll
 * Create a payroll log entry
 */
router.post('/payroll', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      grossSalary,
      deductions,
      paymentDate,
      remarks,
    } = req.body;

    if (!employeeId || !payPeriodStart || !payPeriodEnd || grossSalary === undefined) {
      res.status(400).json({
        error: 'Missing required fields: employeeId, payPeriodStart, payPeriodEnd, grossSalary',
      });
      return;
    }

    // Verify employee belongs to cooperative
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        cooperativeId: tenantId,
      },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const gross = parseFloat(grossSalary);
    const deduct = deductions ? parseFloat(deductions) : 0;
    const net = gross - deduct;

    const payroll = await prisma.payrollLog.create({
      data: {
        employeeId,
        cooperativeId: tenantId,
        payPeriodStart: new Date(payPeriodStart),
        payPeriodEnd: new Date(payPeriodEnd),
        grossSalary: gross,
        deductions: deduct,
        netSalary: net,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        remarks,
        status: 'pending',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({ payroll });
  } catch (error) {
    console.error('Create payroll log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/hrm/payroll
 * Get payroll logs (with optional filters)
 */
router.get('/payroll', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { employeeId, status } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    if (status) {
      where.status = status as string;
    }

    const payrollLogs = await prisma.payrollLog.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        payPeriodStart: 'desc',
      },
    });

    res.json({ payrollLogs });
  } catch (error) {
    console.error('Get payroll logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/hrm/attendance
 * Create or update an attendance log entry
 */
router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { employeeId, date, checkIn, checkOut, status, remarks } = req.body;

    if (!employeeId || !date) {
      res.status(400).json({ error: 'Missing required fields: employeeId, date' });
      return;
    }

    // Verify employee belongs to cooperative
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        cooperativeId: tenantId,
      },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Calculate hours worked if checkIn and checkOut are provided
    let hoursWorked = null;
    if (checkIn && checkOut) {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    }

    const attendance = await prisma.attendanceLog.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
      update: {
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        hoursWorked,
        status: status || 'present',
        remarks,
      },
      create: {
        employeeId,
        cooperativeId: tenantId,
        date: attendanceDate,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        hoursWorked,
        status: status || 'present',
        remarks,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ attendance });
  } catch (error) {
    console.error('Create/update attendance log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/hrm/attendance
 * Get attendance logs (with optional filters)
 */
router.get('/attendance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { employeeId, startDate, endDate, status } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId as string;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    if (status) {
      where.status = status as string;
    }

    const attendanceLogs = await prisma.attendanceLog.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json({ attendanceLogs });
  } catch (error) {
    console.error('Get attendance logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Training Endpoints ====================

/**
 * GET /api/hrm/training
 * Get all training sessions
 */
router.get('/training', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { sessionType, startDate, endDate } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (sessionType) {
      where.sessionType = sessionType as string;
    }

    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) {
        where.sessionDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.sessionDate.lte = new Date(endDate as string);
      }
    }

    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        attendance: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        sessionDate: 'desc',
      },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get training sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/hrm/training
 * Create a new training session
 */
router.post('/training', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { title, description, sessionType, sessionDate, duration, conductedBy } = req.body;

    if (!title || !sessionDate) {
      res.status(400).json({ error: 'Missing required fields: title, sessionDate' });
      return;
    }

    const session = await prisma.trainingSession.create({
      data: {
        title,
        description: description || null,
        sessionType: sessionType || 'aml_workshop',
        sessionDate: new Date(sessionDate),
        duration: duration ? parseInt(duration) : null,
        conductedBy: conductedBy || req.user!.userId,
        cooperativeId: tenantId,
      },
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Create training session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/hrm/training/:sessionId/attendance
 * Record attendance for a training session
 */
router.post('/training/:sessionId/attendance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { sessionId } = req.params;
    const { employeeId, attended, remarks } = req.body;

    if (!employeeId) {
      res.status(400).json({ error: 'Missing required field: employeeId' });
      return;
    }

    const attendance = await prisma.trainingAttendance.upsert({
      where: {
        sessionId_employeeId: {
          sessionId,
          employeeId,
        },
      },
      create: {
        sessionId,
        employeeId,
        cooperativeId: tenantId,
        attended: attended !== false,
        remarks: remarks || null,
      },
      update: {
        attended: attended !== false,
        remarks: remarks || null,
      },
    });

    res.status(201).json({ attendance });
  } catch (error) {
    console.error('Record training attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Departments ====================

router.get('/departments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const departments = await prisma.department.findMany({
      where: { cooperativeId: tenantId },
      orderBy: { name: 'asc' },
    });
    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/departments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }
    const department = await prisma.department.create({
      data: { cooperativeId: tenantId, name },
    });
    res.status(201).json({ department });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Department already exists' });
    } else {
      console.error('Create department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ==================== Designations ====================

router.get('/designations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const designations = await prisma.designation.findMany({
      where: { cooperativeId: tenantId },
      orderBy: { rank: 'asc' },
    });
    res.json({ designations });
  } catch (error) {
    console.error('Get designations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/designations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { title, rank } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Missing required field: title' });
      return;
    }
    const designation = await prisma.designation.create({
      data: { cooperativeId: tenantId, title, rank: rank || 0 },
    });
    res.status(201).json({ designation });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Designation already exists' });
    } else {
      console.error('Create designation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ==================== Shifts ====================

router.get('/shifts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const shifts = await prisma.shift.findMany({
      where: { cooperativeId: tenantId },
      orderBy: { name: 'asc' },
    });
    res.json({ shifts });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shifts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, expectedCheckIn, expectedCheckOut, graceMinutes } = req.body;
    if (!name || !expectedCheckIn || !expectedCheckOut) {
      res
        .status(400)
        .json({ error: 'Missing required fields: name, expectedCheckIn, expectedCheckOut' });
      return;
    }
    const shift = await prisma.shift.create({
      data: {
        cooperativeId: tenantId,
        name,
        expectedCheckIn: new Date(expectedCheckIn),
        expectedCheckOut: new Date(expectedCheckOut),
        graceMinutes: graceMinutes || 5,
      },
    });
    res.status(201).json({ shift });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Shift already exists' });
    } else {
      console.error('Create shift error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ==================== Leave Types ====================

router.get('/leave/types', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const leaveTypes = await prisma.leaveType.findMany({
      where: { cooperativeId: tenantId },
      orderBy: { name: 'asc' },
    });
    res.json({ leaveTypes });
  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/leave/types', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, isPaid, defaultAnnualQuota } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }
    const leaveType = await prisma.leaveType.create({
      data: {
        cooperativeId: tenantId,
        name,
        isPaid: isPaid !== false,
        defaultAnnualQuota: defaultAnnualQuota || 0,
      },
    });
    res.status(201).json({ leaveType });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Leave type already exists' });
    } else {
      console.error('Create leave type error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ==================== Leave Requests ====================

router.get('/leave/requests', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { employeeId, status } = req.query;
    const where: any = { cooperativeId: tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, code: true, firstName: true, lastName: true } },
        leaveType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/leave/requests', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { employeeId, leaveTypeId, startDate, endDate, comment } = req.body;
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        cooperativeId: tenantId,
        startDate: start,
        endDate: end,
        days,
        comment,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, code: true, firstName: true, lastName: true } },
        leaveType: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ request });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/leave/requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const request = await prisma.leaveRequest.findFirst({
      where: { id, cooperativeId: tenantId },
      include: { leaveType: true, employee: true },
    });

    if (!request) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }

    if (request.status !== 'PENDING') {
      res.status(400).json({ error: 'Leave request already processed' });
      return;
    }

    // Get fiscal year from request date (simplified - should use proper BS conversion)
    const fiscalYear = '2082/83'; // TODO: Calculate from startDate

    await prisma.$transaction(async (tx) => {
      // Update leave balance
      await updateLeaveBalanceOnApproval(
        request.employeeId,
        request.leaveTypeId,
        fiscalYear,
        request.days
      );

      // Update request status
      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user!.userId,
          approvedAt: new Date(),
        },
      });
    });

    res.json({ message: 'Leave request approved' });
  } catch (error: any) {
    if (error.message.includes('Insufficient leave balance')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Approve leave request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/leave/balances', async (req: Request, res: Response) => {
  try {
    const { employeeId, fiscalYear } = req.query;
    if (!employeeId || !fiscalYear) {
      res.status(400).json({ error: 'Missing required query params: employeeId, fiscalYear' });
      return;
    }
    const balances = await getEmployeeLeaveBalances(employeeId as string, fiscalYear as string);
    res.json({ balances });
  } catch (error) {
    console.error('Get leave balances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Payroll Runs ====================

router.post('/payroll/runs/preview', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { fiscalYear, monthBs, employeeIds } = req.body;

    if (!fiscalYear || !monthBs) {
      res.status(400).json({ error: 'Missing required fields: fiscalYear, monthBs' });
      return;
    }

    const settings = await prisma.payrollSettings.findUnique({
      where: { cooperativeId: tenantId },
    });

    if (!settings) {
      res.status(404).json({ error: 'Payroll settings not configured' });
      return;
    }

    const where: any = { cooperativeId: tenantId, status: 'active' };
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      where.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({ where });

    const preview = await Promise.all(
      employees.map(async (emp) => {
        try {
          const payroll = await calculateEmployeePayroll(
            emp.id,
            fiscalYear,
            monthBs,
            {
              scheme: settings.scheme,
              tdsConfig: settings.tdsConfig as any,
              festivalBonusMonthBs: settings.festivalBonusMonthBs || undefined,
            },
            0 // TODO: Get loan deduction from loan module
          );
          // Transform allowances from Record<string, number> to total number for frontend
          const allowancesObj = payroll.allowances as Record<string, number>;
          const totalAllowances = Object.values(allowancesObj).reduce(
            (sum, val) => sum + (val || 0),
            0
          );

          return {
            employeeId: emp.id,
            employeeCode: emp.code,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            basicSalary: payroll.basicSalary,
            allowances: totalAllowances, // Convert to number for frontend
            grossSalary: payroll.grossSalary,
            ssfEmployee: payroll.ssfEmployee,
            ssfEmployer: payroll.ssfEmployer,
            taxTds: payroll.taxTds,
            loanDeduction: payroll.loanDeduction,
            festivalBonus: payroll.festivalBonus,
            netSalary: payroll.netSalary,
          };
        } catch (error) {
          console.error(`Error calculating payroll for ${emp.id}:`, error);
          return null;
        }
      })
    );

    const validPreview = preview.filter((p) => p !== null);
    const totals = validPreview.reduce(
      (acc, p: any) => ({
        totalBasic: acc.totalBasic + p.basicSalary,
        totalNetPay: acc.totalNetPay + p.netSalary,
        totalSSF: acc.totalSSF + p.ssfEmployee + p.ssfEmployer,
        totalTDS: acc.totalTDS + p.taxTds,
      }),
      { totalBasic: 0, totalNetPay: 0, totalSSF: 0, totalTDS: 0 }
    );

    res.json({ preview: validPreview, totals });
  } catch (error) {
    console.error('Preview payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/payroll/runs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { fiscalYear, monthBs, employeeIds } = req.body;

    if (!fiscalYear || !monthBs) {
      res.status(400).json({ error: 'Missing required fields: fiscalYear, monthBs' });
      return;
    }

    // Check if run already exists
    const existing = await prisma.payrollRun.findUnique({
      where: {
        cooperativeId_fiscalYear_monthBs: {
          cooperativeId: tenantId,
          fiscalYear,
          monthBs,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Payroll run already exists for this month' });
      return;
    }

    const settings = await prisma.payrollSettings.findUnique({
      where: { cooperativeId: tenantId },
    });

    if (!settings) {
      res.status(404).json({ error: 'Payroll settings not configured' });
      return;
    }

    const where: any = { cooperativeId: tenantId, status: 'active' };
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      where.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({ where });

    const payrollRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          cooperativeId: tenantId,
          fiscalYear,
          monthBs,
          status: 'DRAFT',
        },
      });

      const payrolls = [];
      for (const emp of employees) {
        try {
          const payrollData = await calculateEmployeePayroll(
            emp.id,
            fiscalYear,
            monthBs,
            {
              scheme: settings.scheme,
              tdsConfig: settings.tdsConfig as any,
              festivalBonusMonthBs: settings.festivalBonusMonthBs || undefined,
            },
            0
          );

          const payroll = await tx.payroll.create({
            data: {
              employeeId: emp.id,
              payrollRunId: run.id,
              cooperativeId: tenantId,
              fiscalYear,
              monthBs,
              ...payrollData,
            },
          });
          payrolls.push(payroll);
        } catch (error) {
          console.error(`Error creating payroll for ${emp.id}:`, error);
        }
      }

      // Update totals
      const totals = payrolls.reduce(
        (acc, p) => ({
          totalBasic: acc.totalBasic + p.basicSalary,
          totalNetPay: acc.totalNetPay + p.netSalary,
          totalSSF: acc.totalSSF + p.ssfEmployee + p.ssfEmployer,
          totalTDS: acc.totalTDS + p.taxTds,
        }),
        { totalBasic: 0, totalNetPay: 0, totalSSF: 0, totalTDS: 0 }
      );

      return tx.payrollRun.update({
        where: { id: run.id },
        data: totals,
        include: { payrolls: true },
      });
    });

    res.status(201).json({ payrollRun });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Payroll run already exists for this month' });
    } else {
      console.error('Create payroll run error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/payroll/runs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { fiscalYear, monthBs } = req.query;
    const where: any = { cooperativeId: tenantId };
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (monthBs) where.monthBs = parseInt(monthBs as string);

    const runs = await prisma.payrollRun.findMany({
      where,
      include: {
        _count: { select: { payrolls: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ runs });
  } catch (error) {
    console.error('Get payroll runs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/payroll/runs/:runId/finalize', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { runId } = req.params;

    const run = await prisma.payrollRun.findFirst({
      where: { id: runId, cooperativeId: tenantId },
    });

    if (!run) {
      res.status(404).json({ error: 'Payroll run not found' });
      return;
    }

    if (run.status === 'FINALIZED') {
      res.status(400).json({ error: 'Payroll run already finalized' });
      return;
    }

    const { journalEntryId } = await createPayrollJournalEntry(runId);

    await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        finalizedBy: req.user!.userId,
      },
    });

    res.json({ message: 'Payroll run finalized', journalEntryId });
  } catch (error: any) {
    if (error.message.includes('already finalized')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Finalize payroll run error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/payroll/:id/payslip', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const payroll = await prisma.payroll.findFirst({
      where: { id, cooperativeId: tenantId },
      include: {
        employee: true,
        payrollRun: true,
      },
    });

    if (!payroll) {
      res.status(404).json({ error: 'Payroll not found' });
      return;
    }

    res.json({ payroll });
  } catch (error) {
    console.error('Get payslip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Payroll Settings ====================

router.get('/settings/payroll', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const settings = await prisma.payrollSettings.findUnique({
      where: { cooperativeId: tenantId },
    });
    res.json({ settings });
  } catch (error) {
    console.error('Get payroll settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings/payroll', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      scheme,
      tdsConfig,
      glSalaryExpense,
      glSsfExpense,
      glTdsPayable,
      glSsfPayable,
      glStaffLoanReceivable,
      glCashOrBank,
      festivalBonusMonthBs,
    } = req.body;

    const settings = await prisma.payrollSettings.upsert({
      where: { cooperativeId: tenantId },
      create: {
        cooperativeId: tenantId,
        scheme: scheme || 'SSF',
        tdsConfig: tdsConfig || {},
        glSalaryExpense: glSalaryExpense || '',
        glSsfExpense: glSsfExpense || '',
        glTdsPayable: glTdsPayable || '',
        glSsfPayable: glSsfPayable || '',
        glStaffLoanReceivable: glStaffLoanReceivable || '',
        glCashOrBank: glCashOrBank || '',
        festivalBonusMonthBs,
      },
      update: {
        scheme,
        tdsConfig,
        glSalaryExpense,
        glSsfExpense,
        glTdsPayable,
        glSsfPayable,
        glStaffLoanReceivable,
        glCashOrBank,
        festivalBonusMonthBs,
      },
    });

    res.json({ settings });
  } catch (error) {
    console.error('Update payroll settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Updated Attendance ====================

router.post('/attendance/mark', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { employeeId, date, checkIn, checkOut, shiftId } = req.body;

    if (!employeeId || !date) {
      res.status(400).json({ error: 'Missing required fields: employeeId, date' });
      return;
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, cooperativeId: tenantId },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const result = await markAttendance(
      employeeId,
      new Date(date),
      checkIn ? new Date(checkIn) : undefined,
      checkOut ? new Date(checkOut) : undefined,
      shiftId
    );

    res.json({ attendance: result });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Dashboard Stats ====================

/**
 * GET /api/hrm/dashboard/stats
 * Get HRM dashboard statistics
 */
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get total employees
    const totalEmployees = await prisma.employee.count({
      where: { cooperativeId: tenantId },
    });

    // Get active employees
    const activeEmployees = await prisma.employee.count({
      where: { cooperativeId: tenantId, status: 'active' },
    });

    // Get pending leave requests
    const pendingLeaveRequests = await prisma.leaveRequest.count({
      where: {
        cooperativeId: tenantId,
        status: 'PENDING',
      },
    });

    // Get employees on leave today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const employeesOnLeave = await prisma.leaveRequest.count({
      where: {
        cooperativeId: tenantId,
        status: 'APPROVED',
        startDate: { lte: today }, // Only count leaves that have already started
        endDate: { gte: today },
      },
    });

    // Get recent attendance (last 7 days including today)
    // Subtract 6 days to get exactly 7 days: today + 6 previous days = 7 total days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentAttendance = await prisma.attendance.count({
      where: {
        cooperativeId: tenantId,
        date: { gte: sevenDaysAgo },
        status: 'PRESENT',
      },
    });

    // Get pending payroll runs
    const pendingPayrollRuns = await prisma.payrollRun.count({
      where: {
        cooperativeId: tenantId,
        status: 'DRAFT',
      },
    });

    // Get department distribution
    const departmentStats = await prisma.employee.groupBy({
      by: ['departmentId'],
      where: { cooperativeId: tenantId, status: 'active' },
      _count: { id: true },
    });

    const departments = await prisma.department.findMany({
      where: { cooperativeId: tenantId },
      select: { id: true, name: true },
    });

    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));
    const departmentDistribution = departmentStats.map((stat) => ({
      departmentId: stat.departmentId,
      departmentName: stat.departmentId
        ? departmentMap.get(stat.departmentId) || 'Unassigned'
        : 'Unassigned',
      count: stat._count.id,
    }));

    res.json({
      stats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        pendingLeaveRequests,
        employeesOnLeave,
        recentAttendance,
        pendingPayrollRuns,
        departmentDistribution,
      },
    });
  } catch (error) {
    console.error('Get HRM dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
