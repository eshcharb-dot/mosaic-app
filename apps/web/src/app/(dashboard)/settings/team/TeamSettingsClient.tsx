'use client'
import { useState } from 'react'
import { UserPlus, Trash2, Copy, Check, ChevronDown, Clock, Users } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  enterprise_admin: 'Admin',
  enterprise_member: 'Member',
  analyst: 'Analyst',
  viewer: 'Viewer',
  collector: 'Collector',
  superadmin: 'Superadmin',
}

const ROLE_COLORS: Record<string, string> = {
  enterprise_admin: 'bg-[#7c6df5]/15 text-[#7c6df5] border-[#7c6df5]/30',
  enterprise_member: 'bg-[#00d4d4]/15 text-[#00d4d4] border-[#00d4d4]/30',
  analyst: 'bg-[#00d4d4]/15 text-[#00d4d4] border-[#00d4d4]/30',
  viewer: 'bg-white/10 text-[#b0b0d0] border-white/10',
  collector: 'bg-white/10 text-[#b0b0d0] border-white/10',
  superadmin: 'bg-[#ff4d6d]/15 text-[#ff4d6d] border-[#ff4d6d]/30',
}

interface Member {
  id: string
  role: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  status: string
  created_at: string
  expires_at: string
}

interface Props {
  currentUserId: string
  currentUserEmail: string
  currentUserRole: string
  orgId: string
  orgName: string
  members: Member[]
  invitations: Invitation[]
}

function initials(name: string | null, fallback: string) {
  if (name) {
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  }
  return fallback[0]?.toUpperCase() ?? '?'
}

function daysUntil(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000))
}

export default function TeamSettingsClient({
  currentUserId,
  currentUserEmail,
  currentUserRole,
  orgId,
  orgName,
  members: initialMembers,
  invitations: initialInvitations,
}: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Remove confirmation state
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; email: string } | null>(null)

  // Copy token state
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Role update state
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const isAdmin = currentUserRole === 'enterprise_admin'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation')

      setInvitations(prev => [data.invitation, ...prev])
      setInviteEmail('')
      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
    } catch (err: any) {
      setInviteError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    setUpdatingRole(memberId)
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')

      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role: data.member.role } : m
      ))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdatingRole(null)
    }
  }

  async function handleRemove(memberId: string) {
    setRemovingId(memberId)
    try {
      const res = await fetch(`/api/team/members/${memberId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove member')

      setMembers(prev => prev.filter(m => m.id !== memberId))
      setConfirmRemove(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    try {
      // We delete/update by calling the invite route — for revoke, update status to expired
      // We'll use a PATCH-like approach via a dedicated endpoint, or handle inline
      // For now, optimistic update + server-side: we'll just remove from UI and call members API
      // Actually we need a revoke endpoint — let's use the team/invite DELETE approach
      const res = await fetch(`/api/team/invite?id=${inviteId}`, { method: 'DELETE' })
      // If 404, still remove from UI (already expired server-side)
      setInvitations(prev => prev.filter(i => i.id !== inviteId))
    } catch {
      setInvitations(prev => prev.filter(i => i.id !== inviteId))
    }
  }

  function handleCopyLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const otherMembers = members.filter(m => m.id !== currentUserId)
  const currentMember = members.find(m => m.id === currentUserId)

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Team Settings</h1>
        <p className="text-[#b0b0d0] text-sm">{orgName} — manage members and invitations</p>
      </div>

      {/* Members table */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider mb-4">Members</h2>
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
          {members.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={32} className="text-[#444466] mx-auto mb-3" />
              <p className="text-[#b0b0d0] text-sm">No other team members yet. Invite your colleagues.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#222240]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Member</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Joined</th>
                  {isAdmin && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222240]">
                {/* Current user row first */}
                {currentMember && (
                  <MemberRow
                    key={currentMember.id}
                    member={currentMember}
                    isCurrentUser={true}
                    isAdmin={isAdmin}
                    currentUserEmail={currentUserEmail}
                    updatingRole={updatingRole}
                    onRoleChange={handleRoleChange}
                    onRemoveClick={() => {}}
                  />
                )}
                {otherMembers.map(member => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isCurrentUser={false}
                    isAdmin={isAdmin}
                    currentUserEmail={currentUserEmail}
                    updatingRole={updatingRole}
                    onRoleChange={handleRoleChange}
                    onRemoveClick={() => setConfirmRemove({ id: member.id, email: member.full_name ?? member.id })}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Invite form — only for admins */}
      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider mb-4">Invite a colleague</h2>
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="flex-1 min-w-[220px] bg-[#030305] border border-[#222240] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#444466] focus:outline-none focus:border-[#7c6df5] transition-colors"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="bg-[#030305] border border-[#222240] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#7c6df5] transition-colors"
              >
                <option value="viewer">Viewer</option>
                <option value="analyst">Analyst</option>
                <option value="enterprise_admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#6c5ce7] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus size={15} />
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>

            {inviteError && (
              <p className="mt-3 text-sm text-[#ff4d6d]">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="mt-3 text-sm text-[#00d4d4]">{inviteSuccess}</p>
            )}
          </div>
        </section>
      )}

      {/* Pending invitations */}
      {isAdmin && invitations.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#b0b0d0] uppercase tracking-wider mb-4">Pending Invitations</h2>
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#222240]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222240]">
                {invitations.map(inv => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-sm text-white">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[inv.role] ?? ROLE_COLORS.viewer}`}>
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs text-[#b0b0d0]">
                        <Clock size={12} />
                        {daysUntil(inv.expires_at)}d left
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleCopyLink(inv.token)}
                          title="Copy invite link"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#b0b0d0] hover:text-white hover:bg-white/5 transition-colors border border-[#222240]"
                        >
                          {copiedToken === inv.token ? (
                            <><Check size={12} className="text-[#00d4d4]" /> Copied</>
                          ) : (
                            <><Copy size={12} /> Copy link</>
                          )}
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-3 py-1.5 rounded-lg text-xs text-[#ff4d6d] hover:bg-[#ff4d6d]/10 transition-colors border border-[#ff4d6d]/20"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Remove member?</h3>
            <p className="text-[#b0b0d0] text-sm mb-6">
              Remove <span className="text-white font-medium">{confirmRemove.email}</span> from the team? They will lose access immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemove.id)}
                disabled={removingId === confirmRemove.id}
                className="flex-1 py-2 rounded-xl bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 text-[#ff4d6d] hover:bg-[#ff4d6d]/20 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {removingId === confirmRemove.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Extracted row component
function MemberRow({
  member,
  isCurrentUser,
  isAdmin,
  currentUserEmail,
  updatingRole,
  onRoleChange,
  onRemoveClick,
}: {
  member: Member
  isCurrentUser: boolean
  isAdmin: boolean
  currentUserEmail: string
  updatingRole: string | null
  onRoleChange: (id: string, role: string) => void
  onRemoveClick: () => void
}) {
  const displayName = member.full_name ?? (isCurrentUser ? currentUserEmail : member.id.slice(0, 8))
  const avatarText = initials(member.full_name, isCurrentUser ? currentUserEmail : member.id)
  const joinedDate = new Date(member.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c6df5] to-[#00d4d4] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {avatarText}
          </div>
          <div>
            <div className="text-sm font-medium text-white flex items-center gap-2">
              {displayName}
              {isCurrentUser && <span className="text-xs text-[#b0b0d0] font-normal">(you)</span>}
            </div>
            {isCurrentUser && (
              <div className="text-xs text-[#b0b0d0]">{currentUserEmail}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {isAdmin && !isCurrentUser ? (
          <div className="relative">
            <select
              value={member.role === 'enterprise_member' ? 'viewer' : member.role}
              onChange={e => onRoleChange(member.id, e.target.value)}
              disabled={updatingRole === member.id}
              className="appearance-none bg-transparent border border-[#222240] rounded-lg pl-3 pr-8 py-1 text-xs text-white focus:outline-none focus:border-[#7c6df5] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="enterprise_admin">Admin</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b0b0d0] pointer-events-none" />
          </div>
        ) : (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[member.role] ?? ROLE_COLORS.viewer}`}>
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-[#b0b0d0]">{joinedDate}</td>
      {isAdmin && (
        <td className="px-6 py-4">
          {!isCurrentUser && (
            <button
              onClick={onRemoveClick}
              className="p-2 rounded-lg text-[#b0b0d0] hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/10 transition-colors"
              title="Remove member"
            >
              <Trash2 size={15} />
            </button>
          )}
        </td>
      )}
    </tr>
  )
}
