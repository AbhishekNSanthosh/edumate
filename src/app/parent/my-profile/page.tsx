"use client";

import React, { useState } from "react";

interface PersonalInfo {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Passwords {
  current: string;
  new: string;
  confirm: string;
}

export default function ProfileSettings() {
  // Initial state
  const initialPersonalInfo: PersonalInfo = {
    fullName: "Aisha Sharma",
    studentId: "SCU01023",
    email: "aisha.sharma@example.edu",
    phone: "+91 9876543210",
    address1: "Room 405, University Hostel A",
    address2: "123 University Road",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400001",
    country: "India",
  };

  // State for personal information
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(initialPersonalInfo);

  // State for password fields
  const [passwords, setPasswords] = useState<Passwords>({
    current: "",
    new: "",
    confirm: "",
  });

  // State for email notifications
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);

  // State for profile photo
  const [profilePhoto, setProfilePhoto] = useState<string>("https://via.placeholder.com/80");

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handlers for personal info changes
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
    // Clear error if fixed
    if (errors[name as keyof PersonalInfo]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handlers for password changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    // Clear error if fixed
    if (errors[name as keyof Passwords]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handler for email notifications toggle
  const handleToggle = () => {
    setEmailNotifications((prev) => !prev);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setProfilePhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler for remove photo
  const handleRemovePhoto = () => {
    setProfilePhoto("https://via.placeholder.com/80?text=No+Photo");
  };

  // Enhanced password validation
  const validatePasswords = (): string[] => {
    const errors: string[] = [];
    if (passwords.new && passwords.new.length < 8) {
      errors.push("New password must be at least 8 characters.");
    }
    if (passwords.new !== passwords.confirm) {
      errors.push("Passwords must match.");
    }
    return errors;
  };

  // Form validation
  const validateForm = (): boolean => {
    const passwordErrors = validatePasswords();
    if (passwordErrors.length > 0) {
      setErrors({ ...errors, ...{ new: passwordErrors[0], confirm: passwordErrors[0] } });
      return false;
    }
    return true;
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Simulate save (in real app, send to API)
    console.log("Saving changes:", {
      personalInfo,
      passwords,
      emailNotifications,
      profilePhoto,
    });
    alert("Changes saved successfully!");
  };

  // Cancel handler
  const handleCancel = () => {
    setPersonalInfo(initialPersonalInfo);
    setPasswords({ current: "", new: "", confirm: "" });
    setEmailNotifications(true);
    setProfilePhoto("https://via.placeholder.com/80");
    setErrors({});
  };

  const hasPasswordChanges = passwords.current.length > 0 || passwords.new.length > 0 || passwords.confirm.length > 0;
  const isPasswordValid = !hasPasswordChanges || (passwords.new.length >= 8 && passwords.new === passwords.confirm);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col mt-[80px]">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Page Header */}
          <div className="mx-auto">
            <h1 className="text-2xl font-bold mb-2">Profile Settings</h1>
            <p className="text-gray-500 mb-6">Manage your personal information and account preferences.</p>

            {/* Profile Photo */}
            <section className="bg-white border rounded-lg p-6 mb-6 shadow-sm" aria-labelledby="photo-heading">
              <h2 id="photo-heading" className="font-semibold mb-2 sr-only">Your Profile Photo</h2>
              <p className="text-sm text-gray-500 mb-4">Update your profile picture. Max file size 5MB.</p>
              <div className="flex items-center space-x-4">
                <img
                 src={"/assets/profile.png"}
                  alt="Current profile photo"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
                <div className="space-x-2 flex flex-col sm:flex-row">
                  <label
                    htmlFor="photo-upload"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm cursor-pointer inline-block hover:bg-blue-700 transition-colors"
                  >
                    Upload New Photo
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    aria-describedby="photo-help"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors"
                    aria-label="Remove current profile photo"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
              <p id="photo-help" className="text-xs text-gray-500 mt-2">Recommended size: 80x80 pixels.</p>
            </section>

            {/* Personal Information */}
            <section className="bg-white border rounded-lg p-6 mb-6 shadow-sm" aria-labelledby="personal-heading">
              <h2 id="personal-heading" className="font-semibold mb-2">Personal Information</h2>
              <p className="text-sm text-gray-500 mb-4">Manage your basic personal details.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(personalInfo).map(([key, value]) => {
                  const labelText = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                  const required = !['address2'].includes(key);
                  const id = `personal-${key}`;
                  return (
                    <div key={key}>
                      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                        {labelText}
                      </label>
                      <input
                        id={id}
                        type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                        name={key}
                        value={value}
                        onChange={handlePersonalChange}
                        className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors[key as keyof PersonalInfo] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required={required}
                        aria-invalid={!!errors[key as keyof PersonalInfo]}
                        aria-describedby={errors[key as keyof PersonalInfo] ? `${id}-error` : undefined}
                      />
                      {errors[key as keyof PersonalInfo] && (
                        <p id={`${id}-error`} className="text-sm text-red-600 mt-1">{errors[key as keyof PersonalInfo]}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Account Security */}
            <section className="bg-white border rounded-lg p-6 mb-6 shadow-sm" aria-labelledby="security-heading">
              <h2 id="security-heading" className="font-semibold mb-2">Account Security</h2>
              <p className="text-sm text-gray-500 mb-4">Update your password to keep your account secure.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    name="current"
                    value={passwords.current}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={hasPasswordChanges}
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    name="new"
                    value={passwords.new}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 8 characters)"
                    className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.new ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required={hasPasswordChanges}
                    aria-invalid={!!errors.new}
                    aria-describedby={errors.new ? 'new-password-error' : undefined}
                  />
                  {errors.new && <p id="new-password-error" className="text-sm text-red-600 mt-1">{errors.new}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    name="confirm"
                    value={passwords.confirm}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirm ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required={hasPasswordChanges}
                    aria-invalid={!!errors.confirm}
                    aria-describedby={errors.confirm ? 'confirm-password-error' : undefined}
                  />
                  {errors.confirm && <p id="confirm-password-error" className="text-sm text-red-600 mt-1">{errors.confirm}</p>}
                </div>
              </div>
            </section>

            {/* Privacy Settings */}
            <section className="bg-white border rounded-lg p-6 mb-6 shadow-sm" aria-labelledby="privacy-heading">
              <h2 id="privacy-heading" className="font-semibold mb-2">Privacy Settings</h2>
              <p className="text-sm text-gray-500 mb-4">Control how we communicate with you.</p>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-medium block" id="notification-label">Email Notifications</span>
                  <p className="text-sm text-gray-500" aria-describedby="notification-label">
                    Receive updates, announcements, and reminders via email.
                  </p>
                </div>
                <label
                  htmlFor="email-notifications"
                  className="relative inline-flex items-center cursor-pointer"
                >
                  <input
                    id="email-notifications"
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={handleToggle}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            </section>
          </div>
        </div>

        {/* Sticky footer */}
        <footer className="border-t bg-white p-4 sticky bottom-0 z-10">
          <div className="max-w-4xl mx-auto flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isPasswordValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}