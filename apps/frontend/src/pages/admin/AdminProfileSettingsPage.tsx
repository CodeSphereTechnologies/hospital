import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  Save,
  ShieldCheck,
  User as UserIcon,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { useAuth } from '../../features/auth/useAuth'
import { authApi } from '../../lib/api/endpoints'
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  timezone: z.string().min(1, 'Select a timezone'),
  bio: z.string().max(280, 'Keep the bio under 280 characters').optional(),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
]

export function AdminProfileSettingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState('profile')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [preferences, setPreferences] = useState({
    reportEmails: true,
    weeklyDigest: true,
    pendingAccounts: true,
    darkMode: false,
    compactTables: false,
  })

  const groupsSummaryQuery = useQuery({
    queryKey: ['admin', 'groups', 'settings-summary'],
    queryFn: () => adminApi.groups.list({ per_page: 1 }),
    staleTime: 60_000,
  })

  const reportsSummaryQuery = useQuery({
    queryKey: ['admin', 'reports', 'settings-summary'],
    queryFn: () => adminApi.reports.list({ per_page: 1 }),
    staleTime: 60_000,
  })

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : '—'
  const groupsManaged = groupsSummaryQuery.data?.stats.total
  const reportsReviewed = reportsSummaryQuery.data?.stats.reviewed

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: savingProfile },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      timezone: user?.prayer_preferences?.timezone ?? 'Europe/London',
      bio: user?.bio ?? '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    setError: setPasswordError,
    formState: { errors: passwordErrors, isSubmitting: savingPassword },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const onSaveProfile = async (values: ProfileValues) => {
    try {
      await authApi.updateProfile({
        name: values.name,
        email: values.email,
        bio: values.bio?.trim() ? values.bio.trim() : null,
        timezone: values.timezone,
      })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Your profile details have been saved.', 'Profile updated')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, 'Could not save profile')
      } else {
        toast.error('The profile service is unavailable right now.', 'Could not save profile')
      }
    }
  }

  const onChangePassword = async (values: PasswordValues) => {
    try {
      await authApi.changePassword({
        current_password: values.current_password,
        password: values.password,
        password_confirmation: values.password_confirmation,
      })
      resetPasswordForm()
      toast.success('Your password was changed successfully.', 'Security updated')
    } catch (err) {
      if (err instanceof ApiError) {
        const currentPasswordError = err.errors?.current_password?.[0]
        if (currentPasswordError) {
          setPasswordError('current_password', { message: currentPasswordError })
          return
        }
        toast.error(err.message, 'Could not update password')
      } else {
        toast.error('The security service is unavailable right now.', 'Could not update password')
      }
    }
  }

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  const onAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadingAvatar(true)
    try {
      await authApi.updateAvatar(file)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Your profile picture has been updated.', 'Photo updated')
    } catch (err) {
      if (err instanceof ApiError) {
        const avatarError = err.errors?.avatar?.[0]
        toast.error(avatarError ?? err.message, 'Could not update photo')
      } else {
        toast.error('The upload service is unavailable right now.', 'Could not update photo')
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile & settings"
        description="Manage your administrator profile, notifications and account security."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardContent className="flex flex-col items-center p-6 sm:p-7 text-center">
            <div className="relative">
              <Avatar
                name={user?.name ?? 'Administrator'}
                src={user?.avatar_url}
                size="xl"
                className="ring-4 ring-brand-100/60 shadow-soft"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onAvatarSelected}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="mt-3.5 text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-60"
            >
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            </button>
            <h2 className="mt-3 text-lg font-bold text-slate-900">
              {user?.name ?? 'Administrator'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{user?.email ?? 'admin@thinkcode.dev'}</p>
            <Badge variant="default" className="mt-3 px-3 py-1">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Administrator
            </Badge>
            <div className="mt-6 w-full space-y-3 text-left text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  Member since
                </span>
                <span className="font-semibold text-slate-800">{memberSince}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <UsersRound className="h-4 w-4 text-slate-400" />
                  Groups managed
                </span>
                <span className="font-semibold text-slate-800">
                  {groupsSummaryQuery.isLoading ? '…' : (groupsManaged ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <ClipboardList className="h-4 w-4 text-slate-400" />
                  Reports reviewed
                </span>
                <span className="font-semibold text-slate-800">
                  {reportsSummaryQuery.isLoading ? '…' : (reportsReviewed ?? 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5 xl:col-span-2">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'profile', label: 'Profile', icon: <UserIcon className="h-3.5 w-3.5" /> },
              { id: 'preferences', label: 'Preferences', icon: <Bell className="h-3.5 w-3.5" /> },
              { id: 'security', label: 'Security', icon: <KeyRound className="h-3.5 w-3.5" /> },
            ]}
          />

          {tab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>This information is visible to your team.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input label="Full name" error={profileErrors.name?.message} {...registerProfile('name')} />
                    <Input
                      label="Email address"
                      type="email"
                      error={profileErrors.email?.message}
                      {...registerProfile('email')}
                    />
                  </div>
                  <Select label="Timezone" options={timezones} error={profileErrors.timezone?.message} {...registerProfile('timezone')} />
                  <Textarea
                    label="Bio"
                    placeholder="A short description about your role"
                    error={profileErrors.bio?.message}
                    {...registerProfile('bio')}
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" isLoading={savingProfile}>
                      <Save className="h-4 w-4" />
                      Save changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {tab === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>Choose what you want to be notified about.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  {
                    key: 'reportEmails' as const,
                    title: 'Daily report emails',
                    description: 'Receive a digest when new reports are submitted.',
                  },
                  {
                    key: 'weeklyDigest' as const,
                    title: 'Weekly progress digest',
                    description: 'A weekly summary of group completion and top members.',
                  },
                  {
                    key: 'pendingAccounts' as const,
                    title: 'Pending account alerts',
                    description: 'Get notified when a member is awaiting approval.',
                  },
                  {
                    key: 'darkMode' as const,
                    title: 'Dark mode',
                    description: 'Use a darker interface for low-light environments.',
                  },
                  {
                    key: 'compactTables' as const,
                    title: 'Compact tables',
                    description: 'Show more rows per screen in management tables.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-transparent p-3.5 transition-colors hover:border-slate-200/60 hover:bg-slate-50/80"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{item.title}</span>
                      <span className="block text-xs text-slate-500">{item.description}</span>
                    </span>
                    <Switch
                      checked={preferences[item.key]}
                      onChange={() => togglePreference(item.key)}
                      label={item.title}
                    />
                  </label>
                ))}
                <div className="flex justify-end pt-3">
                  <Button onClick={() => toast.success('Preferences saved.')}>
                    <CheckCircle2 className="h-4 w-4" />
                    Save preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Use a strong password you don&apos;t use elsewhere.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-5">
                  <Input
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    error={passwordErrors.current_password?.message}
                    {...registerPassword('current_password')}
                  />
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      error={passwordErrors.password?.message}
                      {...registerPassword('password')}
                    />
                    <Input
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      error={passwordErrors.password_confirmation?.message}
                      {...registerPassword('password_confirmation')}
                    />
                  </div>
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-500">
                    Password changes sign you out of other devices after 24 hours.
                  </p>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" isLoading={savingPassword}>
                      <KeyRound className="h-4 w-4" />
                      Update password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
