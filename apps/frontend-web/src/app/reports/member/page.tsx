'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, FileText, Download, Filter, Gift, Cake } from 'lucide-react';
import { ProtectedRoute, NepaliDatePicker } from '@/features/components/shared';
import { apiClient } from '@/lib/api';

interface UpcomingBirthday {
  id: string;
  memberNumber: string | null;
  name: string;
  dateOfBirth: string | null;
  dateOfBirthBS: string | null;
  birthdayThisYear: string;
  daysUntil: number;
  age: number | null;
  phone: string | null;
  email: string | null;
}

interface MemberListItem {
  sn: number;
  memberNumber: string | null;
  name: string;
  temporaryAddress: string;
  phoneNumber: string | null;
}

export default function MemberReportsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingBirthday[]>([]);
  const [memberList, setMemberList] = useState<MemberListItem[]>([]);
  const [daysAhead, setDaysAhead] = useState(30);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dateFilters, setDateFilters] = useState({
    fromDate: '',
    toDate: '',
  });

  const fetchUpcomingBirthdays = async () => {
    setIsLoading(true);
    setSelectedReport('birthdays');
    try {
      const data = await apiClient.get<UpcomingBirthday[]>(
        `/members/upcoming-birthdays?daysAhead=${daysAhead}`
      );
      setUpcomingBirthdays(data);
    } catch (error) {
      console.error('Error fetching upcoming birthdays:', error);
      setUpcomingBirthdays([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberList = async () => {
    setIsLoading(true);
    setSelectedReport('list');
    try {
      const data = await apiClient.get<MemberListItem[]>(
        `/members/list?includeInactive=${includeInactive}`
      );
      setMemberList(data);
    } catch (error) {
      console.error('Error fetching member list:', error);
      setMemberList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    Member Reports
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Comprehensive reports on member activities and demographics
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <NepaliDatePicker
                  value={dateFilters.fromDate}
                  onChange={(dateString) =>
                    setDateFilters({ ...dateFilters, fromDate: dateString })
                  }
                  label="From Date"
                />
              </div>
              <div>
                <NepaliDatePicker
                  value={dateFilters.toDate}
                  onChange={(dateString) => setDateFilters({ ...dateFilters, toDate: dateString })}
                  label="To Date"
                />
              </div>
              <div className="flex items-end">
                <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Member Registration Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Member Registration Report
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                View all member registrations with detailed information
              </p>
              <button className="w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                Generate Report
              </button>
            </div>

            {/* Member Activity Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Activity Report</h3>
              <p className="text-sm text-gray-600 mb-4">Track member transactions and activities</p>
              <button className="w-full bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
                Generate Report
              </button>
            </div>

            {/* Member Demographics Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Member Demographics Report
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Analyze member demographics and distribution
              </p>
              <button className="w-full bg-purple-50 text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
                Generate Report
              </button>
            </div>

            {/* Upcoming Birthday Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Cake className="w-5 h-5 text-pink-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upcoming Birthdays</h3>
              <p className="text-sm text-gray-600 mb-4">
                View members with birthdays in the next {daysAhead} days
              </p>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Days Ahead</label>
                <select
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value={7}>Next 7 days</option>
                  <option value={15}>Next 15 days</option>
                  <option value={30}>Next 30 days</option>
                  <option value={60}>Next 60 days</option>
                  <option value={90}>Next 90 days</option>
                </select>
              </div>
              <button
                onClick={fetchUpcomingBirthdays}
                disabled={isLoading && selectedReport === 'birthdays'}
                className="w-full bg-pink-50 text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && selectedReport === 'birthdays' ? 'Loading...' : 'Generate Report'}
              </button>
            </div>

            {/* Member List Report */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Member List</h3>
              <p className="text-sm text-gray-600 mb-4">
                Complete list of members with membership number, name, address, and contact
              </p>
              <div className="mb-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Include Inactive Members
                  </span>
                </label>
              </div>
              <button
                onClick={fetchMemberList}
                disabled={isLoading && selectedReport === 'list'}
                className="w-full bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && selectedReport === 'list' ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Report Results */}
          {selectedReport === 'birthdays' && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-600" />
                  Upcoming Birthdays (Next {daysAhead} Days)
                </h2>
                {upcomingBirthdays.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {upcomingBirthdays.length}{' '}
                    {upcomingBirthdays.length === 1 ? 'member' : 'members'}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                  <p className="mt-4 text-gray-600">Loading upcoming birthdays...</p>
                </div>
              ) : upcomingBirthdays.length === 0 ? (
                <div className="text-center py-12">
                  <Cake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No upcoming birthdays found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    No members have birthdays in the next {daysAhead} days
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Birthday
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days Until
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {upcomingBirthdays.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              {member.memberNumber && (
                                <div className="text-sm text-gray-500">#{member.memberNumber}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(member.birthdayThisYear)}
                            </div>
                            {member.dateOfBirthBS && (
                              <div className="text-xs text-gray-500">
                                BS: {member.dateOfBirthBS}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                member.daysUntil === 0
                                  ? 'bg-red-100 text-red-800'
                                  : member.daysUntil <= 7
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {member.daysUntil === 0
                                ? 'Today! 🎉'
                                : member.daysUntil === 1
                                  ? 'Tomorrow'
                                  : `${member.daysUntil} days`}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.age !== null ? `${member.age} years` : '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{member.phone || '—'}</div>
                            {member.email && <div className="text-xs">{member.email}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {selectedReport === 'list' && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Member List
                </h2>
                {memberList.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {memberList.length} {memberList.length === 1 ? 'member' : 'members'}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-4 text-gray-600">Loading member list...</p>
                </div>
              ) : memberList.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No members found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {includeInactive
                      ? 'No members found in the system'
                      : 'No active members found. Try including inactive members.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          S.N.
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Membership Number
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Temporary Address
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone Number
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {memberList.map((member) => (
                        <tr key={member.sn} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                            {member.sn}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-center">
                            {member.memberNumber ? member.memberNumber : '—'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 text-center">
                            {member.name || '—'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500 text-center">
                            {member.temporaryAddress || '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {member.phoneNumber ? member.phoneNumber : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!selectedReport && (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-center text-gray-500 py-8">
                Select a report above to generate and view results
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
