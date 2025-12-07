'use client';

interface PayrollPreviewItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  ssfEmployee: number;
  ssfEmployer: number;
  taxTds: number;
  loanDeduction: number;
  netSalary: number;
}

interface PayrollPreview {
  preview: PayrollPreviewItem[];
  totals: {
    totalBasic: number;
    totalNetPay: number;
    totalSSF: number;
    totalTDS: number;
  };
}

interface PayrollPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: PayrollPreview | null;
  loading?: boolean;
}

export default function PayrollPreviewModal({
  isOpen,
  onClose,
  preview,
  loading = false,
}: PayrollPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Payroll Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading preview...</div>
            </div>
          ) : preview && preview.preview.length > 0 ? (
            <div className="space-y-6">
              {/* Totals Summary */}
              <div className="bg-blue-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Basic</p>
                  <p className="text-xl font-bold text-blue-600">
                    Rs. {preview.totals.totalBasic.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Net Pay</p>
                  <p className="text-xl font-bold text-green-600">
                    Rs. {preview.totals.totalNetPay.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total SSF</p>
                  <p className="text-xl font-bold text-purple-600">
                    Rs. {preview.totals.totalSSF.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total TDS</p>
                  <p className="text-xl font-bold text-orange-600">
                    Rs. {preview.totals.totalTDS.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Employee List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Basic
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Allowances
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Gross
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        SSF (Emp)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        SSF (Empr)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        TDS
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Loan Ded.
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Net Pay
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.preview.map((item) => (
                      <tr key={item.employeeId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.employeeName}</p>
                            <p className="text-xs text-gray-500">{item.employeeCode}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {item.basicSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {item.allowances.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {item.grossSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {item.ssfEmployee.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {item.ssfEmployer.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {item.taxTds.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {item.loanDeduction.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold text-green-600">
                          {item.netSalary.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No preview data available</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
