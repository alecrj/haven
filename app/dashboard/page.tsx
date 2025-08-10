'use client'

import { useState, useEffect } from 'react'
import { supabase, Application, Resident, Payment } from '@/lib/supabase'
import { 
  Users, 
  FileText, 
  DollarSign, 
  Home,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Phone,
  Mail,
  Eye,
  ArrowRight
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import Link from 'next/link'

interface DashboardStats {
  applications: {
    total: number
    pending: number
    thisWeek: number
  }
  residents: {
    total: number
    active: number
    newThisMonth: number
  }
  payments: {
    totalCollected: number
    outstanding: number
    overdue: number
  }
  occupancy: {
    current: number
    capacity: number
    percentage: number
  }
}

interface RecentActivity {
  id: string
  type: 'application' | 'payment' | 'resident'
  title: string
  description: string
  timestamp: string
  status?: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    applications: { total: 0, pending: 0, thisWeek: 0 },
    residents: { total: 0, active: 0, newThisMonth: 0 },
    payments: { totalCollected: 0, outstanding: 0, overdue: 0 },
    occupancy: { current: 0, capacity: 35, percentage: 0 }
  })
  const [recentApplications, setRecentApplications] = useState<Application[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch all data
      const [applicationsResult, residentsResult, paymentsResult] = await Promise.all([
        supabase.from('applications').select('*').order('created_at', { ascending: false }),
        supabase.from('residents').select('*').order('created_at', { ascending: false }),
        supabase.from('payments').select(`
          *,
          resident:residents(first_name, last_name, room_number)
        `).order('created_at', { ascending: false })
      ])

      const applications = applicationsResult.data || []
      const residents = residentsResult.data || []
      const payments = paymentsResult.data || []

      // Calculate stats
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const applicationStats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        thisWeek: applications.filter(a => new Date(a.created_at) >= weekAgo).length
      }

      const activeResidents = residents.filter(r => r.status === 'active')
      const residentStats = {
        total: residents.length,
        active: activeResidents.length,
        newThisMonth: residents.filter(r => 
          r.move_in_date && new Date(r.move_in_date) >= monthStart
        ).length
      }

      const paymentStats = {
        totalCollected: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
        outstanding: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
        overdue: payments.filter(p => 
          p.status !== 'paid' && new Date(p.due_date) < now
        ).reduce((sum, p) => sum + p.amount, 0)
      }

      const occupancyStats = {
        current: activeResidents.length,
        capacity: 35,
        percentage: Math.round((activeResidents.length / 35) * 100)
      }

      setStats({
        applications: applicationStats,
        residents: residentStats,
        payments: paymentStats,
        occupancy: occupancyStats
      })

      // Set recent data
      setRecentApplications(applications.slice(0, 5))
      setRecentPayments(payments.slice(0, 5))

      // Generate recent activity
      const activity: RecentActivity[] = [
        ...applications.slice(0, 3).map(app => ({
          id: app.id,
          type: 'application' as const,
          title: `New application from ${app.first_name} ${app.last_name}`,
          description: `Phone: ${app.phone}`,
          timestamp: app.created_at,
          status: app.status
        })),
        ...payments.filter(p => p.status === 'paid').slice(0, 2).map(payment => ({
          id: payment.id,
          type: 'payment' as const,
          title: `Payment received: $${payment.amount}`,
          description: `From ${payment.resident?.first_name} ${payment.resident?.last_name}`,
          timestamp: payment.paid_date || payment.created_at,
          status: payment.status
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

      setRecentActivity(activity)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to Haven House Management System</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Applications */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.applications.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-yellow-600 font-medium">{stats.applications.pending} pending</span>
            <span className="text-gray-500">+{stats.applications.thisWeek} this week</span>
          </div>
        </div>

        {/* Residents */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Residents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.residents.active}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-green-600 font-medium">+{stats.residents.newThisMonth} this month</span>
            <span className="text-gray-500">of {stats.residents.total} total</span>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue Collected</p>
              <p className="text-2xl font-bold text-gray-900">${stats.payments.totalCollected.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-red-600 font-medium">${stats.payments.overdue.toLocaleString()} overdue</span>
            <span className="text-gray-500">${stats.payments.outstanding.toLocaleString()} pending</span>
          </div>
        </div>

        {/* Occupancy */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.occupancy.percentage}%</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <Home className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-900 font-medium">{stats.occupancy.current} of {stats.occupancy.capacity}</span>
            <span className="text-gray-500">beds occupied</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
              <Link 
                href="/dashboard/applications"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentApplications.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No recent applications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {application.first_name} {application.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(application.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      application.status === 'approved' ? 'bg-green-100 text-green-800' :
                      application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {application.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-4">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'application' ? 'bg-blue-50' :
                      activity.type === 'payment' ? 'bg-green-50' :
                      'bg-purple-50'
                    }`}>
                      {activity.type === 'application' ? (
                        <FileText className="h-4 w-4 text-blue-600" />
                      ) : activity.type === 'payment' ? (
                        <DollarSign className="h-4 w-4 text-green-600" />
                      ) : (
                        <Users className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/applications"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-blue-900">Review Applications</p>
              <p className="text-sm text-blue-700">{stats.applications.pending} pending review</p>
            </div>
          </Link>
          
          <Link
            href="/dashboard/residents"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Users className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-900">Manage Residents</p>
              <p className="text-sm text-green-700">{stats.residents.active} active residents</p>
            </div>
          </Link>
          
          <Link
            href="/dashboard/payments"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-purple-900">Track Payments</p>
              <p className="text-sm text-purple-700">${stats.payments.outstanding.toLocaleString()} outstanding</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}