'use client'

import { useState, useEffect } from 'react'
import { supabase, Payment } from '@/lib/supabase'
import { 
  Search, 
  Filter, 
  Plus,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Eye,
  X
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import * as Tabs from '@radix-ui/react-tabs'
import { format } from 'date-fns'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Payment stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    paidThisMonth: 0
  })

  useEffect(() => {
    fetchPayments()
  }, [])

  useEffect(() => {
    filterPayments()
    calculateStats()
  }, [payments, searchTerm, statusFilter, typeFilter])

  async function fetchPayments() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          resident:residents(first_name, last_name, room_number)
        `)
        .order('due_date', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterPayments() {
    let filtered = payments

    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.resident?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.resident?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.resident?.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.amount.toString().includes(searchTerm)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(payment => payment.type === typeFilter)
    }

    // Filter by active tab
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    switch (activeTab) {
      case 'overdue':
        filtered = filtered.filter(payment => 
          payment.status !== 'paid' && new Date(payment.due_date) < now
        )
        break
      case 'thisMonth':
        filtered = filtered.filter(payment => {
          const dueDate = new Date(payment.due_date)
          return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear
        })
        break
      case 'pending':
        filtered = filtered.filter(payment => payment.status === 'pending')
        break
    }

    setFilteredPayments(filtered)
  }

  function calculateStats() {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const totalRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0)

    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0)

    const overdueAmount = payments
      .filter(p => p.status !== 'paid' && new Date(p.due_date) < now)
      .reduce((sum, p) => sum + p.amount, 0)

    const paidThisMonth = payments
      .filter(p => {
        if (p.status !== 'paid' || !p.paid_date) return false
        const paidDate = new Date(p.paid_date)
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear
      })
      .reduce((sum, p) => sum + p.amount, 0)

    setStats({
      totalRevenue,
      pendingAmount,
      overdueAmount,
      paidThisMonth
    })
  }

  async function updatePaymentStatus(id: string, status: Payment['status'], paidDate?: string, paymentMethod?: string) {
    try {
      const updates: Partial<Payment> = { status }
      
      if (status === 'paid') {
        updates.paid_date = paidDate || new Date().toISOString()
        if (paymentMethod) {
          updates.payment_method = paymentMethod as Payment['payment_method']
        }
      }

      const { error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchPayments()
      setDialogOpen(false)
      setSelectedPayment(null)
    } catch (error) {
      console.error('Error updating payment:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'partial': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (payment: Payment) => {
    const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date()
    
    if (isOverdue) {
      return <AlertTriangle className="w-4 h-4 text-red-600" />
    }
    
    switch (payment.status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />
      case 'partial': return <CreditCard className="w-4 h-4 text-blue-600" />
      default: return <DollarSign className="w-4 h-4 text-gray-600" />
    }
  }

  const getDisplayStatus = (payment: Payment) => {
    const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date()
    return isOverdue ? 'overdue' : payment.status
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-12 bg-gray-200 rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track rent payments and manage billing</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">${stats.paidThisMonth.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">${stats.pendingAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">${stats.overdueAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-gray-200 px-6 pt-6">
            <Tabs.List className="flex space-x-8">
              <Tabs.Trigger 
                value="all" 
                className="pb-4 px-1 border-b-2 font-medium text-sm transition-colors data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-transparent text-gray-500 hover:text-gray-700"
              >
                All Payments
              </Tabs.Trigger>
              <Tabs.Trigger 
                value="overdue" 
                className="pb-4 px-1 border-b-2 font-medium text-sm transition-colors data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-transparent text-gray-500 hover:text-gray-700"
              >
                Overdue ({payments.filter(p => p.status !== 'paid' && new Date(p.due_date) < new Date()).length})
              </Tabs.Trigger>
              <Tabs.Trigger 
                value="thisMonth" 
                className="pb-4 px-1 border-b-2 font-medium text-sm transition-colors data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-transparent text-gray-500 hover:text-gray-700"
              >
                This Month
              </Tabs.Trigger>
              <Tabs.Trigger 
                value="pending" 
                className="pb-4 px-1 border-b-2 font-medium text-sm transition-colors data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 border-transparent text-gray-500 hover:text-gray-700"
              >
                Pending ({payments.filter(p => p.status === 'pending').length})
              </Tabs.Trigger>
            </Tabs.List>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by resident name or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger className="inline-flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]">
                  <div className="flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    <Select.Value />
                  </div>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <Select.Item value="all" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      All Status
                    </Select.Item>
                    <Select.Item value="paid" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Paid
                    </Select.Item>
                    <Select.Item value="pending" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Pending
                    </Select.Item>
                    <Select.Item value="overdue" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Overdue
                    </Select.Item>
                    <Select.Item value="partial" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Partial
                    </Select.Item>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
              <Select.Root value={typeFilter} onValueChange={setTypeFilter}>
                <Select.Trigger className="inline-flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]">
                  <Select.Value />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <Select.Item value="all" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      All Types
                    </Select.Item>
                    <Select.Item value="rent" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Rent
                    </Select.Item>
                    <Select.Item value="deposit" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Deposit
                    </Select.Item>
                    <Select.Item value="fee" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Fee
                    </Select.Item>
                    <Select.Item value="refund" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                      Refund
                    </Select.Item>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900">No payments found</p>
                        <p className="text-gray-500">
                          {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Payments will appear here when added'
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payment.resident?.first_name} {payment.resident?.last_name}
                              </div>
                              {payment.resident?.room_number && (
                                <div className="text-sm text-gray-500">
                                  Room {payment.resident.room_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${payment.amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {payment.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(new Date(payment.due_date), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(payment)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(payment))}`}>
                              {getDisplayStatus(payment)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment)
                              setDialogOpen(true)
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {payment.status !== 'paid' && (
                            <button
                              onClick={() => updatePaymentStatus(payment.id, 'paid')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Root>
      </div>

      {/* Payment Detail Modal */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedPayment && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    Payment Details
                  </Dialog.Title>
                  <button
                    onClick={() => setDialogOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Payment Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Resident</label>
                        <p className="text-gray-900">
                          {selectedPayment.resident?.first_name} {selectedPayment.resident?.last_name}
                          {selectedPayment.resident?.room_number && ` (Room ${selectedPayment.resident.room_number})`}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Amount</label>
                        <p className="text-xl font-bold text-gray-900">${selectedPayment.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Type</label>
                        <p className="text-gray-900 capitalize">{selectedPayment.type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Due Date</label>
                        <p className="text-gray-900">{format(new Date(selectedPayment.due_date), 'MMM d, yyyy')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Current Status</label>
                        <div className="flex items-center mt-1">
                          {getStatusIcon(selectedPayment)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(selectedPayment))}`}>
                            {getDisplayStatus(selectedPayment)}
                          </span>
                        </div>
                      </div>
                      {selectedPayment.paid_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Paid Date</label>
                          <p className="text-gray-900">{format(new Date(selectedPayment.paid_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                      {selectedPayment.payment_method && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Payment Method</label>
                          <p className="text-gray-900 capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedPayment.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-lg mt-1">{selectedPayment.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                    {selectedPayment.status !== 'paid' && (
                      <>
                        <button
                          onClick={() => updatePaymentStatus(selectedPayment.id, 'paid', new Date().toISOString(), 'cash')}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Paid
                        </button>
                        <button
                          onClick={() => updatePaymentStatus(selectedPayment.id, 'partial')}
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Mark as Partial
                        </button>
                      </>
                    )}
                    <button className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      <Download className="w-4 h-4 mr-2" />
                      Generate Receipt
                    </button>
                    <button
                      onClick={() => setDialogOpen(false)}
                      className="flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}