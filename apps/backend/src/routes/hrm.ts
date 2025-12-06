import { Router, Request, Response } from 'express';
import { z } from 'zod';
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
import { getFiscalYearForDate } from '../lib/nepali-fiscal-year.js';
import { getEmployeeLoanDeduction } from '../services/hrm/loan-deduction.js';
import { getBatchEmployeeLoanDeductions } from '../services/hrm/loan-deduction-batch.js';
import { validate, validateAll, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { paginationSchema, paginationWithSearchSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../lib/pagination.js';
import {
  createEmployeeSchema,
  createLeaveRequestSchema,
  createPayrollRunSchema,
  updateLeaveRequestStatusSchema,
} from '@myerp/shared-types';
import { idSchema } from '../validators/common.js';

const router = Router();

// All routes require authentication, tenant context, and HRM module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('hrm'));

/**
 * GET /api/hrm/employees
 * Get all employees (with pagination and optional filters)
 */
router.get(
  '/employees',
  validateQuery(
    paginationWithSearchSchema.extend({
      status: z.string().optional(),
      department: z.string().optional(),
      departmentId: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, status, department, departmentId, search } =
      req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' as const } },
        { employeeNumber: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany(
        applySorting(
          applyPagination(
            {
              where,
              include: {
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                designation: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.employee.count({ where }),
    ]);

    res.json(createPaginatedResponse(employees, total, { page, limit }));
  })
);

/**
 * POST /api/hrm/employees
 * Create a new employee
 */
router.post(
  '/employees',
  validate(
    createEmployeeSchema.extend({
      employeeNumber: z.string().min(1, 'Employee number is required'),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      position: z.string().min(1, 'Position is required'),
      department: z.string().optional(),
      hireDate: z.string().datetime().or(z.date()).optional(),
      salary: z.number().nonnegative().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
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
    } = req.validated!;

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
        hireDate: hireDate ? new Date(hireDate as string) : new Date(),
        salary: salary || null,
        status: 'active',
      },
    });

    res.status(201).json({ employee });
  })
);

/**
 * GET /api/hrm/employees/:id
 * Get a specific employee
 */
router.get('/employees/:id', validateParams(idSchema), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.validatedParams!;

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
}));

/**
 * POST /api/hrm/payroll
 * Create a payroll log entry
 */
router.post(
  '/payroll',
  validate(
    z.object({
      employeeId: z.string().min(1, 'Employee ID is required'),
      payPeriodStart: z.string().datetime().or(z.date()),
      payPeriodEnd: z.string().datetime().or(z.date()),
      grossSalary: z.number().nonnegative('Gross salary must be non-negative'),
      deductions: z.number().nonnegative().optional().default(0),
      paymentDate: z.string().datetime().or(z.date()).optional(),
      remarks: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      grossSalary,
      deductions = 0,
      paymentDate,
      remarks,
    } = req.validated!;

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

    const net = grossSalary - deductions;

    const payroll = await prisma.payrollLog.create({
      data: {
        employeeId,
        cooperativeId: tenantId,
        payPeriodStart: new Date(payPeriodStart as string),
        payPeriodEnd: new Date(payPeriodEnd as string),
        grossSalary,
        deductions,
        netSalary: net,
        paymentDate: paymentDate ? new Date(paymentDate as string) : null,
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
  })
);

/**
 * GET /api/hrm/payroll
 * Get payroll logs (with pagination and optional filters)
 */
router.get(
  '/payroll',
  validateQuery(
    paginationWithSearchSchema.extend({
      employeeId: z.string().optional(),
      status: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, employeeId, status, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { employee: { code: { contains: search, mode: 'insensitive' as const } } },
        { employee: { employeeNumber: { contains: search, mode: 'insensitive' as const } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [payrollLogs, total] = await Promise.all([
      prisma.payrollLog.findMany(
        applySorting(
          applyPagination(
            {
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
            },
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'payPeriodStart'
        )
      ),
      prisma.payrollLog.count({ where }),
    ]);

    res.json(createPaginatedResponse(payrollLogs, total, { page, limit }));
  })
);

/**
 * POST /api/hrm/attendance
 * Create or update an attendance log entry
 */
router.post(
  '/attendance',
  validate(
    z.object({
      employeeId: z.string().min(1, 'Employee ID is required'),
      date: z.string().datetime().or(z.date()),
      checkIn: z.string().datetime().or(z.date()).optional(),
      checkOut: z.string().datetime().or(z.date()).optional(),
      status: z.string().optional().default('present'),
      remarks: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { employeeId, date, checkIn, checkOut, status = 'present', remarks } = req.validated!;

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
  })
);

/**
 * GET /api/hrm/attendance
 * Get attendance logs (with pagination and optional filters)
 */
router.get(
  '/attendance',
  validateQuery(
    paginationWithSearchSchema.extend({
      employeeId: z.string().optional(),
      startDate: z.string().datetime().or(z.date()).optional(),
      endDate: z.string().datetime().or(z.date()).optional(),
      status: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, employeeId, startDate, endDate, status, search } =
      req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId;
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
      where.status = status;
    }

    if (search) {
      where.OR = [
        { employee: { code: { contains: search, mode: 'insensitive' as const } } },
        { employee: { employeeNumber: { contains: search, mode: 'insensitive' as const } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [attendanceLogs, total] = await Promise.all([
      prisma.attendanceLog.findMany(
        applySorting(
          applyPagination(
            {
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
            },
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'date'
        )
      ),
      prisma.attendanceLog.count({ where }),
    ]);

    res.json(createPaginatedResponse(attendanceLogs, total, { page, limit }));
  })
);

// ==================== Training Endpoints ====================

/**
 * GET /api/hrm/training
 * Get all training sessions (with pagination)
 */
router.get(
  '/training',
  validateQuery(
    paginationWithSearchSchema.extend({
      sessionType: z.string().optional(),
      startDate: z.string().datetime().or(z.date()).optional(),
      endDate: z.string().datetime().or(z.date()).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, sessionType, startDate, endDate, search } =
      req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (sessionType) {
      where.sessionType = sessionType;
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

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.trainingSession.findMany(
        applySorting(
          applyPagination(
            {
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
            },
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'sessionDate'
        )
      ),
      prisma.trainingSession.count({ where }),
    ]);

    res.json(createPaginatedResponse(sessions, total, { page, limit }));
  })
);

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

router.get(
  '/departments',
  validateQuery(paginationWithSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany(
        applySorting(
          applyPagination(
            {
              where,
            },
            { page, limit }
          ),
          sortBy || 'name',
          sortOrder || 'asc',
          'name'
        )
      ),
      prisma.department.count({ where }),
    ]);

    res.json(createPaginatedResponse(departments, total, { page, limit }));
  })
);

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

router.get(
  '/designations',
  validateQuery(paginationWithSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.title = { contains: search, mode: 'insensitive' as const };
    }

    const [designations, total] = await Promise.all([
      prisma.designation.findMany(
        applySorting(
          applyPagination(
            {
              where,
            },
            { page, limit }
          ),
          sortBy || 'rank',
          sortOrder || 'asc',
          'rank'
        )
      ),
      prisma.designation.count({ where }),
    ]);

    res.json(createPaginatedResponse(designations, total, { page, limit }));
  })
);

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

router.get(
  '/shifts',
  validateQuery(paginationWithSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany(
        applySorting(
          applyPagination(
            {
              where,
            },
            { page, limit }
          ),
          sortBy || 'name',
          sortOrder || 'asc',
          'name'
        )
      ),
      prisma.shift.count({ where }),
    ]);

    res.json(createPaginatedResponse(shifts, total, { page, limit }));
  })
);

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

router.get(
  '/leave/types',
  validateQuery(paginationWithSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    const [leaveTypes, total] = await Promise.all([
      prisma.leaveType.findMany(
        applySorting(
          applyPagination(
            {
              where,
            },
            { page, limit }
          ),
          sortBy || 'name',
          sortOrder || 'asc',
          'name'
        )
      ),
      prisma.leaveType.count({ where }),
    ]);

    res.json(createPaginatedResponse(leaveTypes, total, { page, limit }));
  })
);

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

router.get(
  '/leave/requests',
  validateQuery(
    paginationWithSearchSchema.extend({
      employeeId: z.string().optional(),
      status: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, employeeId, status, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { employee: { code: { contains: search, mode: 'insensitive' as const } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' as const } } },
        { leaveType: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany(
        applySorting(
          applyPagination(
            {
              where,
              include: {
                employee: { select: { id: true, code: true, firstName: true, lastName: true } },
                leaveType: { select: { id: true, name: true } },
              },
            },
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.leaveRequest.count({ where }),
    ]);

    res.json(createPaginatedResponse(requests, total, { page, limit }));
  })
);

router.post('/leave/requests', validate(createLeaveRequestSchema), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { employeeId, leaveTypeId, startDate, endDate, comment } = req.validated!;

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
}));

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

    // Get fiscal year from request start date
    const fiscalYearRange = getFiscalYearForDate(request.startDate);
    const fiscalYear = fiscalYearRange.label.replace('FY ', ''); // Convert "FY 2081/82" to "2081/82"

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

    // Batch fetch loan deductions for all employees to avoid N+1 queries
    const allEmployeeIds = employees.map((emp) => emp.id);
    const loanDeductionsMap = await getBatchEmployeeLoanDeductions(
      allEmployeeIds,
      tenantId,
      fiscalYear,
      monthBs
    );

    const preview = await Promise.all(
      employees.map(async (emp) => {
        try {
          // Get loan deduction from batch map
          const loanDeduction = loanDeductionsMap.get(emp.id) || 0;

          const payroll = await calculateEmployeePayroll(
            emp.id,
            fiscalYear,
            monthBs,
            {
              scheme: settings.scheme,
              tdsConfig: settings.tdsConfig as any,
              festivalBonusMonthBs: settings.festivalBonusMonthBs || undefined,
            },
            loanDeduction
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

router.post('/payroll/runs', validate(createPayrollRunSchema.extend({ employeeIds: z.array(z.string()).optional() })), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { fiscalYear, monthBs, employeeIds } = req.validated!;

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

    // Batch fetch loan deductions for all employees to avoid N+1 queries
    const allEmployeeIds = employees.map((emp) => emp.id);
    const loanDeductionsMap = await getBatchEmployeeLoanDeductions(
      allEmployeeIds,
      tenantId,
      fiscalYear,
      monthBs
    );

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
          // Get loan deduction from batch map
          const loanDeduction = loanDeductionsMap.get(emp.id) || 0;

          const payrollData = await calculateEmployeePayroll(
            emp.id,
            fiscalYear,
            monthBs,
            {
              scheme: settings.scheme,
              tdsConfig: settings.tdsConfig as any,
              festivalBonusMonthBs: settings.festivalBonusMonthBs || undefined,
            },
            loanDeduction
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
}));

router.get(
  '/payroll/runs',
  validateQuery(
    paginationSchema.extend({
      fiscalYear: z.string().optional(),
      monthBs: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, fiscalYear, monthBs } = req.validatedQuery!;

    const where: any = { cooperativeId: tenantId };
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (monthBs) where.monthBs = monthBs;

    const [runs, total] = await Promise.all([
      prisma.payrollRun.findMany(
        applySorting(
          applyPagination(
            {
              where,
              include: {
                _count: { select: { payrolls: true } },
              },
            },
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.payrollRun.count({ where }),
    ]);

    res.json(createPaginatedResponse(runs, total, { page, limit }));
  })
);

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
