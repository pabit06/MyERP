'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/features/components/shared';
import { useAuth } from '@/contexts/AuthContext';

import Link from 'next/link';
import { removeDuplication } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Member {
  id: string;
  memberNumber: string | null;
  memberType?: 'INDIVIDUAL' | 'INSTITUTION';
  firstName?: string;
  middleName?: string;
  lastName?: string;
  institutionName?: string;
  fullName?: string;
  fullNameNepali?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  workflowStatus?: string;
  createdAt: string;
}

export default function AllMembersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/members?hasMemberNumber=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        toast.error('Failed to load members');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error loading members');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleToggleActive = async (member: Member) => {
    if (!token) return;

    // Optimistic update
    const previousMembers = [...members];
    const updatedMember = { ...member, isActive: !member.isActive };
    setMembers(members.map((m) => (m.id === member.id ? updatedMember : m)));

    try {
      const response = await fetch(`${API_URL}/members/${member.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !member.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }
      toast.success(`Member ${updatedMember.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error(error);
      setMembers(previousMembers); // Revert
      toast.error('Error updating member status');
    }
  };

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: 'memberNumber',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Member #
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium ml-4">
          {row.getValue('memberNumber') || <span className="text-gray-400 italic">Pending</span>}
        </div>
      ),
    },
    {
      accessorKey: 'fullName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const member = row.original;
        const name = removeDuplication(
          member.memberType === 'INSTITUTION'
            ? member.institutionName || member.fullName || member.firstName || 'Unknown'
            : member.fullName ||
                `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                'Unknown'
        );
        return (
          <div className="ml-4">
            <div className="font-medium">{name}</div>
            {member.fullNameNepali && (
              <div className="text-xs text-muted-foreground font-nepali">
                {member.fullNameNepali}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div className="lowercase ml-4">{row.getValue('email') || '-'}</div>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <div>{row.getValue('phone') || '-'}</div>,
    },
    {
      accessorKey: 'workflowStatus',
      header: 'Workflow',
      cell: ({ row }) => {
        const status = row.getValue('workflowStatus') as string;
        if (!status) return <span className="text-muted-foreground">-</span>;

        let colorClass = 'bg-gray-100 text-gray-800';
        if (status === 'active' || status === 'approved')
          colorClass = 'bg-green-100 text-green-800';
        else if (status === 'under_review') colorClass = 'bg-yellow-100 text-yellow-800';
        else if (status === 'bod_pending') colorClass = 'bg-purple-100 text-purple-800';
        else if (status === 'rejected') colorClass = 'bg-red-100 text-red-800';

        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
          >
            {status.replace(/_/g, ' ').toUpperCase()}
          </span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const member = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.id)}>
                Copy Member ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Link href={`/members/${member.id}`} passHref>
                <DropdownMenuItem>View Details</DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => handleToggleActive(member)}>
                {member.isActive ? 'Deactivate Member' : 'Activate Member'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500">
          <Link href="/members" className="hover:text-indigo-600">
            Member Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">All Members</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Members</h1>
            <p className="mt-1 text-sm text-gray-500">Manage cooperative members</p>
          </div>
          <Button
            onClick={() => router.push('/members/new')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            + Add Member
          </Button>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable columns={columns} data={members} searchKey="fullName" />
        )}
      </div>
    </ProtectedRoute>
  );
}
