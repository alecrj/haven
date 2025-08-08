'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  User, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  CreditCard,
  FileText,
  Home,
  Settings,
  LogOut
} from 'lucide-react'
import { format } from 'date-fns'

interface ClientData {
  resident: any
  payments: any[]
  documents: any[]
  announcements: any[]
}

export default function ClientPortal() {
  const [clientData, setClientData] = useState<ClientData>({
    resident: null,
    payments: [],
    documents: [],
    announcements: []
  })
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Check if already logged in
    const savedPhone = localStorage.getItem('client_phone')
    if (savedPhone) {
      setPhone(savedPhone)
      fetchClientData(savedPhone)
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)

    try {
      const { data: resident, error } = await supabase
        .from('residents')
        .select('*')
        .eq('phone', phone)
        .eq('status', 'active')
        .single()

      if (error || !resident) {
        setLoginError('Phone number not found or account inactive. Please contact staff.')
        setLoading(false)
        return
      }

      localStorage.setItem('client_phone', phone)
      setIsLoggedIn(true)
      await fetchClientData(phone)
    } catch (error) {
      setLoginError('Unable to access your account. Please try again.')
      setLoading(false)
    }
  }

  const fetchClientData = async (clientPhone: string) => {
    try {
      // Get resident data
      const { data: resident, error: residentError } = await supabase
        .from('residents')
        .select('*')
        .eq('phone', clientPhone)
        .eq('status', 'active')
        .single()

      if (residentError) throw residentError

      // Get payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('resident_id', resident.id)
        .order('due_date', { ascending: false })

      if (paymentsError) throw paymentsError

      // Get documents (if any)
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('resident_id', resident.id)
        .order('created_at', { ascending: false })

      // Mock announcements (you could create an announcements table)
      const announcements = [
        {
          id: 1,
          title: 'House Meeting This Friday',
          message: 'Join us for our monthly house meeting this Friday at 7 PM in the common room.',
          date: '2024-01-15',
          type: 'meeting'
        },
        {
          id: 2,
          title: 'Rent Due Reminder',
          message: 'Friendly reminder that rent is due on the 1st of each month.',
          date: '2024-01-01',
          type: 'payment'
        }
      ]

      setClientData({
        resident,
        payments: payments || [],
        documents: documents || [],
        announcements
      })
      setIsLoggedIn(true)
    } catch (error) {
      console.error('Error fetching client data:', error)
      setLoginError('Unable to load your information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('client_phone')
    setIsLoggedIn(false)
    setPhone('')
    setClientData({
      resident: null,
      payments: [],
      documents: [],
      announcements: []
    })
  }

  const getPaymentStatusColor = (payment: any) => {
    const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date()
    if (isOverdue) return 'text-red-600 bg-red-50'
    
    switch (payment.status) {
      case 'paid': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'partial': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getDisplayStatus = (payment: any) => {
    const isOverdue = payment.status !== 'paid' && new Date(payment.due_date) < new Date()
    return isOverdue ? 'overdue' : payment.status
  }

  const calculateSobrietyDays = (sobrietyDate: string) => {
    if (!sobrietyDate) return null
    const days = Math.floor((new Date().getTime() - new Date(sobrietyDate).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Home className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Resident Portal
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Access your account information and payment history
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your registered phone number"
              />
            </div>

            {loginError && (
              <div className="text-red-600 text-sm text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center text-sm text-gray-500">
              <p>Need help accessing your account?</p>
              <p>Call us at <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-500">(555) 123-4567</a></p>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { resident, payments, documents, announcements } = clientData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Haven House</span>
              <span className="ml-4 text-sm text-gray-500">Resident Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {resident?.first_name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <ul className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: Home },
                  { id: 'payments', label: 'Payments', icon: DollarSign },
                  { id: 'documents', label: 'Documents', icon: FileText },
                  { id: 'profile', label: 'Profile', icon: User },
                ].map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Welcome Card */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
                  <h1 className="text-2xl font-bold mb-2">
                    Welcome back, {resident.first_name}!
                  </h1>
                  <p className="text-blue-100">
                    Room {resident.room_number} • Moved in {format(new Date(resident.move_in_date), 'MMM d, yyyy')}
                  </p>
                  {resident.sobriety_date && (
                    <div className="mt-4 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      <span className="text-blue-100">
                        {calculateSobrietyDays(resident.sobriety_date)} days sober
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Next Payment</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${payments.find(p => p.status === 'pending')?.amount || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-full">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Due {payments.find(p => p.status === 'pending') 
                        ? format(new Date(payments.find(p => p.status === 'pending')!.due_date), 'MMM d')
                        : 'No pending payments'
                      }
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Account Status</p>
                        <p className="text-2xl font-bold text-green-600">Good</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">All payments current</p>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                        <p className="text-2xl font-bold text-gray-900">${resident.monthly_rent}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-full">
                        <Home className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Due 1st of each month</p>
                  </div>
                </div>

                {/* Recent Announcements */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">House Announcements</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-50 rounded-full">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900">
                              {announcement.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {announcement.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(announcement.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
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
                          Paid Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ${payment.amount}
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment)}`}>
                              {getDisplayStatus(payment)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {payment.paid_date ? format(new Date(payment.paid_date), 'MMM d, yyyy') : '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-gray-900">{resident.first_name} {resident.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{resident.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{resident.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Room Number</label>
                      <p className="text-gray-900">{resident.room_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Move-in Date</label>
                      <p className="text-gray-900">
                        {format(new Date(resident.move_in_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Monthly Rent</label>
                      <p className="text-gray-900">${resident.monthly_rent}</p>
                    </div>
                    {resident.sobriety_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Sobriety Date</label>
                        <p className="text-gray-900">
                          {format(new Date(resident.sobriety_date), 'MMM d, yyyy')}
                          <span className="text-sm text-gray-500 ml-2">
                            ({calculateSobrietyDays(resident.sobriety_date)} days)
                          </span>
                        </p>
                      </div>
                    )}
                    {resident.emergency_contact_name && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                          <p className="text-gray-900">{resident.emergency_contact_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Emergency Phone</label>
                          <p className="text-gray-900">{resident.emergency_contact_phone}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-8">
                    <p className="text-sm text-gray-500">
                      Need to update your information? Please contact the office at{' '}
                      <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-500">
                        (555) 123-4567
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                </div>
                <div className="p-6">
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Documents will appear here when uploaded by staff.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <FileText className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{document.name}</p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(document.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}