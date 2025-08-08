'use client'

import { useState, useEffect } from 'react'
import { supabase, Application } from '@/lib/supabase'
import { 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X, 
  Phone, 
  Mail, 
  Calendar,
  FileText,
  User,
  MessageSquare
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { format } from 'date-fns'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'contact' | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    filterApplications()
  }, [applications, searchTerm, statusFilter])

  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterApplications() {
    let filtered = applications

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.phone.includes(searchTerm) ||
        (app.email && app.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    setFilteredApplications(filtered)
  }

  async function updateApplicationStatus(id: string, status: Application['status'], notes?: string) {
    try {
      const updates: Partial<Application> = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Admin', // In a real app, this would be the current user
      }

      if (notes) {
        updates.notes = notes
      }

      const { error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchApplications()
      setDialogOpen(false)
      setSelectedApplication(null)
    } catch (error) {
      console.error('Error updating application:', error)
    }
  }

  async function convertToResident(application: Application) {
    try {
      // Create resident record
      const { error: residentError } = await supabase
        .from('residents')
        .insert({
          first_name: application.first_name,
          last_name: application.last_name,
          phone: application.phone,
          email: application.email,
          sobriety_date: application.sobriety_date,
          employment_status: application.employment_status,
          move_in_date: new Date().toISOString().split('T')[0],
          status: 'active',
          monthly_rent: 500, // Default rent
          application_id: application.id
        })

      if (residentError) throw residentError

      // Update application status
      await updateApplicationStatus(application.id, 'approved', 'Converted to resident')
      
      alert('Application approved and resident created successfully!')
    } catch (error) {
      console.error('Error converting to resident:', error)
      alert('Error converting to resident. Please try again.')
    }
  }

  const handleSelectAll = () => {
    if (selectedApplications.length === filteredApplications.length) {
      setSelectedApplications([])
    } else {
      setSelectedApplications(filteredApplications.map(app => app.id))
    }
  }

  const handleSelectApplication = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    )
  }

  const handleBulkAction = async (action: 'approve' | 'reject' | 'contact') => {
    setBulkAction(action)
    setBulkDialogOpen(true)
  }

  const executeBulkAction = async () => {
    if (!bulkAction || selectedApplications.length === 0) return

    try {
      const promises = selectedApplications.map(applicationId => {
        switch (bulkAction) {
          case 'approve':
            return updateApplicationStatus(applicationId, 'approved', 'Bulk approved')
          case 'reject':
            return updateApplicationStatus(applicationId, 'rejected', 'Bulk rejected')
          case 'contact':
            return updateApplicationStatus(applicationId, 'contacted', 'Bulk contacted')
          default:
            return Promise.resolve()
        }
      })

      await Promise.all(promises)
      setSelectedApplications([])
      setBulkDialogOpen(false)
      setBulkAction(null)
      
      alert(`Successfully ${bulkAction}ed ${selectedApplications.length} applications`)
    } catch (error) {
      console.error('Error executing bulk action:', error)
      alert('Error executing bulk action. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'contacted': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded"></div>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900">
                {selectedApplications.length} application{selectedApplications.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('approve')}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Check className="w-4 h-4 mr-1" />
                Approve All
              </button>
              <button
                onClick={() => handleBulkAction('contact')}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Phone className="w-4 h-4 mr-1" />
                Mark Contacted
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <X className="w-4 h-4 mr-1" />
                Reject All
              </button>
              <button
                onClick={() => setSelectedApplications([])}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">Review and manage housing applications</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredApplications.length} of {applications.length} applications
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
          <Select.Trigger className="inline-flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]">
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
              <Select.Item value="pending" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Pending
              </Select.Item>
              <Select.Item value="approved" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Approved
              </Select.Item>
              <Select.Item value="rejected" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Rejected
              </Select.Item>
              <Select.Item value="contacted" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Contacted
              </Select.Item>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {/* Applications List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Applications will appear here when submitted'}
            </p>
          </div>
        ) : (
          <>
            {/* Header with Select All */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Select all applications
                </label>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <div key={application.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedApplications.includes(application.id)}
                      onChange={() => handleSelectApplication(application.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900">
                            {application.first_name} {application.last_name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {application.phone}
                            </div>
                            {application.email && (
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                {application.email}
                              </div>
                            )}
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(application.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {application.message && (
                        <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                          <MessageSquare className="w-4 h-4 inline mr-1" />
                          {application.message}
                        </div>
                      )}

                      <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                        {application.sobriety_date && (
                          <span>Sober since: {format(new Date(application.sobriety_date), 'MMM d, yyyy')}</span>
                        )}
                        {application.employment_status && (
                          <span>Employment: {application.employment_status}</span>
                        )}
                        {application.housing_needed && (
                          <span>Housing needed: {application.housing_needed}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedApplication(application)
                          setDialogOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog.Root open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Confirm Bulk Action
                </Dialog.Title>
                <button
                  onClick={() => setBulkDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to <strong>{bulkAction}</strong> {selectedApplications.length} selected application{selectedApplications.length !== 1 ? 's' : ''}?
                </p>
                {bulkAction === 'reject' && (
                  <p className="text-sm text-red-600 mt-2">
                    This action cannot be undone.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setBulkDialogOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkAction}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    bulkAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Confirm {bulkAction}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Application Detail Modal */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedApplication && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    Application Details
                  </Dialog.Title>
                  <button
                    onClick={() => setDialogOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-gray-900">{selectedApplication.first_name} {selectedApplication.last_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{selectedApplication.phone}</p>
                      </div>
                      {selectedApplication.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">{selectedApplication.email}</p>
                        </div>
                      )}
                      {selectedApplication.sobriety_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Sobriety Date</label>
                          <p className="text-gray-900">{format(new Date(selectedApplication.sobriety_date), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                      {selectedApplication.employment_status && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Employment Status</label>
                          <p className="text-gray-900">{selectedApplication.employment_status}</p>
                        </div>
                      )}
                      {selectedApplication.housing_needed && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Housing Needed</label>
                          <p className="text-gray-900">{selectedApplication.housing_needed}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  {selectedApplication.message && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Message</h3>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedApplication.message}</p>
                    </div>
                  )}

                  {/* Application Status */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Application Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Current Status</label>
                        <p className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedApplication.status)}`}>
                          {selectedApplication.status}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Submitted</label>
                        <p className="text-gray-900">{format(new Date(selectedApplication.created_at), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                      {selectedApplication.reviewed_at && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Reviewed</label>
                            <p className="text-gray-900">{format(new Date(selectedApplication.reviewed_at), 'MMM d, yyyy h:mm a')}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Reviewed By</label>
                            <p className="text-gray-900">{selectedApplication.reviewed_by}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {selectedApplication.notes && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-500">Notes</label>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg mt-1">{selectedApplication.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                    {selectedApplication.status === 'pending' && (
                      <>
                        <button
                          onClick={() => convertToResident(selectedApplication)}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve & Create Resident
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(selectedApplication.id, 'contacted')}
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Mark as Contacted
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected', 'Application rejected')}
                          className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </button>
                      </>
                    )}
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