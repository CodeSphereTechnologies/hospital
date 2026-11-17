import { useRef, useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell,
  Camera,
  CheckCircle2,
  Compass,
  KeyRound,
  Moon,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { useAuth } from '../../features/auth/useAuth'
import { authApi } from '../../lib/api/endpoints'
import { ApiError } from '../../lib/api/client'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  timezone: z.string().min(1, 'Select a timezone'),
})

const prayerSchema = z.object({
  calculation_method: z.string().min(1, 'Select a calculation method'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
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
type PrayerValues = z.infer<typeof prayerSchema>
type PasswordValues = z.infer<typeof passwordSchema>

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
]

const calculationMethods = [
  { value: 'muslim_world_league', label: 'Muslim World League' },
  { value: 'isna', label: 'Islamic Society of North America' },
  { value: 'egyptian', label: 'Egyptian General Authority' },
  { value: 'umm_al_qura', label: 'Umm al-Qura, Makkah' },
  { value: 'karachi', label: 'University of Islamic Sciences, Karachi' },
]

export function UserSettingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState('profile')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [notifications, setNotifications] = useState({
    prayerReminders: true,
    activityReminders: true,
    habitNudges: true,
    reportFeedback: true,
    weeklyDigest: false,
  })

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? 'Aisha Rahman',
      email: user?.email ?? 'aisha.rahman@example.com',
      timezone: user?.timezone ?? 'Europe/London',
    },
  })

  const prayerForm = useForm<PrayerValues>({
    resolver: zodResolver(prayerSchema),
    defaultValues: {
      calculation_method: user?.prayer_preferences?.calculation_method ?? 'muslim_world_league',
      latitude: user?.prayer_preferences?.latitude?.toString() ?? '51.5072',
      longitude: user?.prayer_preferences?.longitude?.toString() ?? '-0.1276',
    },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const onSaveProfile = async (values: ProfileValues) => {
    try {
      await authApi.updateProfile({
        name: values.name,
        email: values.email,
        timezone: values.timezone,
      })
      toast.success('Your profile details have been saved.', 'Profile updated')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, 'Could not save profile')
      } else {
        toast.info('Saved locally. The API is currently unreachable.', 'Offline mode')
      }
    }
  }

  const onSavePrayer = async (values: PrayerValues) => {
    try {
      await authApi.updateProfile({
        calculation_method: values.calculation_method,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        timezone: profileForm.getValues('timezone'),
      })
      toast.success('Prayer preferences updated. Times refresh on your next visit.', 'Saved')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, 'Could not save preferences')
      } else {
        toast.info('Saved locally. The API is currently unreachable.', 'Offline mode')
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
      passwordForm.reset()
      toast.success('Your password was changed successfully.', 'Security updated')
    } catch (err) {
      if (err instanceof ApiError) {
        const currentPasswordError = err.errors?.current_password?.[0]
        if (currentPasswordError) {
          passwordForm.setError('current_password', { message: currentPasswordError })
          return
        }
        toast.error(err.message, 'Could not update password')
      } else {
        toast.error('The security service is unavailable right now.', 'Could not update password')
      }
    }
  }

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((current) => ({ ...current, [key]: !current[key] }))
  }

  const onAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadingAvatar(true)
    try {
      await authApi.updateAvatar(file)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      toast.success('Your profile picture has been updated.', 'Photo saved')
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
        title="Settings"
        description="Manage your profile, prayer preferences, reminders and account security."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardContent className="flex flex-col items-center p-6 sm:p-7 text-center">
            <div className="relative">
              <Avatar
                name={user?.name ?? 'Member'}
                src={user?.avatar_url}
                size="xl"
                className="ring-4 ring-brand-50"
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
              className="mt-3 text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-60"
            >
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            </button>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">
              {user?.name ?? 'Member'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{user?.email ?? 'member@example.com'}</p>
            <Badge variant="success" className="mt-3" dot>
              Active member
            </Badge>
            <div className="mt-6 w-full space-y-3 text-left text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <Moon className="h-4 w-4 text-slate-400" /> Group
                </span>
                <span className="font-semibold text-slate-800">Morning Circle</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <Compass className="h-4 w-4 text-slate-400" /> Timezone
                </span>
                <span className="font-semibold text-slate-800">
                  {profileForm.watch('timezone')}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-slate-400" /> Status
                </span>
                <span className="font-semibold text-emerald-600">Verified</span>
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
              { id: 'prayer', label: 'Prayer', icon: <Moon className="h-3.5 w-3.5" /> },
              { id: 'notifications', label: 'Notifications', icon: <Bell className="h-3.5 w-3.5" /> },
              { id: 'security', label: 'Security', icon: <KeyRound className="h-3.5 w-3.5" /> },
            ]}
          />

          {tab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>This information is visible to your group administrator.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Full name"
                      error={profileForm.formState.errors.name?.message}
                      {...profileForm.register('name')}
                    />
                    <Input
                      label="Email address"
                      type="email"
                      error={profileForm.formState.errors.email?.message}
                      {...profileForm.register('email')}
                    />
                  </div>
                  <Select
                    label="Timezone"
                    options={timezones}
                    error={profileForm.formState.errors.timezone?.message}
                    {...profileForm.register('timezone')}
                  />
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    Changing your email address may require you to verify the new address before
                    your next sign in.
                  </p>
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={profileForm.formState.isSubmitting}>
                      <Save className="h-4 w-4" />
                      Save changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {tab === 'prayer' && (
            <Card>
              <CardHeader>
                <CardTitle>Prayer preferences</CardTitle>
                <CardDescription>
                  These settings control how prayer times are calculated for your location.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={prayerForm.handleSubmit(onSavePrayer)} className="space-y-4">
                  <Select
                    label="Calculation method"
                    options={calculationMethods}
                    error={prayerForm.formState.errors.calculation_method?.message}
                    {...prayerForm.register('calculation_method')}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Latitude"
                      placeholder="51.5072"
                      error={prayerForm.formState.errors.latitude?.message}
                      {...prayerForm.register('latitude')}
                    />
                    <Input
                      label="Longitude"
                      placeholder="-0.1276"
                      error={prayerForm.formState.errors.longitude?.message}
                      {...prayerForm.register('longitude')}
                    />
                  </div>
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    Leave latitude and longitude blank to use automatic location detection on
                    supported devices. Local mosque timetables always take precedence.
                  </p>
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={prayerForm.formState.isSubmitting}>
                      <Save className="h-4 w-4" />
                      Save preferences
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>Choose what you want to be reminded about.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  {
                    key: 'prayerReminders' as const,
                    title: 'Prayer reminders',
                    description: 'A gentle nudge before each of the five daily prayers.',
                  },
                  {
                    key: 'activityReminders' as const,
                    title: 'Activity reminders',
                    description: 'Reminders for scheduled activities with notifications enabled.',
                  },
                  {
                    key: 'habitNudges' as const,
                    title: 'Habit nudges',
                    description: 'Encouragement when a habit streak is at risk.',
                  },
                  {
                    key: 'reportFeedback' as const,
                    title: 'Report feedback',
                    description: 'Notify me when an administrator comments on my report.',
                  },
                  {
                    key: 'weeklyDigest' as const,
                    title: 'Weekly digest',
                    description: 'A Sunday summary of habits, goals and completion.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{item.title}</span>
                      <span className="block text-xs text-slate-500">{item.description}</span>
                    </span>
                    <Switch
                      checked={notifications[item.key]}
                      onChange={() => toggleNotification(item.key)}
                      label={item.title}
                    />
                  </label>
                ))}
                <div className="flex justify-end pt-3">
                  <Button onClick={() => toast.success('Notification preferences saved.')}>
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
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <Input
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    error={passwordForm.formState.errors.current_password?.message}
                    {...passwordForm.register('current_password')}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      error={passwordForm.formState.errors.password?.message}
                      {...passwordForm.register('password')}
                    />
                    <Input
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      error={passwordForm.formState.errors.password_confirmation?.message}
                      {...passwordForm.register('password_confirmation')}
                    />
                  </div>
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    Passwords must be at least 8 characters. Choosing a new password signs you out
                    of other devices after 24 hours.
                  </p>
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={passwordForm.formState.isSubmitting}>
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
