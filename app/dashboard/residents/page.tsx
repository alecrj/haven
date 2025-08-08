'use client'

import { useState, useEffect } from 'react'
import { supabase, Resident } from '@/lib/supabase'
import { 
  Search, 
  Filter, 
  Plus,
  Edit,
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { format } from 'date-fns'

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [filteredResidents, setFilteredResidents] = useState<Resident[]>([])
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    fetchResidents()
  }, [])

  useEffect(() => {
    filterResidents()
  }, [residents, searchTerm, statusFilter])

  async function fetchResidents() {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setResidents(data || [])
    } catch (error) {
      console.error('Error fetching residents:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterResidents() {
    let filtered = residents

    if (searchTerm) {
      filtered = filtered.filter(resident => 
        resident.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.phone.includes(searchTerm) ||
        (resident.email && resident.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (resident.room_number && resident.room_number.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(resident => resident.status === statusFilter)
    }

    setFilteredResidents(filtered)
  }

  async function updateResident(id: string, updates: Partial<Resident>) {
    try {
      const { error } = await supabase
        .from('residents')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchResidents()
      setDialogOpen(false)
      setSelectedResident(null)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating resident:', error)
    }
  }

  async function moveOutResident(id: string) {
    const moveOutDate = new Date().toISOString().split('T')[0]
    await updateResident(id, {
      status: 'moved_out',
      move_out_date: moveOutDate
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-yellow-100 text-yellow-800'
      case 'moved_out': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'inactive': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'moved_out': return <Clock className="w-4 h-4 text-gray-600" />
      default: return <User className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
          <p className="text-gray-600">Manage current and former residents</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {filteredResidents.length} of {residents.length} residents
          </span>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Resident
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or room..."
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
              <Select.Item value="active" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Active
              </Select.Item>
              <Select.Item value="inactive" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Inactive
              </Select.Item>
              <Select.Item value="moved_out" className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Moved Out
              </Select.Item>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {/* Residents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResidents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No residents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Add your first resident to get started'}
            </p>
          </div>
        ) : (
          filteredResidents.map((resident) => (
            <div key={resident.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {resident.first_name} {resident.last_name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(resident.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(resident.status)}`}>
                          {resident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedResident(resident)
                      setDialogOpen(true)
                      setIsEditing(false)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {resident.room_number && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      Room {resident.room_number}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {resident.phone}
                  </div>
                  {resident.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {resident.email}
                    </div>
                  )}
                  {resident.monthly_rent && (
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      ${resident.monthly_rent}/month
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      Moved in: {resident.move_in_date ? format(new Date(resident.move_in_date), 'MMM d, yyyy') : 'N/A'}
                    </span>
                    {resident.sobriety_date && (
                      <span>
                        Sober since: {format(new Date(resident.sobriety_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resident Detail Modal */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedResident && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    {isEditing ? 'Edit Resident' : 'Resident Profile'}
                  </Dialog.Title>
                  <div className="flex items-center space-x-2">
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDialogOpen(false)
                        setIsEditing(false)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Information */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">First Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={selectedResident.first_name}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.first_name}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Last Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={selectedResident.last_name}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.last_name}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          {isEditing ? (
                            <input
                              type="tel"
                              defaultValue={selectedResident.phone}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.phone}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          {isEditing ? (
                            <input
                              type="email"
                              defaultValue={selectedResident.email || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.email || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Housing Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Housing Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Room Number</label>
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={selectedResident.room_number || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.room_number || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Monthly Rent</label>
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={selectedResident.monthly_rent || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">${selectedResident.monthly_rent || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Move In Date</label>
                          {isEditing ? (
                            <input
                              type="date"
                              defaultValue={selectedResident.move_in_date || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">
                              {selectedResident.move_in_date ? format(new Date(selectedResident.move_in_date), 'MMM d, yyyy') : 'N/A'}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          {isEditing ? (
                            <select
                              defaultValue={selectedResident.status}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="moved_out">Moved Out</option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedResident.status)}`}>
                              {selectedResident.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Sobriety Date</label>
                          {isEditing ? (
                            <input
                              type="date"
                              defaultValue={selectedResident.sobriety_date || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">
                              {selectedResident.sobriety_date ? format(new Date(selectedResident.sobriety_date), 'MMM d, yyyy') : 'N/A'}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Employment Status</label>
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={selectedResident.employment_status || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.employment_status || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={selectedResident.emergency_contact_name || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.emergency_contact_name || 'N/A'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Emergency Phone</label>
                          {isEditing ? (
                            <input
                              type="tel"
                              defaultValue={selectedResident.emergency_contact_phone || ''}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{selectedResident.emergency_contact_phone || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      {isEditing ? (
                        <textarea
                          rows={4}
                          defaultValue={selectedResident.notes || ''}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Add any notes about this resident..."
                        />
                      ) : (
                        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg mt-1">
                          {selectedResident.notes || 'No notes added'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Quick Stats</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Days since move-in:</span>
                          <span className="font-medium">
                            {selectedResident.move_in_date 
                              ? Math.floor((new Date().getTime() - new Date(selectedResident.move_in_date).getTime()) / (1000 * 60 * 60 * 24))
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Days sober:</span>
                          <span className="font-medium">
                            {selectedResident.sobriety_date 
                              ? Math.floor((new Date().getTime() - new Date(selectedResident.sobriety_date).getTime()) / (1000 * 60 * 60 * 24))
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total rent paid:</span>
                          <span className="font-medium">$2,500</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              // In a real app, you'd collect form data and call updateResident
                              setIsEditing(false)
                            }}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {selectedResident.status === 'active' && (
                            <button
                              onClick={() => moveOutResident(selectedResident.id)}
                              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Move Out Resident
                            </button>
                          )}
                          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            View Payment History
                          </button>
                          <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                            Generate Report
                          </button>
                        </>
                      )}
                    </div>
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