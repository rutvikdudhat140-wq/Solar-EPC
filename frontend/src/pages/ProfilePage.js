import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { toast } from '../components/ui/Toast';
import {
  User,
  Mail,
  Phone,
  Camera,
  Trash2,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileImage: '',
    role: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authApi.getProfile();
      const data = response.data || response;
      setProfile({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        profileImage: data.profileImage || '',
        role: data.role || '',
      });
      // Update localStorage with latest profile data including image
      if (user && setUser && data.profileImage !== undefined) {
        const updatedUser = { ...user, profileImage: data.profileImage || '' };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const updateData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
      };

      // Only include password fields if new password is provided
      if (passwordData.newPassword) {
        if (!passwordData.currentPassword) {
          toast.error('Current password is required to change password');
          setSaving(false);
          return;
        }
        updateData.currentPassword = passwordData.currentPassword;
        updateData.newPassword = passwordData.newPassword;
      }

      const response = await authApi.updateProfile(updateData);
      const data = response.data || response;

      toast.success('Profile updated successfully');

      // Update local user data if email changed
      if (data.email && user) {
        const updatedUser = { ...user, email: data.email };
        setUser(updatedUser);
        // Note: In a real app, you might want to update the auth context here
      }

      // Clear password fields after successful update
      setPasswordData({ currentPassword: '', newPassword: '' });

      // Refresh profile data
      fetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      const message = error?.message || error?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploadingImage(true);
      const response = await authApi.uploadProfileImage(file);
      const data = response.data || response;

      setProfile((prev) => ({ ...prev, profileImage: data.imageUrl }));
      toast.success('Profile image uploaded successfully');
      // Update auth context and localStorage with new image
      if (user && setUser) {
        const updatedUser = { ...user, profileImage: data.imageUrl };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      const message = error?.message || error?.data?.message || 'Failed to upload image';
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('Are you sure you want to remove your profile image?')) return;

    try {
      setUploadingImage(true);
      await authApi.deleteProfileImage();
      setProfile((prev) => ({ ...prev, profileImage: '' }));
      toast.success('Profile image removed successfully');
      // Update auth context
      if (user && setUser) {
        const updatedUser = { ...user, profileImage: '' };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      const message = error?.message || error?.data?.message || 'Failed to remove image';
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const getInitials = () => {
    const first = profile.firstName?.[0] || '';
    const last = profile.lastName?.[0] || '';
    return (first + last).toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U';
  };

  const handleImageError = (e) => {
    console.error('Profile image failed to load:', profile.profileImage);
    // If image fails to load, clear it so initials show
    setProfile((prev) => ({ ...prev, profileImage: '' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Profile</h1>
        <p className="text-sm text-[var(--text-muted)]">Manage your personal information and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Image Card */}
        <div className="glass-card p-6">
          <div className="text-center">
            <div className="relative inline-block">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt="Profile"
                  onError={handleImageError}
                  className="w-32 h-32 rounded-full object-cover border-4 border-[var(--bg-elevated)] bg-[var(--bg-elevated)]"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-bold border-4 border-[var(--bg-elevated)]">
                  {getInitials()}
                </div>
              )}

              {uploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}

              {/* Upload button overlay */}
              <button
                onClick={handleImageClick}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 p-2 bg-[var(--primary)] text-white rounded-full hover:opacity-90 transition-opacity shadow-lg"
                title="Change photo"
              >
                <Camera size={16} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />

            <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
              {profile.firstName || profile.lastName
                ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                : profile.email}
            </h3>
            <p className="text-sm text-[var(--text-muted)] capitalize">{profile.role}</p>

            {profile.profileImage && (
              <button
                onClick={handleDeleteImage}
                disabled={uploadingImage}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                Remove Photo
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border-base)]">
            <div className="text-sm text-[var(--text-muted)]">
              <p>Member since</p>
              <p className="font-medium text-[var(--text-primary)]">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <User size={20} className="text-[var(--primary)]" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    placeholder="Enter email"
                    required
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Lock size={20} className="text-[var(--primary)]" />
              Change Password
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Leave password fields empty if you don't want to change your password.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
