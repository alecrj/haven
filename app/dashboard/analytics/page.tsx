'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart as RechartsLineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts'
import * as Select from '@radix-ui/react-select'
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'

interface AnalyticsData {
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
    monthlyData: any[]
  }
  occupancy: {
    current: number
    target: number
    trend: any[]
  }
  applications: {
    total: number
    pending: number
    approved: number
    rejected: number
    conversionRate: number
    monthlyData: any[]
  }
  payments: {
    collected: number
    outstanding: number
    overdue: number
    onTimeRate: number
    avgDaysLate: number
  }
  residents: {
    total: number
    active: number
    newThisMonth: number
    turnoverRate: number
    avgStayDuration: number
    statusBreakdown: any[]
  }
  topMetrics: any[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('6m') // 1m, 3m, 6m, 1y, all
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeframe])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      // Calculate date range based on timeframe
      let startDate = new Date()
      switch (timeframe) {
        case '1m':
          startDate = subMonths(new Date(), 1)
          break
        case '3m':
          startDate = subMonths(new Date(), 3)
          break
        case '6m':
          startDate = subMonths(new Date(), 6)
          break
        case '1y':
          startDate = subMonths(new Date(), 12)
          break
        default:
          startDate = new Date(2023, 0, 1) // All time
      }

      // Fetch all required data
      const [
        residentsResult,
        paymentsResult,
        applicationsResult
      ] = await Promise.all([
        supabase.from('residents').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('applications').select('*')
      ])

      const residents = residentsResult.data || []
      const payments = paymentsResult.data || []
      const applications = applicationsResult.data || []

      // Calculate revenue metrics
      const totalRevenue = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0)

      const thisMonth = new Date()
      const lastMonth = subMonths(thisMonth, 1)
      
      const thisMonthRevenue = payments
        .filter(p => p.status === 'paid' && p.paid_date && 
          new Date(p.paid_date).getMonth() === thisMonth.getMonth() &&
          new Date(p.paid_date).getFullYear() === thisMonth.getFullYear())
        .reduce((sum, p) => sum + p.amount, 0)

      const lastMonthRevenue = payments
        .filter(p => p.status === 'paid' && p.paid_date && 
          new Date(p.paid_date).getMonth() === lastMonth.getMonth() &&
          new Date(p.paid_date).getFullYear() === lastMonth.getFullYear())
        .reduce((sum, p) => sum + p.amount, 0)

      const revenueGrowth = lastMonthRevenue === 0 ? 100 : 
        ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100

      // Generate monthly revenue data
      const monthlyRevenueData = eachMonthOfInterval({
        start: startDate,
        end: new Date()
      }).map(month => {
        const monthRevenue = payments
          .filter(p => p.status === 'paid' && p.paid_date && 
            new Date(p.paid_date).getMonth() === month.getMonth() &&
            new Date(p.paid_date).getFullYear() === month.getFullYear())
          .reduce((sum, p) => sum + p.amount, 0)
        
        return {
          month: format(month, 'MMM yyyy'),
          revenue: monthRevenue,
          target: 15000 // Example target
        }
      })

      // Calculate occupancy metrics
      const activeResidents = residents.filter(r => r.status === 'active').length
      const totalBeds = 35 // Example capacity
      const currentOccupancy = Math.round((activeResidents / totalBeds) * 100)
      
      // Generate occupancy trend
      const occupancyTrend = eachMonthOfInterval({
        start: startDate,
        end: new Date()
      }).map(month => {
        // Mock occupancy data - in real app, you'd track this over time
        const occupancy = Math.min(100, Math.max(60, currentOccupancy + Math.random() * 20 - 10))
        return {
          month: format(month, 'MMM'),
          occupancy: Math.round(occupancy)
        }
      })

      // Calculate application metrics
      const totalApplications = applications.length
      const pendingApplications = applications.filter(a => a.status === 'pending').length
      const approvedApplications = applications.filter(a => a.status === 'approved').length
      const rejectedApplications = applications.filter(a => a.status === 'rejected').length
      const conversionRate = totalApplications === 0 ? 0 : 
        Math.round((approvedApplications / totalApplications) * 100)

      // Generate monthly application data
      const monthlyApplicationData = eachMonthOfInterval({
        start: startDate,
        end: new Date()
      }).map(month => {
        const monthApplications = applications.filter(a => 
          new Date(a.created_at).getMonth() === month.getMonth() &&
          new Date(a.created_at).getFullYear() === month.getFullYear())
        
        return {
          month: format(month, 'MMM'),
          applications: monthApplications.length,
          approved: monthApplications.filter(a => a.status === 'approved').length,
          rejected: monthApplications.filter(a => a.status === 'rejected').length
        }
      })

      // Calculate payment metrics
      const collectedAmount = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0)
      
      const outstandingAmount = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)

      const overdueAmount = payments
        .filter(p => p.status !== 'paid' && new Date(p.due_date) < new Date())
        .reduce((sum, p) => sum + p.amount, 0)

      const paidOnTime = payments.filter(p => 
        p.status === 'paid' && p.paid_date && 
        new Date(p.paid_date) <= new Date(p.due_date)).length
      
      const totalPaidPayments = payments.filter(p => p.status === 'paid').length
      const onTimeRate = totalPaidPayments === 0 ? 100 : 
        Math.round((paidOnTime / totalPaidPayments) * 100)

      // Calculate resident metrics
      const newThisMonth = residents.filter(r => 
        r.move_in_date && 
        new Date(r.move_in_date).getMonth() === thisMonth.getMonth() &&
        new Date(r.move_in_date).getFullYear() === thisMonth.getFullYear()).length

      const statusBreakdown = [
        { name: 'Active', value: residents.filter(r => r.status === 'active').length, color: '#10B981' },
        { name: 'Inactive', value: residents.filter(r => r.status === 'inactive').length, color: '#F59E0B' },
        { name: 'Moved Out', value: residents.filter(r => r.status === 'moved_out').length, color: '#6B7280' }
      ]

      // Top metrics for quick insights
      const topMetrics = [
        {
          title: 'Revenue Growth',
          value: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
          change: revenueGrowth,
          period: 'vs last month'
        },
        {
          title: 'Occupancy Rate',
          value: `${currentOccupancy}%`,
          change: currentOccupancy - 85, // vs target of 85%
          period: 'vs target'
        },
        {
          title: 'Application Conversion',
          value: `${conversionRate}%`,
          change: conversionRate - 70, // vs target of 70%
          period: 'vs target'
        },
        {
          title: 'On-Time Payments',
          value: `${onTimeRate}%`,
          change: onTimeRate - 90, // vs target of 90%
          period: 'vs target'
        }
      ]

      const analyticsData: AnalyticsData = {
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth,
          monthlyData: monthlyRevenueData
        },
        occupancy: {
          current: currentOccupancy,
          target: 85,
          trend: occupancyTrend
        },
        applications: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications,
          conversionRate,
          monthlyData: monthlyApplicationData
        },
        payments: {
          collected: collectedAmount,
          outstanding: outstandingAmount,
          overdue: overdueAmount,
          onTimeRate,
          avgDaysLate: 3.2 // Mock data
        },
        residents: {
          total: residents.length,
          active: activeResidents,
          newThisMonth,
          turnoverRate: 12, // Mock data
          avgStayDuration: 8.5, // Mock data
          statusBreakdown
        },
        topMetrics
      }

      setData(analyticsData)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

  const exportData = () => {
    // Implementation for exporting analytics data
    const csvData = JSON.stringify(data, null, 2)
    const blob = new Blob([csvData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your sober living operations</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select.Root value={timeframe} onValueChange={setTimeframe}>
            <Select.Trigger className="inline-flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <Select.Value />
              </div>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Select.Item value="1m" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  Last Month
                </Select.Item>
                <Select.Item value="3m" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  Last 3 Months
                </Select.Item>
                <Select.Item value="6m" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  Last 6 Months
                </Select.Item>
                <Select.Item value="1y" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  Last Year
                </Select.Item>
                <Select.Item value="all" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  All Time
                </Select.Item>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.topMetrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className={`flex items-center text-sm ${
                metric.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                <span>{Math.abs(metric.change).toFixed(1)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{metric.period}</p>
          </div>
        ))}
      </div>

      {/* Revenue & Occupancy Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                <span className="text-gray-600">Actual</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                <span className="text-gray-600">Target</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.revenue.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value?.toLocaleString()}`, '']} />
                <Bar dataKey="target" fill="#E5E7EB" />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Occupancy Rate</h3>
            <div className="text-sm text-gray-600">
              Current: <span className="font-semibold text-blue-600">{data.occupancy.current}%</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.occupancy.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Occupancy']} />
                <Area 
                  type="monotone" 
                  dataKey="occupancy" 
                  stroke="#10B981" 
                  fill="#D1FAE5" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Application Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Flow */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Application Pipeline</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={data.applications.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="applications" fill="#3B82F6" name="Total Applications" />
                <Bar dataKey="approved" fill="#10B981" name="Approved" />
                <Bar dataKey="rejected" fill="#EF4444" name="Rejected" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resident Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Resident Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={data.residents.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.residents.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${data.revenue.total.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className={`${data.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.revenue.growth >= 0 ? '+' : ''}{data.revenue.growth.toFixed(1)}%
            </span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Residents</p>
              <p className="text-2xl font-bold text-gray-900">{data.residents.active}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">+{data.residents.newThisMonth}</span>
            <span className="text-gray-500 ml-1">new this month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding Payments</p>
              <p className="text-2xl font-bold text-yellow-600">${data.payments.outstanding.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-red-600">${data.payments.overdue.toLocaleString()}</span>
            <span className="text-gray-500 ml-1">overdue</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Application Conversion</p>
              <p className="text-2xl font-bold text-gray-900">{data.applications.conversionRate}%</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-600">{data.applications.approved}/{data.applications.total}</span>
            <span className="text-gray-500 ml-1">approved</span>
          </div>
        </div>
      </div>
    </div>
  )
}